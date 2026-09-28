import type { Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import { isLang } from '../../i18n/languages.ts';

type JsxElement = MdxJsxFlowElement | MdxJsxTextElement;

const isJsxElement = (node: { type: string }): node is JsxElement =>
  node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';

/**
 * Content files are named after their language (`sk.mdx`). This plugin passes that language to
 * every component used in the file (`<GoDeeper>`, `<Term>`, widgets…) so authors never write `lang=`.
 */
export function remarkInjectLang() {
  return (tree: Root, file: VFile) => {
    const lang = file.stem;
    if (!lang || !isLang(lang)) return;
    visit(tree, isJsxElement, (node: JsxElement) => {
      if (!node.name || !/^[A-Z]/.test(node.name)) return;
      const hasLang = node.attributes.some((a) => a.type === 'mdxJsxAttribute' && a.name === 'lang');
      if (!hasLang) node.attributes.push({ type: 'mdxJsxAttribute', name: 'lang', value: lang });
    });
  };
}
