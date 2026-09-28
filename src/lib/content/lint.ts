import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compile } from '@mdx-js/mdx';
import type { Root } from 'mdast';
import type { MdxjsEsm } from 'mdast-util-mdxjs-esm';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import rehypeKatex from 'rehype-katex';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { VFile } from 'vfile';
import { remarkInjectLang } from '../markdown/remark-inject-lang.ts';
import { remarkWikiLinks } from '../markdown/remark-wiki-links.ts';
import { buildCatalog } from './build-catalog.ts';
import { GLOBAL_COMPONENTS } from './components.ts';
import { loadRawContent } from './fs-loader.ts';
import type { Problem } from './types.ts';

const at = (line: number | undefined, message: string) => (line ? `line ${line}: ${message}` : message);

/** Names bound by `import …` / `export const …` statements in the MDX file. */
function boundNames(tree: Root): Set<string> {
  const names = new Set<string>();
  visit(tree, 'mdxjsEsm', (node: MdxjsEsm) => {
    for (const statement of node.data?.estree?.body ?? []) {
      if (statement.type === 'ImportDeclaration') {
        for (const specifier of statement.specifiers) names.add(specifier.local.name);
      } else if (statement.type === 'ExportNamedDeclaration' && statement.declaration?.type === 'VariableDeclaration') {
        for (const declarator of statement.declaration.declarations) {
          if (declarator.id.type === 'Identifier') names.add(declarator.id.name);
        }
      }
    }
  });
  return names;
}

function unknownComponents(file: string, source: string): Problem[] {
  // Same syntax extensions as the real pipeline, so math like $6{,}24$ is not read as an MDX expression.
  const tree = unified().use(remarkParse).use(remarkMdx).use(remarkFrontmatter).use(remarkMath).parse(source) as Root;
  const known = new Set<string>([...GLOBAL_COMPONENTS, ...boundNames(tree)]);
  const problems: Problem[] = [];
  const isJsx = (node: { type: string }): node is MdxJsxFlowElement | MdxJsxTextElement =>
    node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
  visit(tree, isJsx, (node: MdxJsxFlowElement | MdxJsxTextElement) => {
    const root = node.name?.split('.')[0];
    if (!root || !/^[A-Z]/.test(root) || known.has(root)) return;
    problems.push({
      file,
      message: at(node.position?.start.line, `<${node.name}> is not a global component and is not imported in this file`),
    });
  });
  return problems;
}

/** Compiles one MDX file exactly like the site does, reporting syntax errors and plugin warnings. */
async function lintMdx(root: string, file: string): Promise<Problem[]> {
  const source = await readFile(join(root, file), 'utf8');
  const vfile = new VFile({ path: join(root, file), value: source });
  try {
    await compile(vfile, {
      remarkPlugins: [remarkFrontmatter, remarkMath, remarkWikiLinks, remarkInjectLang],
      rehypePlugins: [rehypeKatex],
    });
  } catch (error) {
    const { line, place, reason, message } = error as {
      line?: number;
      place?: { line?: number; start?: { line?: number } };
      reason?: string;
      message: string;
    };
    const text = reason ?? message;
    // Some MDX errors only carry their position inside the reason, e.g. "… (9:1-9:11)".
    const embedded = /\((\d+):\d+(?:-\d+:\d+)?\)/.exec(text)?.[1];
    return [{ file, message: at(line ?? place?.start?.line ?? place?.line ?? (embedded ? Number(embedded) : undefined), text) }];
  }
  const warnings = vfile.messages.map((m) => ({ file, message: at(m.line ?? undefined, m.reason) }));
  try {
    return [...warnings, ...unknownComponents(file, source)];
  } catch (error) {
    return [...warnings, { file, message: `could not scan components: ${(error as Error).message}` }];
  }
}

/**
 * Everything the production build would reject, without building:
 * catalog validation (production rules) + MDX compilation of every language file.
 */
export async function lintContent(root: string): Promise<Problem[]> {
  const raw = await loadRawContent(root);
  const { problems } = buildCatalog(raw, { includeDrafts: false });
  for (const text of raw.texts) problems.push(...(await lintMdx(root, text.file)));
  return problems;
}
