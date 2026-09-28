import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

/** KaTeX output (glyph spans + TeX annotations) is noise in search results; keep it out of the index. */
export function rehypePagefindIgnoreMath() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const classes = node.properties.className;
      if (Array.isArray(classes) && (classes.includes('katex') || classes.includes('katex-display'))) {
        node.properties.dataPagefindIgnore = '';
      }
    });
  };
}
