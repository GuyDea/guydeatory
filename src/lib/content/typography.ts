/**
 * Dashes (docs/translation.md §3): English uses the em dash (—), Slovak a spaced en dash (–).
 * `npm run lint:content` reports em dashes in the text of every language whose dash is not the em
 * dash; tests/typography.test.ts does the same for the UI dictionaries and widget strings.
 */
import { getLanguage, LANG_CODES } from '../../i18n/languages.ts';
import type { LangCode } from '../../i18n/languages.ts';
import type { Problem, RawContent } from './types.ts';

export const EM_DASH = '—';

/** The dash each language puts between two parts of a sentence. A new language must choose one. */
export const DASH: Record<LangCode, string> = {
  en: EM_DASH,
  sk: '–',
};

/** Languages whose text must not contain an em dash. */
export const EN_DASH_LANGS: LangCode[] = LANG_CODES.filter((code) => DASH[code] !== EM_DASH);

const usesEnDash = (lang: string): lang is LangCode => (EN_DASH_LANGS as string[]).includes(lang);

export interface EmDash {
  /** 1-based line in the source. */
  line: number;
  /** A few words around the dash, to find it by. */
  excerpt: string;
}

/** Blanks out fenced and inline code, keeping every line where it was. */
function maskCode(markdown: string): string {
  const blank = (code: string) => code.replace(/[^\n]/g, ' ');
  return markdown.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, blank).replace(/`[^`\n]*`/g, blank);
}

const CONTEXT = 20;

/** Up to CONTEXT characters on each side of the dash, cut at whole words. */
function excerpt(line: string, at: number): string {
  let start = Math.max(0, at - CONTEXT);
  let end = Math.min(line.length, at + 1 + CONTEXT);
  if (start > 0 && /\S/.test(line[start - 1]!)) {
    const space = line.indexOf(' ', start);
    if (space !== -1 && space < at) start = space + 1;
  }
  if (end < line.length && /\S/.test(line[end]!)) {
    const space = line.lastIndexOf(' ', end);
    if (space > at) end = space;
  }
  return `${start > 0 ? '…' : ''}${line.slice(start, end).trim()}${end < line.length ? '…' : ''}`;
}

/** Every em dash in a Markdown/MDX source (frontmatter included, code excluded), line by line. */
export function findEmDashes(source: string): EmDash[] {
  const found: EmDash[] = [];
  maskCode(source)
    .split('\n')
    .forEach((line, index) => {
      for (let at = line.indexOf(EM_DASH); at !== -1; at = line.indexOf(EM_DASH, at + 1)) {
        found.push({ line: index + 1, excerpt: excerpt(line, at) });
      }
    });
  return found;
}

const advice = (lang: LangCode) => `${getLanguage(lang).name} uses a spaced en dash (–)`;

/** Em dashes in one language file (`<lang>.mdx`) of an article or a page. */
export function mdxDashProblems(file: string, lang: string, source: string): Problem[] {
  if (!usesEnDash(lang)) return [];
  return findEmDashes(source).map(({ line, excerpt }) => ({
    file,
    message: `line ${line}: em dash (${EM_DASH}) in "${excerpt}" — ${advice(lang)}`,
  }));
}

/** Em dashes in the localized names and descriptions of topics (topics.yaml) and labels (labels.yaml). */
export function yamlDashProblems(raw: RawContent): Problem[] {
  const problems: Problem[] = [];
  const check = (file: string, owner: string, entry: Record<string, unknown>) => {
    for (const field of ['name', 'description']) {
      const values = entry[field];
      if (!values || typeof values !== 'object') continue;
      for (const lang of EN_DASH_LANGS) {
        const text = (values as Record<string, unknown>)[lang];
        if (typeof text !== 'string') continue;
        for (const { excerpt } of findEmDashes(text)) {
          problems.push({ file, message: `${owner}, ${field} (${lang}): em dash (${EM_DASH}) in "${excerpt}" — ${advice(lang)}` });
        }
      }
    }
  };
  const entries = (data: unknown) =>
    (Array.isArray(data) ? data : []).filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object');

  const visitTopics = (nodes: unknown) => {
    for (const node of entries(nodes)) {
      check(raw.topics.file, `topic "${String(node.id)}"`, node);
      visitTopics(node.children);
    }
  };
  visitTopics(raw.topics.data);
  for (const label of entries(raw.labels.data)) check(raw.labels.file, `label "${String(label.id)}"`, label);
  return problems;
}
