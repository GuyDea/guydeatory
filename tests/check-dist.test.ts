import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkDist } from '../src/lib/check-dist.ts';

/** Stands for the page's own absolute URL; `site()` fills it in from the file path. */
const SELF = '{self}';

interface PageSpec {
  lang?: string;
  title?: string | null;
  description?: string | null;
  canonical?: string | null;
  ogUrl?: string | null;
  /** hreflang codes; each alternate points at the page itself unless `head` adds others. */
  alternates?: string[];
  head?: string;
  h1?: string | null;
  body?: string;
  article?: boolean;
  keywords?: string;
}

function page({
  lang = 'en',
  title = 'Title',
  description = 'Description',
  canonical = SELF,
  ogUrl = SELF,
  alternates = [],
  head: extraHead = '',
  h1 = 'Heading',
  body = '',
  article = false,
  keywords = '',
}: PageSpec = {}): string {
  const head = [
    title === null ? '' : `<title>${title}</title>`,
    description === null ? '' : `<meta name="description" content="${description}">`,
    canonical === null ? '' : `<link rel="canonical" href="${canonical}">`,
    ...alternates.map((code) => `<link rel="alternate" hreflang="${code}" href="${SELF}">`),
    ogUrl === null ? '' : `<meta property="og:url" content="${ogUrl}">`,
    extraHead,
  ].join('');
  const main = article
    ? `<article data-pagefind-body>${h1 === null ? '' : `<h1>${h1}</h1>`}${body}<span class="visually-hidden" data-pagefind-weight="5">${keywords}</span></article>`
    : `${h1 === null ? '' : `<h1>${h1}</h1>`}${body}`;
  return `<!doctype html><html lang="${lang}"><head>${head}</head><body>${main}</body></html>`;
}

/** The frame every widget gets from WidgetFrame.svelte: a header with the title (and, once hydrated, buttons) and a hint. */
function widget(name: string, content: string, headerExtra = ''): string {
  return `<section class="widget" data-widget="${name}" role="group" aria-label="${name}"><header class="head"><p class="title">The ${name} widget</p>${headerExtra}</header><p class="hint">Try it.</p>${content}</section>`;
}

