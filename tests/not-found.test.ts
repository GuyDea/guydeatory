import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window as HappyWindow } from 'happy-dom';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { LANG_CODES } from '../src/i18n/languages.ts';
import type { LangCode } from '../src/i18n/languages.ts';
import { t } from '../src/i18n/t.ts';
import BaseLayout from '../src/layouts/BaseLayout.astro';
import NotFound from '../src/pages/404.astro';

/**
 * CloudFront serves the one static /404.html for every missing path, so the page picks its language
 * in the browser, from the path the reader tried.
 *
 * Astro components only render in Vitest's Node environment (in the happy-dom environment, .astro
 * files are compiled for the client), so each visit gets its own happy-dom Window instead.
 */
let page: string;
let layout: string;
let happy: HappyWindow | undefined;
/** The current visit's window, typed as a browser window. */
let window: Window & typeof globalThis;

beforeAll(async () => {
  const container = await AstroContainer.create();
  page = await container.renderToString(NotFound);
  layout = await container.renderToString(BaseLayout, {
    props: { lang: 'en', title: 'Test', description: 'Test page', canonical: '/en/', alternates: [] },
  });
});

afterEach(async () => {
  await happy?.happyDOM.abort();
  happy = undefined;
});

/** Opens `html` as if the reader had asked for `path`; with `js`, its inline scripts run in order. */
function visit(html: string, path: string, { js }: { js: boolean }) {
  happy = new HappyWindow({ url: `https://theguydea.com${path}` });
  window = happy as unknown as Window & typeof globalThis;
  const { document } = window;
  const parsed = new window.DOMParser().parseFromString(html, 'text/html');
  document.documentElement.remove();
  document.appendChild(document.importNode(parsed.documentElement, true));
  if (js) {
    for (const script of document.querySelectorAll('script:not([src]):not([type])')) {
      new Function('window', 'document', 'location', 'localStorage', script.textContent ?? '')(
        window,
        document,
        window.location,
        window.localStorage,
      );
    }
  }
  return document;
}

/** Rendered: neither the element nor any ancestor is display: none. */
function shown(element: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (window.getComputedStyle(node).display === 'none') return false;
  }
  return true;
}

const visible = (selector: string) => [...window.document.querySelectorAll(selector)].filter(shown);
const textOf = (element: Element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '';

function expectPageIn(lang: LangCode) {
  const { document } = window;
  expect(document.documentElement.lang).toBe(lang);

  const headers = visible('header.site-header');
  expect(headers).toHaveLength(1);
  expect(headers[0]!.querySelector('nav.nav')!.getAttribute('aria-label')).toBe(t(lang, 'a11y.mainNav'));
  expect(textOf(headers[0]!)).toContain(t(lang, 'nav.explore'));

  const footers = visible('footer.site-footer');
  expect(footers).toHaveLength(1);
  expect(textOf(footers[0]!)).toContain(t(lang, 'site.tagline'));
  expect(textOf(footers[0]!)).toContain(t(lang, 'footer.promise'));

  expect(visible('.skip-link').map(textOf)).toEqual([t(lang, 'a11y.skipToContent')]);
  expect(visible('main section').map((section) => section.getAttribute('lang'))).toEqual([lang]);

  // The quick-search dialog, and the strings the search script reads, speak the same language.
  const dialogs = document.querySelectorAll('[data-search-dialog]');
  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]!.getAttribute('aria-label')).toBe(t(lang, 'search.label'));
  const data = document.querySelectorAll('#search-data');
  expect(data).toHaveLength(1);
  expect(JSON.parse(data[0]!.textContent!).hint).toBe(t(lang, 'search.hint'));
}

describe('the 404 page', () => {
  it('is Slovak from header to footer for a missing page under /sk/', () => {
    visit(page, '/sk/toto-tu-nie-je/', { js: true });
    expectPageIn('sk');
  });

  it.each(['/en/no-such-page/', '/no-such-page', '/de/seite/', '/skala/', '/'])('is English for %s', (path) => {
    visit(page, path, { js: true });
    expectPageIn('en');
  });

  it('picks the language in <head>, before the first paint', () => {
    const document = visit(page, '/sk/x/', { js: false });
    const picker = [...document.head.querySelectorAll('script')].find((s) => s.textContent?.includes('location.pathname'));
    expect(picker, 'an inline script in <head> reads the path').toBeDefined();
    for (const attribute of ['src', 'type', 'defer', 'async']) expect(picker!.hasAttribute(attribute)).toBe(false);
  });

  it('without JavaScript shows the English header and footer, and the message in every language', () => {
    const document = visit(page, '/sk/toto-tu-nie-je/', { js: false });
    expect(document.documentElement.lang).toBe('en');
    const headers = visible('header.site-header');
    expect(headers.map((h) => h.querySelector('nav.nav')!.getAttribute('aria-label'))).toEqual([t('en', 'a11y.mainNav')]);
    const footers = visible('footer.site-footer');
    expect(footers).toHaveLength(1);
    expect(textOf(footers[0]!)).toContain(t('en', 'site.tagline'));
    expect(visible('main section').map((section) => section.getAttribute('lang'))).toEqual(LANG_CODES);
  });

  it('keeps the head essentials of every other page: theme script, fonts, colour scheme', () => {
    const essentials = (html: string) => {
      const { head } = visit(html, '/en/', { js: false });
      return {
        theme: [...head.querySelectorAll('script')].map((s) => s.textContent!.trim()).find((s) => s.includes("localStorage.getItem('theme')")),
        fonts: [...head.querySelectorAll('link[rel="preload"][as="font"]')].map((l) => l.getAttribute('href')),
        meta: ['viewport', 'color-scheme'].map((name) => head.querySelector(`meta[name="${name}"]`)?.getAttribute('content')),
        themeColors: [...head.querySelectorAll('meta[name="theme-color"]')].map((m) => m.getAttribute('content')),
        icon: head.querySelector('link[rel="icon"]')?.getAttribute('href'),
      };
    };
    const reference = essentials(layout);
    expect(reference.theme).toBeDefined();
    expect(reference.fonts.length).toBeGreaterThan(0);
    expect(essentials(page)).toEqual(reference);
  });
});
