import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it, vi } from 'vitest';
import SearchData from '../src/components/search/SearchData.astro';
import BaseLayout from '../src/layouts/BaseLayout.astro';
import type { Catalog } from '../src/lib/content/types.ts';

// A label name that would end the <script> early if it were inserted raw.
const HOSTILE = '</script><script>alert(1)</script><!--';

vi.mock('../src/lib/content/catalog.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/lib/content/catalog.ts')>();
  return {
    ...original,
    getCatalog: async (): Promise<Catalog> => {
      const catalog = await original.getCatalog();
      const labels = new Map(catalog.labels);
      const [id, label] = [...labels.entries()][0]!;
      labels.set(id, { ...label, name: { ...label.name, en: HOSTILE } });
      return { ...catalog, labels };
    },
  };
});

/** The text inside every <script type="application/…json"> in the page. */
function jsonScripts(html: string): string[] {
  return [...html.matchAll(/<script type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
}

describe('JSON inside <script> tags', () => {
  it('escapes JSON-LD in the page head', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BaseLayout, {
      props: { lang: 'en', title: 'T', description: 'D', canonical: '/en/', alternates: [], jsonLd: [{ '@type': 'Thing', name: HOSTILE }] },
    });
    const scripts = jsonScripts(html);
    expect(scripts.length).toBeGreaterThan(0);
    for (const json of scripts) expect(json).not.toMatch(/[<>&]/);
    expect(scripts.map((json) => JSON.parse(json))).toContainEqual({ '@type': 'Thing', name: HOSTILE });
  });

  it('escapes the search data', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SearchData, { props: { lang: 'en' } });
    const [json] = jsonScripts(html);
    expect(json).toBeDefined();
    expect(json).not.toMatch(/[<>&]/);
    const data = JSON.parse(json!) as { labels: Record<string, { name: string }> };
    expect(Object.values(data.labels).map((l) => l.name)).toContain(HOSTILE);
  });
});