function sitemap(urls: string[]): string {
  const entries = urls.map((url) => `<url><loc>${url}</loc><xhtml:link rel="alternate" hreflang="en" href="${url}"/></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`;
}

const PAGEFIND = JSON.stringify({ version: '1.5.2', languages: { en: {}, sk: {} } });

/** "en/x/index.html" → "https://theguydea.com/en/x/" */
function urlOf(path: string): string {
  return `https://theguydea.com/${path.replace(/(^|\/)index\.html$/, '$1')}`;
}

let dir: string;

async function site(files: Record<string, string>) {
  dir = await mkdtemp(join(tmpdir(), 'guydeatory-dist-'));
  const all = { 'pagefind/pagefind-entry.json': PAGEFIND, ...files };
  for (const [path, body] of Object.entries(all)) {
    await mkdir(join(dir, path, '..'), { recursive: true });
    await writeFile(join(dir, path), body.replaceAll(SELF, urlOf(path)));
  }
  return dir;
}

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

const ARTICLE = { article: true, alternates: ['en', 'sk', 'x-default'] };
const SK_ARTICLE = { ...ARTICLE, lang: 'sk', h1: 'Čo je prúd?' };

describe('checkDist', () => {
  it('accepts a healthy site', async () => {
    const root = await site({
      'en/index.html': page({ body: '<a href="/en/x/">x</a><img src="/_astro/a.png">' }),
      'en/x/index.html': page({
        ...ARTICLE,
        alternates: ['en', 'x-default'],
        head: '<link rel="alternate" hreflang="sk" href="https://theguydea.com/sk/x/">',
        body: [
          '<a href="/en/#top">home</a>',
          widget('ohms-law', '<div class="stage"><svg viewBox="0 0 10 10"><title>Wire</title><circle cx="5" cy="5" r="2"></circle></svg></div>'),
          widget('boiling-point', '<div class="stage"><p>100 °C</p></div><div class="controls"><input type="range" disabled></div>'),
        ].join(''),
      }),
      'sk/x/index.html': page({
        ...SK_ARTICLE,
        keywords: 'Čo je prúd? · elektrický prúd · prúd · ampér · Co je prud? · elektricky prud · prud · amper',
      }),
      '_astro/a.png': 'png',
      'sitemap.xml': sitemap(['https://theguydea.com/en/', 'https://theguydea.com/en/x/', 'https://theguydea.com/sk/x/']),
      'robots.txt': 'User-agent: *\nAllow: /\n\nSitemap: https://theguydea.com/sitemap.xml\n',
    });
    expect(await checkDist(root)).toEqual([]);
  });

  it('reports internal links and assets that do not exist', async () => {
    const root = await site({ 'en/index.html': page({ body: '<a href="/en/missing/">m</a><script src="/_astro/gone.js"></script>' }) });
    expect(await checkDist(root)).toEqual([
      { file: 'en/index.html', message: 'broken link /en/missing/' },
      { file: 'en/index.html', message: 'broken link /_astro/gone.js' },
    ]);
  });

  it('reports page links without the trailing slash', async () => {
    const root = await site({
      'en/index.html': page({ body: '<a href="/en/x">x</a>' }),
      'en/x/index.html': page(ARTICLE),
    });
    expect(await checkDist(root)).toEqual([{ file: 'en/index.html', message: 'link /en/x is missing its trailing slash' }]);
  });

  it('reports pages without title, description or canonical', async () => {
    const root = await site({ 'en/index.html': page({ title: null, description: null, canonical: null }) });
    expect((await checkDist(root)).map((p) => p.message)).toEqual(['missing <title>', 'missing meta description', 'missing canonical link']);
  });

  it('reports canonical, hreflang and og:url addresses on the site that match no built page', async () => {
    const root = await site({
      'en/x/index.html': page({
        canonical: 'https://theguydea.com/en/y/',
        ogUrl: 'https://theguydea.com/en/x',
        head: '<link rel="alternate" hreflang="sk" href="https://theguydea.com/sk/x/">',
      }),
    });
    expect(await checkDist(root)).toEqual([
      { file: 'en/x/index.html', message: 'broken canonical https://theguydea.com/en/y/' },
      { file: 'en/x/index.html', message: 'broken hreflang sk https://theguydea.com/sk/x/' },
      { file: 'en/x/index.html', message: 'og:url https://theguydea.com/en/x is missing its trailing slash' },
    ]);
  });

  it('reports canonical, hreflang and og:url addresses that are relative or leave the site', async () => {
    const root = await site({
      'en/x/index.html': page({
        canonical: 'https://www.theguydea.com/en/x/',
        ogUrl: 'http://theguydea.com/en/x/',
        head: '<link rel="alternate" hreflang="sk" href="https://example.com/sk/x/">',
      }),
      'en/y/index.html': page({ ogUrl: '/en/y/' }),
    });
    expect(await checkDist(root)).toEqual([
      { file: 'en/x/index.html', message: 'canonical https://www.theguydea.com/en/x/ is not on https://theguydea.com' },
      { file: 'en/x/index.html', message: 'hreflang sk https://example.com/sk/x/ is not on https://theguydea.com' },
      { file: 'en/x/index.html', message: 'og:url http://theguydea.com/en/x/ is not on https://theguydea.com' },
      { file: 'en/y/index.html', message: 'og:url /en/y/ is not an absolute URL' },
    ]);
  });

  it('reports sitemap and robots.txt addresses that match no built page', async () => {
    const root = await site({
      'en/x/index.html': page(),
      'sitemap.xml': sitemap(['https://theguydea.com/en/x/', 'https://theguydea.com/en/gone/']).replace(
        'hreflang="en" href="https://theguydea.com/en/x/"',
        'hreflang="sk" href="https://theguydea.com/sk/x/"',
      ),
      'robots.txt': 'User-agent: *\nSitemap: https://theguydea.com/sitemap-index.xml\n',
    });
    expect(await checkDist(root)).toEqual([
      { file: 'robots.txt', message: 'broken Sitemap https://theguydea.com/sitemap-index.xml' },
      { file: 'sitemap.xml', message: 'broken hreflang sk https://theguydea.com/sk/x/' },
      { file: 'sitemap.xml', message: 'broken loc https://theguydea.com/en/gone/' },
      { file: 'sitemap.xml', message: 'broken hreflang en https://theguydea.com/en/gone/' },
    ]);
  });

  it('requires exactly one h1', async () => {
    const root = await site({ 'en/index.html': page({ body: '<h1>Second</h1>' }) });
    expect(await checkDist(root)).toEqual([{ file: 'en/index.html', message: 'expected 1 <h1>, found 2' }]);
  });

  it('requires hreflang alternates on articles', async () => {
    const root = await site({ 'en/x/index.html': page({ article: true, alternates: ['en'] }) });
    expect(await checkDist(root)).toEqual([{ file: 'en/x/index.html', message: 'article is missing hreflang x-default' }]);
  });

  it('reports wiki-link brackets that leaked into the text', async () => {
    const root = await site({ 'en/x/index.html': page({ ...ARTICLE, body: '<p>See [[voltage]].</p>' }) });
    expect(await checkDist(root)).toEqual([{ file: 'en/x/index.html', message: 'untransformed wiki-link in text: "[[voltage]]"' }]);
  });

  it('reports leaked wiki-links that span lines', async () => {
    const root = await site({ 'en/x/index.html': page({ ...ARTICLE, body: '<p>See [[voltage|the\npush]].</p>' }) });
    expect(await checkDist(root)).toEqual([{ file: 'en/x/index.html', message: 'untransformed wiki-link in text: "[[voltage|the\npush]]"' }]);
  });

  it('reports widgets that render nothing before hydration', async () => {
    const root = await site({ 'en/x/index.html': page({ ...ARTICLE, body: '<div data-widget="ohms-law"></div>' }) });
    expect(await checkDist(root)).toEqual([{ file: 'en/x/index.html', message: 'widget "ohms-law" renders no content before hydration' }]);
  });

  it('does not count the widget frame as content', async () => {
    const root = await site({
      'en/x/index.html': page({
        ...ARTICLE,
        body: [
          // Only the title, the hint and the frame's own buttons.
          widget('ohms-law', '<div class="stage"></div>', '<div class="actions"><button type="button">Pause</button></div>'),
          // A drawing with nothing drawn: a title and definitions only.
          widget('ac-dc', '<div class="stage"><svg viewBox="0 0 10 10"><title>Current</title><defs><marker id="m"><path d="M0 0 10 5 0 10z"></path></marker></defs></svg></div>'),
          // Text, but no picture and no control.
          widget('heat-pump-cycle', '<div class="stage"><p>Loading…</p></div>'),
        ].join(''),
      }),
    });
    expect(await checkDist(root)).toEqual([
      { file: 'en/x/index.html', message: 'widget "ohms-law" renders no content before hydration' },
      { file: 'en/x/index.html', message: 'widget "ac-dc" renders no content before hydration' },
      { file: 'en/x/index.html', message: 'widget "heat-pump-cycle" renders no content before hydration' },
    ]);
  });

  it('reports a search index missing for a configured language', async () => {
    const root = await site({ 'pagefind/pagefind-entry.json': JSON.stringify({ languages: { en: {} } }) });
    expect(await checkDist(root)).toEqual([{ file: 'pagefind/pagefind-entry.json', message: 'no search index for language "sk"' }]);
  });

  it('requires a diacritics-free copy of the title in article keywords', async () => {
    const root = await site({ 'sk/x/index.html': page({ ...SK_ARTICLE, keywords: 'Čo je prúd?' }) });
    expect(await checkDist(root)).toEqual([{ file: 'sk/x/index.html', message: 'search keywords lack the diacritics-free title "Co je prud?"' }]);
  });

  it('requires diacritics-free copies of the term and keywords on Slovak pages', async () => {
    const root = await site({
      'sk/x/index.html': page({ ...SK_ARTICLE, keywords: 'Čo je prúd? · elektrický prúd · elektrina · ampér · Co je prud?' }),
    });
    expect(await checkDist(root)).toEqual([
      { file: 'sk/x/index.html', message: 'search keywords lack the diacritics-free "elektricky prud"' },
      { file: 'sk/x/index.html', message: 'search keywords lack the diacritics-free "amper"' },
    ]);
  });
});
