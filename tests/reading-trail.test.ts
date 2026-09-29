import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import ReadingTrail from '../src/components/article/ReadingTrail.astro';
import type { TrailItem } from '../src/lib/trail.ts';

const item = (id: string, lang = 'en'): TrailItem => ({ id, lang, url: `/${lang}/${id}/`, title: id });

/**
 * The component renders in Node (Vitest compiles .astro files for the client in DOM environments),
 * and its inline script runs against a happy-dom window's document and sessionStorage.
 */
describe('the inline guess in ReadingTrail.astro', () => {
  let window: Window;

  beforeEach(() => {
    window = new Window({ url: 'https://theguydea.com/en/' });
    window.document.documentElement.lang = 'en';
  });

  const store = (key: string, value: unknown) => window.sessionStorage.setItem(key, JSON.stringify(value));

  /** Runs the component's inline script for article `id`, as the browser does before first paint. */
  async function guessFor(id: string): Promise<boolean> {
    const container = await AstroContainer.create();
    window.document.body.innerHTML = await container.renderToString(ReadingTrail, { props: { lang: 'en', id, name: id } });
    const inline = window.document.querySelector('script:not([type])')!.textContent;
    new Function('sessionStorage', 'document', inline)(window.sessionStorage, window.document);
    return window.document.documentElement.classList.contains('trail-expected');
  }

  it('reserves space when Back returns to a step after the origin', async () => {
    store('gd:trail', { items: [item('atom'), item('electron'), item('voltage')], pos: 2, capped: false });
    expect(await guessFor('electron')).toBe(true);
  });

  it('reserves space when a term is followed from an earlier step', async () => {
    store('gd:trail', { items: [item('atom'), item('electron')], pos: 0, capped: false });
    store('gd:intent', { from: 'atom', to: 'voltage', at: Date.now() });
    expect(await guessFor('voltage')).toBe(true);
  });

  it('reads a trail stored before positions existed as standing on its last step', async () => {
    store('gd:trail', { items: [item('atom'), item('electron')], capped: false });
    store('gd:intent', { from: 'electron', to: 'voltage', at: Date.now() });
    expect(await guessFor('voltage')).toBe(true);
  });

  it('reserves nothing back at the origin, where the trail stays hidden', async () => {
    store('gd:trail', { items: [item('atom'), item('electron')], pos: 1, capped: false });
    expect(await guessFor('atom')).toBe(false);
  });

  it('reserves nothing when the page was not reached along the trail', async () => {
    store('gd:trail', { items: [item('atom'), item('electron')], pos: 1, capped: false });
    expect(await guessFor('voltage')).toBe(false);
  });

  it('reserves nothing after a language change', async () => {
    store('gd:trail', { items: [item('atom', 'sk'), item('electron', 'sk')], pos: 1, capped: false });
    expect(await guessFor('electron')).toBe(false);
  });
});
