import { describe, expect, it } from 'vitest';
import { INTENT_TTL_MS, nextTrail, parseTrail, shouldRecordIntent, shownSteps, TRAIL_MAX } from '../src/lib/trail.ts';
import type { TrailIntent, TrailItem, TrailState } from '../src/lib/trail.ts';

const item = (id: string, lang = 'en'): TrailItem => ({ id, lang, url: `/${lang}/${id}/`, title: id.toUpperCase() });
/** A trail standing on its last step, unless `pos` says otherwise. */
const state = (ids: string[], lang = 'en', capped = false, pos = ids.length - 1): TrailState => ({
  items: ids.map((id) => item(id, lang)),
  pos,
  capped,
});
const ids = (s: TrailState) => s.items.map((i) => i.id);
const shown = (s: TrailState) => shownSteps(s).map((i) => i.id);
const NOW = 1_000_000;

/**
 * One reader in one tab, loading pages the way src/scripts/trail.ts sees them:
 * `follow` clicks a term link on the current page, `open` arrives any other way
 * (Back, Forward, a trail link, a reload or a typed address).
 */
function reader() {
  let trail: TrailState | null = null;
  let intent: TrailIntent | null = null;
  let here = '';
  const session = {
    open(id: string) {
      trail = nextTrail(trail, intent, item(id), NOW);
      intent = null;
      here = id;
      return session;
    },
    follow(id: string) {
      intent = { from: here, to: id, at: NOW - 500 };
      return session.open(id);
    },
    back: (id: string) => session.open(id),
    forward: (id: string) => session.open(id),
    get trail() {
      return trail!;
    },
  };
  return session;
}

