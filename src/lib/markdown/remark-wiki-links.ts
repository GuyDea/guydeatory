import type { PhrasingContent, Root, Text } from 'mdast';
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import { SKIP, visit } from 'unist-util-visit';
import { normaliseLinkText, WIKI_LINK_RE } from '../content/wiki-links.ts';

function termElement(id: string, text: string | undefined): MdxJsxTextElement {
  return {
    type: 'mdxJsxTextElement',
    name: 'Term',
    attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: id }],
    children: text === undefined ? [] : [{ type: 'text', value: normaliseLinkText(text) }],
  };
}

/**
 * `[[id]]` → `<Term id="id" />`, `[[id|text]]` → `<Term id="id">text</Term>`.
 * Code is never touched (it is not a `text` node); links are not nested inside links.
 */
export function remarkWikiLinks() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined || parent.type === 'link' || parent.type === 'linkReference') return;
      const pieces: PhrasingContent[] = [];
      let cursor = 0;
      for (const match of node.value.matchAll(new RegExp(WIKI_LINK_RE.source, 'g'))) {
        const start = match.index;
        if (start > cursor) pieces.push({ type: 'text', value: node.value.slice(cursor, start) });
        pieces.push(termElement(match[1]!, match[2]));
        cursor = start + match[0].length;
      }
      if (pieces.length === 0) return;
      if (cursor < node.value.length) pieces.push({ type: 'text', value: node.value.slice(cursor) });
      parent.children.splice(index, 1, ...(pieces as typeof parent.children));
      return [SKIP, index + pieces.length];
    });
  };
}
