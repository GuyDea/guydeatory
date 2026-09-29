/**
 * Browser glue for the reading trail (logic: src/lib/trail.ts).
 * - On load and on back/forward-cache restore: compute the trail for this page and render it.
 * - On a plain click of a [data-trail-link]: remember that the reader followed a term from here.
 */
import { nextTrail, parseIntent, parseTrail, shouldRecordIntent, shownSteps } from '../lib/trail.ts';
import type { TrailIntent, TrailItem, TrailState } from '../lib/trail.ts';

const TRAIL_KEY = 'gd:trail';
const INTENT_KEY = 'gd:intent';

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: the trail simply stays hidden */
  }
}

function host(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-trail-current]');
}

function currentItem(el: HTMLElement): TrailItem {
  return { id: el.dataset.id!, lang: document.documentElement.lang, url: location.pathname, title: el.dataset.title! };
}

function render(el: HTMLElement, state: TrailState) {
  const list = el.querySelector('ol')!;
  const steps = shownSteps(state);
  if (steps.length < 2) {
    el.hidden = true;
    list.replaceChildren();
    return;
  }
  const stops = steps.map((item, index) => {
    const li = document.createElement('li');
    if (index === steps.length - 1) {
      const here = document.createElement('span');
      here.setAttribute('aria-current', 'location');
      here.textContent = item.title;
      li.append(here);
    } else {
      const link = document.createElement('a');
      link.href = item.url;
      link.textContent = item.title;
      li.append(link);
    }
    return li;
  });
  if (state.capped) {
    const gap = document.createElement('li');
    gap.className = 'trail-gap';
    gap.textContent = '…';
    gap.setAttribute('aria-label', el.dataset.earlier ?? '');
    stops.splice(1, 0, gap);
  }
  list.replaceChildren(...stops);
  el.hidden = false;
}

function update() {
  const el = host();
  if (!el) return;
  // Stored values in an unexpected shape read as nothing, and the writes below replace them.
  const state = nextTrail(parseTrail(read(TRAIL_KEY)), parseIntent(read(INTENT_KEY)), currentItem(el), Date.now());
  write(TRAIL_KEY, state);
  write(INTENT_KEY, null);
  render(el, state);
  // The inline guess in ReadingTrail.astro reserved space; from now on `hidden` is the truth.
  document.documentElement.classList.remove('trail-expected');
}

/**
 * Starts the trail on a page that has one: draws it now and again after a back/forward-cache
 * restore, and records term clicks. Returns a function that stops it (for tests).
 */
export function initTrail(): () => void {
  if (!host()) return () => {};

  const onClick = (event: MouseEvent) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-trail-link]');
    const el = host();
    if (!link || !el || !shouldRecordIntent(event)) return;
    write(INTENT_KEY, { from: el.dataset.id, to: link.dataset.trailTo, at: Date.now() } satisfies Partial<TrailIntent>);
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) update();
  };

  document.addEventListener('click', onClick);
  window.addEventListener('pageshow', onPageShow);
  update();
  return () => {
    document.removeEventListener('click', onClick);
    window.removeEventListener('pageshow', onPageShow);
  };
}

initTrail();
