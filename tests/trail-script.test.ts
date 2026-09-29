// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TrailItem, TrailState } from '../src/lib/trail.ts';
// On import the script starts itself against this still empty page. With no trail on the page it
// does nothing, so each test below starts it with initTrail() once its page is in place.
import { initTrail } from '../src/scripts/trail.ts';

const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
const item = (id: string): TrailItem => ({ id, lang: 'en', url: `/en/${id}/`, title: title(id) });
const trail = (ids: string[], pos = ids.length - 1, capped = false): TrailState => ({ items: ids.map(item), pos, capped });

const store = (key: string, value: unknown) => sessionStorage.setItem(key, JSON.stringify(value));
const stored = (key = 'gd:trail') => JSON.parse(sessionStorage.getItem(key) ?? 'null') as unknown;

/** Puts article `id` in the window, with the markup ReadingTrail.astro renders. */
function openPage(id: string, body = '') {
  history.replaceState(null, '', `/en/${id}/`);
  document.body.innerHTML = `
    <nav class="trail" aria-label="Your path" data-trail hidden data-trail-current data-id="${id}" data-title="${title(id)}" data-earlier="Earlier steps">
      <span class="trail-label">Your path</span><ol></ol>
    </nav>
    ${body}`;
}

const nav = () => document.querySelector<HTMLElement>('[data-trail-current]')!;
/** The stops the reader sees, or [] while the trail is hidden. */
const shown = () => (nav().hidden ? [] : [...nav().querySelectorAll('li')].map((li) => li.textContent));

function pageshow(persisted: boolean) {
  // happy-dom's PageTransitionEvent is a plain Event, so `persisted` is set by hand.
  const event = new Event('pageshow');
  Object.defineProperty(event, 'persisted', { value: persisted });
  window.dispatchEvent(event);
}

let stop = () => {};

beforeEach(() => {
  sessionStorage.clear();
  document.documentElement.lang = 'en';
});

afterEach(() => {
  stop();
  stop = () => {};
});

describe('the trail script', () => {
  it('draws the stored trail when the page loads, up to this page', () => {
    openPage('electron');
    store('gd:trail', trail(['atom', 'electron', 'voltage']));
    stop = initTrail();
    expect(shown()).toEqual(['Atom', 'Electron']);
    expect(stored()).toEqual(trail(['atom', 'electron', 'voltage'], 1));
  });

  it('draws the trail again from storage when the page comes back from the back/forward cache', () => {
    openPage('electron');
    store('gd:trail', trail(['atom', 'electron']));
    stop = initTrail();
    expect(shown()).toEqual(['Atom', 'Electron']);

    // While the page sat in the cache, other pages of this tab changed the stored trail.
    store('gd:trail', trail(['heat', 'electron', 'voltage']));
    pageshow(true);
    expect(shown()).toEqual(['Heat', 'Electron']);
    expect(stored()).toEqual(trail(['heat', 'electron', 'voltage'], 1));
  });

  it('hides an outdated trail when the restored page is no longer on the path', () => {
    openPage('electron');
    store('gd:trail', trail(['atom', 'electron']));
    stop = initTrail();

    // The reader went back to atom along the trail, followed a term to heat, then pressed Back twice.
    store('gd:trail', trail(['atom', 'heat'], 0));
    pageshow(true);
    expect(shown()).toEqual([]);
    expect(stored()).toEqual(trail(['electron']));
  });

  it('leaves the trail alone on a pageshow that is not a cache restore', () => {
    openPage('electron');
    store('gd:trail', trail(['atom', 'electron']));
    stop = initTrail();

    store('gd:trail', trail(['heat', 'electron']));
    pageshow(false);
    expect(shown()).toEqual(['Atom', 'Electron']);
  });

  it('marks the dropped steps of a capped trail', () => {
    openPage('electron');
    store('gd:trail', trail(['atom', 'charge', 'electron'], 2, true));
    stop = initTrail();
    expect(shown()).toEqual(['Atom', '…', 'Charge', 'Electron']);
    expect(nav().querySelector('.trail-gap')!.getAttribute('aria-label')).toBe('Earlier steps');
  });

  it('never breaks on stored values in an unexpected shape, and replaces them', () => {
    openPage('electron');
    store('gd:trail', { items: [{ id: 'atom' }], capped: false });
    store('gd:intent', 42);
    expect(() => (stop = initTrail())).not.toThrow();
    expect(shown()).toEqual([]);
    expect(stored()).toEqual(trail(['electron']));
    expect(stored('gd:intent')).toBeNull();
  });

  it('records where a plain click on a term link leads, but not a click that opens a new tab', () => {
    openPage('electron', '<p><a data-trail-link data-trail-to="voltage">voltage</a></p>');
    stop = initTrail();
    const link = document.querySelector('a[data-trail-link]')!;

    link.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, ctrlKey: true }));
    expect(stored('gd:intent')).toBeNull();

    link.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    expect(stored('gd:intent')).toMatchObject({ from: 'electron', to: 'voltage' });
  });
});