describe('nextTrail', () => {
  it('starts a new trail when there is no previous state', () => {
    expect(nextTrail(null, null, item('a'), NOW)).toEqual({ items: [item('a')], pos: 0, capped: false });
  });

  it('appends when arriving through a fresh intent from the current step', () => {
    const next = nextTrail(state(['a', 'b']), { from: 'b', to: 'c', at: NOW - 1000 }, item('c'), NOW);
    expect(next).toEqual({ items: [item('a'), item('b'), item('c')], pos: 2, capped: false });
  });

  it('starts over when the intent is older than the TTL', () => {
    const next = nextTrail(state(['a', 'b']), { from: 'b', to: 'c', at: NOW - INTENT_TTL_MS - 1 }, item('c'), NOW);
    expect(ids(next)).toEqual(['c']);
  });

  it('starts over when the intent came from a page that is not the current step', () => {
    const next = nextTrail(state(['a', 'b']), { from: 'a', to: 'c', at: NOW }, item('c'), NOW);
    expect(ids(next)).toEqual(['c']);
  });

  it('starts over when the intent points to a different page', () => {
    const next = nextTrail(state(['a', 'b']), { from: 'b', to: 'x', at: NOW }, item('c'), NOW);
    expect(ids(next)).toEqual(['c']);
  });

  it('keeps the trail on reload of the current step', () => {
    expect(nextTrail(state(['a', 'b']), null, item('b'), NOW)).toEqual(state(['a', 'b']));
  });

  it('refreshes the item title and url when moving to a step', () => {
    const renamed = { ...item('b'), title: 'New title' };
    expect(nextTrail(state(['a', 'b', 'c']), null, renamed, NOW).items[1]).toEqual(renamed);
  });

  it('starts over when the language changes, even with a matching intent', () => {
    const next = nextTrail(state(['a', 'b'], 'sk'), { from: 'b', to: 'b', at: NOW }, item('b', 'en'), NOW);
    expect(next).toEqual({ items: [item('b', 'en')], pos: 0, capped: false });
  });

  it(`caps the trail at ${TRAIL_MAX} items by dropping the second one, keeping the origin`, () => {
    const full = state(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
    const next = nextTrail(full, { from: 'p7', to: 'p8', at: NOW }, item('p8'), NOW);
    expect(ids(next)).toEqual(['p0', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']);
    expect(next.pos).toBe(TRAIL_MAX - 1);
    expect(next.capped).toBe(true);
  });
});

describe('nextTrail with Back and Forward', () => {
  it('atom → electron → Back → Forward shows [atom, electron]', () => {
    const tab = reader().open('atom').follow('electron').back('atom');
    expect(shown(tab.trail)).toEqual(['atom']);
    expect(shown(tab.forward('electron').trail)).toEqual(['atom', 'electron']);
  });

  it('atom → electron → Back → link to voltage shows [atom, voltage] and forgets electron', () => {
    const tab = reader().open('atom').follow('electron').back('atom').follow('voltage');
    expect(shown(tab.trail)).toEqual(['atom', 'voltage']);
    expect(ids(tab.trail)).toEqual(['atom', 'voltage']);
  });

  it('keeps every later step as a forward stop over several Backs', () => {
    const tab = reader().open('a').follow('b').follow('c').back('b').back('a');
    expect(shown(tab.trail)).toEqual(['a']);
    expect(ids(tab.trail)).toEqual(['a', 'b', 'c']);
    expect(shown(tab.forward('b').trail)).toEqual(['a', 'b']);
    expect(shown(tab.forward('c').trail)).toEqual(['a', 'b', 'c']);
  });

  it('treats a trail link to an earlier step like Back', () => {
    const next = nextTrail(state(['a', 'b', 'c']), null, item('a'), NOW);
    expect(next).toEqual(state(['a', 'b', 'c'], 'en', false, 0));
  });

  it('treats a term link to an earlier step like Back, keeping the forward stops', () => {
    const tab = reader().open('a').follow('b').follow('c').follow('a');
    expect(shown(tab.trail)).toEqual(['a']);
    expect(ids(tab.trail)).toEqual(['a', 'b', 'c']);
  });

  it('treats a term link to the next forward stop like Forward', () => {
    const tab = reader().open('a').follow('b').follow('c').back('b').back('a').follow('b');
    expect(shown(tab.trail)).toEqual(['a', 'b']);
    expect(ids(tab.trail)).toEqual(['a', 'b', 'c']);
  });

  it('drops the skipped forward stops when a term link jumps to a later one', () => {
    const tab = reader().open('a').follow('b').follow('c').follow('d').back('c').back('b').follow('d');
    expect(shown(tab.trail)).toEqual(['a', 'b', 'd']);
    expect(ids(tab.trail)).toEqual(['a', 'b', 'd']);
  });

  it('starts over when arriving from outside the trail without a term link', () => {
    const tab = reader().open('a').follow('b').back('a').open('x');
    expect(ids(tab.trail)).toEqual(['x']);
  });

  it('keeps the capped flag for the forward stops when going back to the origin', () => {
    const capped = state(['p0', 'p2', 'p3'], 'en', true);
    expect(nextTrail(capped, null, item('p2'), NOW)).toEqual(state(['p0', 'p2', 'p3'], 'en', true, 1));
    const atOrigin = nextTrail(capped, null, item('p0'), NOW);
    expect(atOrigin).toEqual(state(['p0', 'p2', 'p3'], 'en', true, 0));
    expect(nextTrail(atOrigin, null, item('p3'), NOW)).toEqual(capped);
  });

  it('clears the capped flag when a link from the origin drops the forward stops', () => {
    const atOrigin = state(['p0', 'p2', 'p3'], 'en', true, 0);
    const next = nextTrail(atOrigin, { from: 'p0', to: 'x', at: NOW }, item('x'), NOW);
    expect(next).toEqual(state(['p0', 'x']));
  });

  it(`still caps at ${TRAIL_MAX} after a link from an earlier step`, () => {
    const full = state(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'], 'en', false, 6);
    const next = nextTrail(full, { from: 'p6', to: 'x', at: NOW }, item('x'), NOW);
    expect(ids(next)).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'x']);
    expect(next.capped).toBe(false);
  });
});

describe('shownSteps', () => {
  it('shows the steps up to and including the current one', () => {
    expect(shown(state(['a', 'b', 'c'], 'en', false, 1))).toEqual(['a', 'b']);
    expect(shown(state(['a', 'b', 'c']))).toEqual(['a', 'b', 'c']);
  });
});

describe('parseTrail', () => {
  it('reads a stored trail', () => {
    const stored = state(['a', 'b', 'c'], 'en', true, 1);
    expect(parseTrail(JSON.stringify(stored))).toEqual(stored);
  });

  it('loads a trail stored before positions existed as standing on its last step', () => {
    const old = { items: [item('a'), item('b')], capped: false };
    expect(parseTrail(JSON.stringify(old))).toEqual(state(['a', 'b']));
  });

  it('reads nothing as no trail', () => {
    expect(parseTrail(null)).toBeNull();
  });
});

describe('shouldRecordIntent', () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

  it('records plain left clicks', () => {
    expect(shouldRecordIntent(click)).toBe(true);
  });

  it('ignores clicks that open new tabs or windows', () => {
    expect(shouldRecordIntent({ ...click, button: 1 })).toBe(false);
    expect(shouldRecordIntent({ ...click, ctrlKey: true })).toBe(false);
    expect(shouldRecordIntent({ ...click, metaKey: true })).toBe(false);
    expect(shouldRecordIntent({ ...click, shiftKey: true })).toBe(false);
    expect(shouldRecordIntent({ ...click, altKey: true })).toBe(false);
  });
});
