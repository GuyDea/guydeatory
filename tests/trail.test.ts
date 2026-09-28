import { describe, expect, it } from 'vitest';
import { INTENT_TTL_MS, nextTrail, shouldRecordIntent, TRAIL_MAX } from '../src/lib/trail.ts';
import type { TrailItem, TrailState } from '../src/lib/trail.ts';

const item = (id: string, lang = 'en'): TrailItem => ({ id, lang, url: `/${lang}/${id}/`, title: id.toUpperCase() });
const state = (ids: string[], lang = 'en', capped = false): TrailState => ({ items: ids.map((id) => item(id, lang)), capped });
const ids = (s: TrailState) => s.items.map((i) => i.id);
const NOW = 1_000_000;

describe('nextTrail', () => {
  it('starts a new trail when there is no previous state', () => {
    expect(nextTrail(null, null, item('a'), NOW)).toEqual({ items: [item('a')], capped: false });
  });

  it('appends when arriving through a fresh intent from the last page', () => {
    const next = nextTrail(state(['a', 'b']), { from: 'b', to: 'c', at: NOW - 1000 }, item('c'), NOW);
    expect(ids(next)).toEqual(['a', 'b', 'c']);
  });

  it('starts over when the intent is older than the TTL', () => {
    const next = nextTrail(state(['a', 'b']), { from: 'b', to: 'c', at: NOW - INTENT_TTL_MS - 1 }, item('c'), NOW);
    expect(ids(next)).toEqual(['c']);
  });

  it('starts over when the intent came from a page that is not the last one', () => {
    const next = nextTrail(state(['a', 'b']), { from: 'a', to: 'c', at: NOW }, item('c'), NOW);
    expect(ids(next)).toEqual(['c']);
  });

  it('starts over when the intent points to a different page', () => {
    const next = nextTrail(state(['a', 'b']), { from: 'b', to: 'x', at: NOW }, item('c'), NOW);
    expect(ids(next)).toEqual(['c']);
  });

  it('truncates back to an earlier page (back button or breadcrumb click)', () => {
    expect(ids(nextTrail(state(['a', 'b', 'c']), null, item('b'), NOW))).toEqual(['a', 'b']);
  });

  it('keeps the trail on reload of the last page', () => {
    expect(ids(nextTrail(state(['a', 'b']), null, item('b'), NOW))).toEqual(['a', 'b']);
  });

  it('refreshes the current item title and url when truncating', () => {
    const renamed = { ...item('b'), title: 'New title' };
    expect(nextTrail(state(['a', 'b', 'c']), null, renamed, NOW).items[1]).toEqual(renamed);
  });

  it('starts over when the language changes, even with a matching intent', () => {
    const next = nextTrail(state(['a', 'b'], 'sk'), { from: 'b', to: 'b', at: NOW }, item('b', 'en'), NOW);
    expect(next).toEqual({ items: [item('b', 'en')], capped: false });
  });

  it(`caps the trail at ${TRAIL_MAX} items by dropping the second one, keeping the origin`, () => {
    const full = state(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
    const next = nextTrail(full, { from: 'p7', to: 'p8', at: NOW }, item('p8'), NOW);
    expect(ids(next)).toEqual(['p0', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']);
    expect(next.capped).toBe(true);
  });

  it('stays capped when truncating to a later page, and clears it back at the origin', () => {
    const capped = state(['p0', 'p2', 'p3'], 'en', true);
    expect(nextTrail(capped, null, item('p2'), NOW).capped).toBe(true);
    expect(nextTrail(capped, null, item('p0'), NOW).capped).toBe(false);
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
