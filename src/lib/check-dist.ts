/**
 * Post-build checks on the generated site (dist/). Catches what only shows up in the final HTML:
 * broken links, missing SEO basics, untransformed wiki-links, empty widgets, missing search indexes.
 */
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, sep } from 'node:path';
import { parse } from 'node-html-parser';
import type { HTMLElement } from 'node-html-parser';
import { LANG_CODES } from '../i18n/languages.ts';
import type { Problem } from './content/types.ts';
import { foldDiacritics } from './text.ts';
import { SITE } from './urls.ts';

/** The root language picker only redirects; 404 shows the same text in every language. */
const REDIRECT_PAGES = new Set(['index.html']);
const MULTI_H1_PAGES = new Set(['404.html']);
const PAGEFIND_ENTRY = 'pagefind/pagefind-entry.json';
const SITE_ORIGIN = new URL(SITE).origin;

/** What a widget must show before hydration: a control, or a drawing made of these shapes. */
const CONTROLS = 'button, input, select, textarea, [role="button"], [role="slider"], [role="radio"], [role="checkbox"], [role="switch"]';
const SHAPES = new Set(['circle', 'ellipse', 'image', 'line', 'path', 'polygon', 'polyline', 'rect', 'use']);
/** SVG containers whose shapes are never drawn directly. */
const UNDRAWN = new Set(['clippath', 'defs', 'marker', 'mask', 'pattern', 'symbol']);
/** The widget frame's chrome: its header holds the title (always there) and the Pause and Start-again buttons. */
const CHROME = new Set(['header']);
/** Search keywords are joined with this in ArticleView.astro. */
const KEYWORD_SEPARATOR = ' · ';

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(root.length + 1).split(sep).join('/'))
    .sort();
}

const tagOf = (el: HTMLElement) => (el.rawTagName ?? '').toLowerCase();

/** True when some element between `el` and `root` (both excluded) is one of `tags`. */
function isInside(el: HTMLElement, root: HTMLElement, tags: Set<string>): boolean {
  for (let node = el.parentNode; node && node !== root; node = node.parentNode) {
    if (tags.has(tagOf(node))) return true;
  }
  return false;
}

/** Whether a widget shows something real before hydration, not counting the frame's chrome. */
function hasContent(widget: HTMLElement): boolean {
  if (widget.querySelectorAll(CONTROLS).some((el) => !isInside(el, widget, CHROME))) return true;
  return widget
    .querySelectorAll('svg')
    .filter((svg) => !isInside(svg, widget, CHROME))
    .some((svg) => svg.querySelectorAll('*').some((el) => SHAPES.has(tagOf(el)) && !isInside(el, svg, UNDRAWN)));
}

