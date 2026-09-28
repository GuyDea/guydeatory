/**
 * Wiki-link syntax used in article bodies:
 *   [[article-id]]            → link text is the target's `term`
 *   [[article-id|any text]]   → custom link text (needed for Slovak grammatical cases)
 */
export const ID_PATTERN = '[a-z0-9]+(?:-[a-z0-9]+)*';
export const ID_RE = new RegExp(`^${ID_PATTERN}$`);

/** Global regex; group 1 = target id, group 2 = optional display text. */
export const WIKI_LINK_RE = new RegExp(`\\[\\[(${ID_PATTERN})(?:\\|([^\\]|\\n]*[^\\]|\\n\\s][^\\]|\\n]*))?\\]\\]`, 'g');

const ANY_DOUBLE_BRACKET_RE = /\[\[[^\]\n]*\]\]/g;

export interface WikiLink {
  target: string;
  text?: string;
}

/** Removes fenced code blocks and inline code, which never contain real links. */
export function stripCode(markdown: string): string {
  return markdown.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '').replace(/`[^`\n]*`/g, '');
}

export function extractWikiLinks(markdown: string): WikiLink[] {
  const links: WikiLink[] = [];
  for (const match of stripCode(markdown).matchAll(WIKI_LINK_RE)) {
    const [, target, text] = match;
    links.push(text === undefined ? { target: target! } : { target: target!, text });
  }
  return links;
}

/** `[[…]]` sequences that are not valid wiki-links (they would render as literal brackets). */
export function findMalformedWikiLinks(markdown: string): string[] {
  const malformed: string[] = [];
  for (const [candidate] of stripCode(markdown).matchAll(ANY_DOUBLE_BRACKET_RE)) {
    const exact = new RegExp(`^${WIKI_LINK_RE.source}$`);
    if (!exact.test(candidate)) malformed.push(candidate);
  }
  return malformed;
}
