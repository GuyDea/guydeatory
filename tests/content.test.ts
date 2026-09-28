import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../src/lib/content/build-catalog.ts';
import { loadRawContent } from '../src/lib/content/fs-loader.ts';
import { formatProblems } from '../src/lib/content/problems.ts';

describe('the real content in content/', () => {
  it('passes every validation rule (production rules: drafts excluded)', async () => {
    const raw = await loadRawContent(process.cwd());
    const { catalog, problems } = buildCatalog(raw, { includeDrafts: false });
    expect(problems, formatProblems(problems)).toEqual([]);
    expect(catalog.articles.size).toBeGreaterThan(0);
  });
});
