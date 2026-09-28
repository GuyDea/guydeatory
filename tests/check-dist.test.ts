import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkDist } from '../src/lib/check-dist.ts';

interface PageSpec {
  title?: string | null;
  description?: string | null;
  canonical?: string | null;
  alternates?: string[];
  h1?: string | null;
  body?: string;
  article?: boolean;
  keywords?: string;
}

function page({
  title = 'Title',
  description = 'Description',
  canonical = 'https://theguydea.com/en/x/',
  alternates = [],
  h1 = 'Heading',
  body = '',
  article = false,
  keywords = '',
}: PageSpec = {}): string {
  const head = [
    title === null ? '' : `<title>${title}</title>`,
    description === null ? '' : `<meta name="description" content="${description}">`,
    canonical === null ? '' : `<link rel="canonical" href="${canonical}">`,
    ...alternates.map((lang) => `<link rel="alternate" hreflang="${lang}" href="https://theguydea.com/${lang}/x/">`),
  ].join('');
  const main = article
    ? `<article data-pagefind-body>${h1 === null ? '' : `<h1>${h1}</h1>`}${body}<span class="visually-hidden" data-pagefind-weight="5">${keywords}</span></article>`
    : `${h1 === null ? '' : `<h1>${h1}</h1>`}${body}`;
  return `<!doctype html><html lang="en"><head>${head}</head><body>${main}</body></html>`;
}

const PAGEFIND = JSON.stringify({ version: '1.5.2', languages: { en: {}, sk: {} } });

let dir: string;

async function site(files: Record<string, string>) {
  dir = await mkdtemp(join(tmpdir(), 'guydeatory-dist-'));
  const all = { 'pagefind/pagefind-entry.json': PAGEFIND, ...files };
  for (const [path, body] of Object.entries(all)) {
    await mkdir(join(dir, path, '..'), { recursive: true });
    await writeFile(join(dir, path), body);
  }
  return dir;
}

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

const ARTICLE = { article: true, alternates: ['en', 'sk', 'x-default'] };

describe('checkDist', () => {
  it('accepts a healthy site', async () => {
    const root = await site({
      'en/index.html': page({ body: '<a href="/en/x/">x</a><img src="/_astro/a.png">' }),
      'en/x/index.html': page({ ...ARTICLE, body: '<a href="/en/#top">home</a>' }),
      '_astro/a.png': 'png',
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

  it('reports widgets that render nothing before hydration', async () => {
    const root = await site({ 'en/x/index.html': page({ ...ARTICLE, body: '<div data-widget="ohms-law"></div>' }) });
    expect(await checkDist(root)).toEqual([{ file: 'en/x/index.html', message: 'widget "ohms-law" renders no content before hydration' }]);
  });

  it('reports a search index missing for a configured language', async () => {
    const root = await site({ 'pagefind/pagefind-entry.json': JSON.stringify({ languages: { en: {} } }) });
    expect(await checkDist(root)).toEqual([{ file: 'pagefind/pagefind-entry.json', message: 'no search index for language "sk"' }]);
  });

  it('requires a diacritics-free copy of the title in article keywords', async () => {
    const root = await site({ 'sk/x/index.html': page({ ...ARTICLE, h1: 'Čo je prúd?', keywords: 'Čo je prúd?' }) });
    expect(await checkDist(root)).toEqual([{ file: 'sk/x/index.html', message: 'search keywords lack the diacritics-free title "Co je prud?"' }]);
  });
});
