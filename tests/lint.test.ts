import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadRawContent } from '../src/lib/content/fs-loader.ts';
import { lintContent } from '../src/lib/content/lint.ts';

const TOPICS = `- id: physics
  slug: { en: physics, sk: fyzika }
  name: { en: Physics, sk: Fyzika }
  description: { en: Matter and energy., sk: Látka a energia. }
`;
const LABELS = `- id: high-level
  color: sky
  name: { en: Big picture, sk: Celkový obraz }
  description: { en: Intuition first., sk: Najprv intuícia. }
`;
const META = `topics: [physics]
labels: [high-level]
status: published
created: 2026-09-28
updated: 2026-09-28
`;
const frontmatter = (slug: string) =>
  `---\ntitle: Title ${slug}\nslug: ${slug}\nsummary: A short answer that is long enough to pass.\n---\n`;

let root: string;

async function project(files: Record<string, string>) {
  root = await mkdtemp(join(tmpdir(), 'guydeatory-lint-'));
  const all = { 'content/topics.yaml': TOPICS, 'content/labels.yaml': LABELS, 'content/home.yaml': 'featured: []\n', ...files };
  for (const [path, body] of Object.entries(all)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), body);
  }
  return root;
}

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe('loadRawContent', () => {
  it('reads meta, language files (frontmatter + body) and site data with project-relative paths', async () => {
    const dir = await project({
      'content/articles/atom/meta.yaml': META,
      'content/articles/atom/en.mdx': `${frontmatter('atom')}\nBody with [[atom]].\n`,
      'content/articles/atom/sk.mdx': `${frontmatter('atom-sk')}\nTelo.\n`,
    });
    const raw = await loadRawContent(dir);
    expect(raw.metas).toEqual([{ id: 'atom', file: 'content/articles/atom/meta.yaml', data: expect.objectContaining({ status: 'published' }) }]);
    const en = raw.texts.find((t) => t.lang === 'en')!;
    expect(en).toMatchObject({ id: 'atom', entryId: 'atom/en', file: 'content/articles/atom/en.mdx' });
    expect(en.data).toMatchObject({ slug: 'atom' });
    expect(en.body.trim()).toBe('Body with [[atom]].');
    expect(raw.topics.file).toBe('content/topics.yaml');
    expect(Array.isArray(raw.topics.data)).toBe(true);
  });
});

describe('lintContent', () => {
  it('returns no problems for valid content', async () => {
    const dir = await project({
      'content/articles/atom/meta.yaml': META,
      'content/articles/atom/en.mdx': `${frontmatter('atom')}\n<GoDeeper>\n\nDeep.\n\n</GoDeeper>\n`,
      'content/articles/atom/sk.mdx': `${frontmatter('atom-sk')}\nTelo.\n`,
    });
    expect(await lintContent(dir)).toEqual([]);
  });

  it('reports MDX syntax errors with the line number in the file', async () => {
    const dir = await project({
      'content/articles/atom/meta.yaml': META,
      'content/articles/atom/en.mdx': `${frontmatter('atom')}\nFine line.\n\n<GoDeeper>\nUnclosed tag\n`,
      'content/articles/atom/sk.mdx': `${frontmatter('atom-sk')}\nTelo.\n`,
    });
    const problems = await lintContent(dir);
    expect(problems).toHaveLength(1);
    expect(problems[0]!.file).toBe('content/articles/atom/en.mdx');
    // frontmatter is 5 lines, then a blank line; <GoDeeper> is on line 9
    expect(problems[0]!.message).toMatch(/^line 9: /);
  });

  it('reports components that are neither global nor imported', async () => {
    const dir = await project({
      'content/articles/atom/meta.yaml': META,
      'content/articles/atom/en.mdx': `${frontmatter('atom')}\nimport Known from './Known.astro';\n\n<Known />\n\n<Unknwn />\n`,
      'content/articles/atom/sk.mdx': `${frontmatter('atom-sk')}\nTelo.\n`,
    });
    const problems = await lintContent(dir);
    expect(problems).toEqual([{ file: 'content/articles/atom/en.mdx', message: expect.stringMatching(/<Unknwn>.*not a global component.*not imported/) }]);
  });

  it('accepts math with braces (parsed as math, not as MDX expressions)', async () => {
    const dir = await project({
      'content/articles/atom/meta.yaml': META,
      'content/articles/atom/en.mdx': `${frontmatter('atom')}\nAbout $6{,}24 \\cdot 10^{18}$ electrons.\n\n$$\n1\\ \\text{V} = 1\\ \\frac{\\text{J}}{\\text{C}}\n$$\n`,
      'content/articles/atom/sk.mdx': `${frontmatter('atom-sk')}\nTelo.\n`,
    });
    expect(await lintContent(dir)).toEqual([]);
  });

  it('includes catalog validation problems', async () => {
    const dir = await project({
      'content/articles/atom/meta.yaml': META,
      'content/articles/atom/en.mdx': `${frontmatter('atom')}\nSee [[electron]].\n`,
      'content/articles/atom/sk.mdx': `${frontmatter('atom-sk')}\nTelo.\n`,
    });
    const problems = await lintContent(dir);
    expect(problems.map((p) => p.message)).toEqual([expect.stringMatching(/unknown article "electron"/)]);
  });
});
