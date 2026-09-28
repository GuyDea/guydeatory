/**
 * Post-build checks on the generated site (dist/). Catches what only shows up in the final HTML:
 * broken links, missing SEO basics, untransformed wiki-links, empty widgets, missing search indexes.
 */
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, sep } from 'node:path';
import { parse } from 'node-html-parser';
import { LANG_CODES } from '../i18n/languages.ts';
import type { Problem } from './content/types.ts';
import { foldDiacritics } from './text.ts';

/** The root language picker only redirects; 404 shows the same text in every language. */
const REDIRECT_PAGES = new Set(['index.html']);
const MULTI_H1_PAGES = new Set(['404.html']);
const PAGEFIND_ENTRY = 'pagefind/pagefind-entry.json';

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(root.length + 1).split(sep).join('/'))
    .sort();
}

export async function checkDist(root: string): Promise<Problem[]> {
  const files = await listFiles(root);
  const present = new Set(files);
  const exists = (path: string) => present.has(path.replace(/^\//, ''));
  const problems: Problem[] = [];

  for (const file of files.filter((f) => f.endsWith('.html'))) {
    const report = (message: string) => problems.push({ file, message });
    const doc = parse(await readFile(join(root, file), 'utf8'));

    for (const el of doc.querySelectorAll('[href], [src]')) {
      for (const attr of ['href', 'src']) {
        const value = el.getAttribute(attr);
        if (!value || !value.startsWith('/') || value.startsWith('//')) continue;
        const path = value.split('#')[0]!.split('?')[0]!;
        if (path.endsWith('/')) {
          if (!exists(`${path}index.html`)) report(`broken link ${value}`);
        } else if (extname(path)) {
          if (!exists(path)) report(`broken link ${value}`);
        } else if (exists(`${path}/index.html`)) {
          report(`link ${value} is missing its trailing slash`);
        } else {
          report(`broken link ${value}`);
        }
      }
    }

    if (!doc.querySelector('title')?.text.trim()) report('missing <title>');
    if (!REDIRECT_PAGES.has(file)) {
      if (!doc.querySelector('meta[name="description"]')?.getAttribute('content')) report('missing meta description');
      if (!doc.querySelector('link[rel="canonical"]')) report('missing canonical link');
      const h1s = doc.querySelectorAll('h1').length;
      if (!MULTI_H1_PAGES.has(file) && h1s !== 1) report(`expected 1 <h1>, found ${h1s}`);
    }

    const article = doc.querySelector('[data-pagefind-body]');
    if (article) {
      const alternates = new Set(doc.querySelectorAll('link[rel="alternate"][hreflang]').map((l) => l.getAttribute('hreflang')));
      const lang = doc.querySelector('html')?.getAttribute('lang');
      for (const needed of [lang, 'x-default']) {
        if (needed && !alternates.has(needed)) report(`article is missing hreflang ${needed}`);
      }
      const title = article.querySelector('h1')?.text.trim() ?? '';
      const folded = foldDiacritics(title);
      const keywords = article.querySelector('[data-pagefind-weight]')?.text ?? '';
      if (folded !== title && !keywords.includes(folded)) report(`search keywords lack the diacritics-free title "${folded}"`);
    }

    const body = doc.querySelector('body');
    if (body) {
      for (const el of body.querySelectorAll('script, style, template')) el.remove();
      const leaked = /\[\[[^\]]{0,120}\]\]/.exec(body.text);
      if (leaked) report(`untransformed wiki-link in text: "${leaked[0]}"`);
      for (const widget of body.querySelectorAll('[data-widget]')) {
        const hasElements = widget.childNodes.some((node) => node.nodeType === 1);
        if (!widget.text.trim() && !hasElements) report(`widget "${widget.getAttribute('data-widget')}" renders no content before hydration`);
      }
    }
  }

  if (!present.has(PAGEFIND_ENTRY)) {
    problems.push({ file: PAGEFIND_ENTRY, message: 'search index missing — did pagefind run after astro build?' });
  } else {
    const entry = JSON.parse(await readFile(join(root, PAGEFIND_ENTRY), 'utf8')) as { languages?: Record<string, unknown> };
    for (const lang of LANG_CODES) {
      if (!entry.languages?.[lang]) problems.push({ file: PAGEFIND_ENTRY, message: `no search index for language "${lang}"` });
    }
  }
  return problems;
}
