import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import LabBadge from '../src/components/lists/LabBadge.astro';
import ExploreView from '../src/views/ExploreView.astro';
import SearchView from '../src/views/SearchView.astro';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** Every CSS rule's selector and body in a stylesheet (or a component's <style> blocks). */
const rules = (css: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector!.trim(), body: body! }));

describe('the lab badge and the flask icon', () => {
  // Astro ships a component's styles only on pages that render it, and the search dialog draws the
  // badge on every page. search.css comes with the dialog (and with the search page, which has none).
  it('are styled in search.css, which every page loads with the search dialog', () => {
    expect(source('src/components/search/SearchDialog.astro')).toContain("import '@styles/search.css';");
    expect(source('src/views/SearchView.astro')).toContain("import '@styles/search.css';");
    const css = rules(source('src/styles/search.css'));
    expect(css.map((rule) => rule.selector)).toEqual(expect.arrayContaining(['.lab-icon', '.lab-badge', '.lab-badge.compact']));
    expect(css.find((rule) => rule.selector === '.lab-icon')!.body).toMatch(/stroke:\s*currentColor/);
  });

  it('keeps no styles of their own in the components', () => {
    expect(source('src/components/lists/LabBadge.astro')).not.toMatch(/<style/);
    const icons = ['src/styles/search.css', 'src/views/ExploreView.astro', 'src/views/SearchView.astro', 'src/components/lists/LabBadge.astro']
      .flatMap((file) => rules(source(file)).map((rule) => `${file}: ${rule.selector}`))
      .filter((rule) => /lab[\w-]*\s+svg/.test(rule));
    expect(icons).toEqual([]);
  });

  it('draw the flask with the shared class wherever it appears', async () => {
    const container = await AstroContainer.create();
    const badge = parse(await container.renderToString(LabBadge, { props: { lang: 'en' } }));
    expect(badge.querySelector('.lab-badge svg')?.classList.contains('lab-icon')).toBe(true);
    const explore = parse(await container.renderToString(ExploreView, { props: { lang: 'en' } }));
    expect(explore.querySelector('[data-lab-chip] svg')?.classList.contains('lab-icon')).toBe(true);
    const search = parse(await container.renderToString(SearchView, { props: { lang: 'en' } }));
    expect(search.querySelector('[data-search-lab] svg')?.classList.contains('lab-icon')).toBe(true);
  });
});
