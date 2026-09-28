import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildCatalog } from '../src/lib/content/build-catalog.ts';
import { loadRawContent } from '../src/lib/content/fs-loader.ts';
import { scaffoldArticle } from '../src/lib/scaffold.ts';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'guydeatory-scaffold-'));
  await mkdir(join(root, 'content'), { recursive: true });
  await writeFile(
    join(root, 'content/topics.yaml'),
    '- id: home-technology\n  slug: { en: home, sk: domov }\n  name: { en: Home, sk: Domov }\n  description: { en: Home things., sk: Domáce veci. }\n',
  );
  await writeFile(
    join(root, 'content/labels.yaml'),
    '- id: high-level\n  color: sky\n  name: { en: Big picture, sk: Celkový obraz }\n  description: { en: Intuition first., sk: Najprv intuícia. }\n',
  );
  await writeFile(join(root, 'content/home.yaml'), 'featured: []\n');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('scaffoldArticle', () => {
  it('creates meta.yaml and one file per language that form a valid draft', async () => {
    const created = await scaffoldArticle(root, 'heat-pump', { topic: 'home-technology', label: 'high-level', today: '2026-09-29' });
    expect(created).toEqual(['content/articles/heat-pump/meta.yaml', 'content/articles/heat-pump/en.mdx', 'content/articles/heat-pump/sk.mdx']);

    const { catalog, problems } = buildCatalog(await loadRawContent(root), { includeDrafts: true });
    expect(problems).toEqual([]);
    const article = catalog.articles.get('heat-pump')!;
    expect(article).toMatchObject({ status: 'draft', topics: ['home-technology'], labels: ['high-level'] });
    expect(article.texts.en).toMatchObject({ slug: 'heat-pump', term: 'heat pump' });
  });

  it('produces a draft that cannot be published while placeholders remain', async () => {
    await scaffoldArticle(root, 'heat-pump', { topic: 'home-technology', label: 'high-level', today: '2026-09-29' });
    const metaPath = join(root, 'content/articles/heat-pump/meta.yaml');
    await writeFile(metaPath, (await readFile(metaPath, 'utf8')).replace('status: draft', 'status: published'));
    const { problems } = buildCatalog(await loadRawContent(root), { includeDrafts: false });
    expect(problems.map((p) => p.file)).toEqual(['content/articles/heat-pump/en.mdx', 'content/articles/heat-pump/sk.mdx']);
  });

  it('rejects ids that are not lowercase kebab-case', async () => {
    await expect(scaffoldArticle(root, 'Heat Pump', { topic: 'home-technology', label: 'high-level' })).rejects.toThrow(/kebab-case/);
  });

  it('refuses to overwrite an existing article', async () => {
    await scaffoldArticle(root, 'heat-pump', { topic: 'home-technology', label: 'high-level' });
    await expect(scaffoldArticle(root, 'heat-pump', { topic: 'home-technology', label: 'high-level' })).rejects.toThrow(/already exists/);
  });
});
