import { evaluate } from '@mdx-js/mdx';
import type { Root as HastRoot, Element } from 'hast';
import { VFile } from 'vfile';
import { describe, expect, it } from 'vitest';
import { rehypePagefindIgnoreMath } from '../src/lib/markdown/rehype-pagefind-ignore-math.ts';
import { remarkInjectLang } from '../src/lib/markdown/remark-inject-lang.ts';
import { remarkWikiLinks } from '../src/lib/markdown/remark-wiki-links.ts';

/** Minimal JSX runtime: renders MDX to a plain tree so we can inspect component props. */
interface VNode {
  type: unknown;
  props: Record<string, unknown> & { children?: unknown };
}
const Fragment = Symbol('Fragment');
const jsx = (type: unknown, props: VNode['props']): VNode => ({ type, props });
const runtime = { Fragment, jsx, jsxs: jsx };

/** Renders `mdx` as if it were the file at `path`, returning every component call as { name, props }. */
async function render(mdx: string, path = '/project/content/articles/voltage/sk.mdx') {
  const file = new VFile({ path, value: mdx });
  const { default: Content } = await evaluate(file, {
    ...runtime,
    remarkPlugins: [remarkWikiLinks, remarkInjectLang],
  });
  const calls: { name: string; props: Record<string, unknown> }[] = [];
  const component = (name: string) => (props: Record<string, unknown>) => {
    calls.push({ name, props });
    return null;
  };
  const tree = Content({ components: { Term: component('Term'), GoDeeper: component('GoDeeper'), Widget: component('Widget') } }) as VNode;
  // Walk the tree so that nested component functions are invoked.
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const vnode = node as VNode;
    if (typeof vnode.type === 'function') return walk((vnode.type as (p: unknown) => unknown)(vnode.props));
    walk(vnode.props?.children);
  };
  walk(tree);
  return { calls, tree };
}

const textOf = (children: unknown): string => (Array.isArray(children) ? children.join('') : String(children ?? ''));

describe('remarkWikiLinks', () => {
  it('turns [[id]] into a Term with that id and no children', async () => {
    const { calls } = await render('Atoms have [[electron]]s inside.');
    expect(calls).toEqual([{ name: 'Term', props: { id: 'electron', lang: 'sk' } }]);
  });

  it('turns [[id|text]] into a Term whose children are the custom Unicode text', async () => {
    const { calls } = await render('Poháňa ho [[voltage|napätím]], nie tlakom.');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.props.id).toBe('voltage');
    expect(textOf(calls[0]!.props.children)).toBe('napätím');
  });

  it('turns a link whose text wraps onto the next line into one Term with single-spaced text', async () => {
    const { calls } = await render('Pravidlo, že [[conservation-of-energy|energia nikdy nevznikne\nz ničoho]] platí.');
    expect(calls.map((c) => [c.props.id, textOf(c.props.children)])).toEqual([['conservation-of-energy', 'energia nikdy nevznikne z ničoho']]);
  });

  it('handles several links in one paragraph and inside emphasis', async () => {
    const { calls } = await render('An [[atom]] has *[[electron|electrons]]* and a [[nucleus]].');
    expect(calls.map((c) => c.props.id)).toEqual(['atom', 'electron', 'nucleus']);
  });

  it('leaves code untouched', async () => {
    const { calls } = await render('Write `[[atom]]` in text.\n\n```md\n[[electron]]\n```');
    expect(calls).toEqual([]);
  });
});

describe('remarkInjectLang', () => {
  it('adds the file language to capitalized components', async () => {
    const { calls } = await render('<GoDeeper>\n\nDeep.\n\n</GoDeeper>\n\n<Widget client:visible />');
    expect(calls.map((c) => [c.name, c.props.lang])).toEqual([
      ['GoDeeper', 'sk'],
      ['Widget', 'sk'],
    ]);
  });

  it('keeps an explicit lang attribute', async () => {
    const { calls } = await render('<Widget lang="en" />');
    expect(calls[0]!.props.lang).toBe('en');
  });

  it('does nothing for files not named after a language', async () => {
    const { calls } = await render('<Widget />', '/project/content/pages/about/index.mdx');
    expect(calls[0]!.props.lang).toBeUndefined();
  });
});

describe('rehypePagefindIgnoreMath', () => {
  it('marks KaTeX output so search does not index formula glyphs', () => {
    const katex: Element = { type: 'element', tagName: 'span', properties: { className: ['katex'] }, children: [] };
    const plain: Element = { type: 'element', tagName: 'span', properties: { className: ['note'] }, children: [] };
    const tree: HastRoot = { type: 'root', children: [katex, plain] };
    rehypePagefindIgnoreMath()(tree);
    expect(katex.properties.dataPagefindIgnore).toBe('');
    expect(plain.properties.dataPagefindIgnore).toBeUndefined();
  });
});