export async function checkDist(root: string): Promise<Problem[]> {
  const files = await listFiles(root);
  const present = new Set(files);
  const exists = (path: string) => present.has(path.replace(/^\//, ''));
  const problems: Problem[] = [];

  /** Why a root-relative path reaches no built file, or null when it does. `/x/` → `x/index.html`. */
  const unreachable = (path: string): 'broken' | 'no-slash' | null => {
    if (path.endsWith('/')) return exists(`${path}index.html`) ? null : 'broken';
    if (extname(path)) return exists(path) ? null : 'broken';
    return exists(`${path}/index.html`) ? 'no-slash' : 'broken';
  };

  /** Absolute addresses (canonical, hreflang, og:url, sitemap) must be on the site and reach a built file. */
  const checkAbsolute = (file: string, kind: string, url: string) => {
    const report = (message: string) => void problems.push({ file, message });
    if (!URL.canParse(url)) return report(`${kind} ${url} is not an absolute URL`);
    const { origin, pathname } = new URL(url);
    if (origin !== SITE_ORIGIN) return report(`${kind} ${url} is not on ${SITE_ORIGIN}`);
    let path = pathname;
    try {
      path = decodeURIComponent(pathname);
    } catch {
      // Malformed escapes: keep the encoded path, which then reaches no file and is reported.
    }
    const reason = unreachable(path);
    if (reason === 'broken') report(`broken ${kind} ${url}`);
    if (reason === 'no-slash') report(`${kind} ${url} is missing its trailing slash`);
  };

  for (const file of files.filter((f) => f.endsWith('.html'))) {
    const report = (message: string) => problems.push({ file, message });
    const doc = parse(await readFile(join(root, file), 'utf8'));

    for (const el of doc.querySelectorAll('[href], [src]')) {
      for (const attr of ['href', 'src']) {
        const value = el.getAttribute(attr);
        if (!value || !value.startsWith('/') || value.startsWith('//')) continue;
        const reason = unreachable(value.split('#')[0]!.split('?')[0]!);
        if (reason === 'broken') report(`broken link ${value}`);
        if (reason === 'no-slash') report(`link ${value} is missing its trailing slash`);
      }
    }

    // aria-labelledby, label[for] and #fragments need ids that are unique on the page.
    const ids = new Map<string, number>();
    for (const el of doc.querySelectorAll('[id]')) {
      if (el.closest('template')) continue; // inert until a script uses it
      const id = el.getAttribute('id')!;
      ids.set(id, (ids.get(id) ?? 0) + 1);
      if (ids.get(id) === 2) report(`duplicate id "${id}"`);
    }

    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
    if (canonical) checkAbsolute(file, 'canonical', canonical);
    for (const alternate of doc.querySelectorAll('link[rel="alternate"][hreflang]')) {
      const href = alternate.getAttribute('href');
      if (href) checkAbsolute(file, `hreflang ${alternate.getAttribute('hreflang')}`, href);
    }
    const ogUrl = doc.querySelector('meta[property="og:url"]')?.getAttribute('content');
    if (ogUrl) checkAbsolute(file, 'og:url', ogUrl);

    if (!doc.querySelector('title')?.text.trim()) report('missing <title>');
    if (!REDIRECT_PAGES.has(file)) {
      if (!doc.querySelector('meta[name="description"]')?.getAttribute('content')) report('missing meta description');
      if (!canonical) report('missing canonical link');
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
      // Searches typed without diacritics ("elektricky prud") only match through these copies:
      // the title, the term and every keyword each need one.
      const keywordText = article.querySelector('[data-pagefind-weight]')?.text ?? '';
      const keywords = new Set(keywordText.split(KEYWORD_SEPARATOR).map((part) => part.trim()));
      const reported = new Set<string>();
      const requireFolded = (value: string, what: string) => {
        const folded = foldDiacritics(value);
        if (folded === value || keywords.has(folded) || reported.has(folded)) return;
        reported.add(folded);
        report(`search keywords lack the diacritics-free ${what}"${folded}"`);
      };
      requireFolded(article.querySelector('h1')?.text.trim() ?? '', 'title ');
      for (const part of keywords) requireFolded(part, '');
    }

    const body = doc.querySelector('body');
    if (body) {
      for (const el of body.querySelectorAll('script, style, template')) el.remove();
      const leaked = /\[\[[^\]]{0,120}\]\]/.exec(body.text);
      if (leaked) report(`untransformed wiki-link in text: "${leaked[0]}"`);
      for (const widget of body.querySelectorAll('[data-widget]')) {
        if (!hasContent(widget)) report(`widget "${widget.getAttribute('data-widget')}" renders no content before hydration`);
      }
    }
  }

  if (present.has('robots.txt')) {
    const robots = await readFile(join(root, 'robots.txt'), 'utf8');
    for (const match of robots.matchAll(/^sitemap:\s*(\S+)/gim)) checkAbsolute('robots.txt', 'Sitemap', match[1]!);
  }
  if (present.has('sitemap.xml')) {
    const xml = await readFile(join(root, 'sitemap.xml'), 'utf8');
    const decode = (value: string) =>
      value.replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[name]!);
    for (const match of xml.matchAll(/<loc>([^<]*)<\/loc>|<xhtml:link\b([^>]*)>/g)) {
      if (match[1] !== undefined) {
        checkAbsolute('sitemap.xml', 'loc', decode(match[1].trim()));
        continue;
      }
      const attrs = match[2]!;
      const href = /\bhref="([^"]*)"/.exec(attrs)?.[1];
      const hreflang = /\bhreflang="([^"]*)"/.exec(attrs)?.[1];
      if (href) checkAbsolute('sitemap.xml', `hreflang ${hreflang}`, decode(href));
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
