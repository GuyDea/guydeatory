import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { parse } from 'node-html-parser';
import type { HTMLElement } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import TreeNode from '../src/components/explore/TreeNode.astro';
import { LANG_CODES } from '../src/i18n/languages.ts';
import type { LangCode } from '../src/i18n/languages.ts';
import { buildCatalog } from '../src/lib/content/build-catalog.ts';
import { localized } from '../src/lib/content/queries.ts';
import { topicUrl } from '../src/lib/urls.ts';
import { article, raw } from './fixtures/content.ts';

const { catalog, problems } = buildCatalog(
  raw({
    articles: [
      article('voltage', { meta: { topics: ['electricity'] } }),
      article('atom', { meta: { topics: ['electricity', 'heat'] } }),
      article('ampere', { meta: { topics: ['physics'] } }),
    ],
  }),
  { includeDrafts: false },
);

async function renderTree(lang: LangCode) {
  const container = await AstroContainer.create();
  const html = await container.renderToString(TreeNode, { props: { lang, catalog, topicId: 'science' } });
  return parse(`<ul class="tree">${html}</ul>`);
}

const children = (el: HTMLElement, tag: string) => el.childNodes.filter((n): n is HTMLElement => (n as HTMLElement).tagName === tag.toUpperCase());

describe('Explore tree', () => {
  it('fixture is valid', () => expect(problems).toEqual([]));

  for (const lang of LANG_CODES) {
    describe(lang, () => {
      it('has no link or other control inside a <summary>, which already acts as a button', async () => {
        const tree = await renderTree(lang);
        const summaries = tree.querySelectorAll('summary');
        expect(summaries).toHaveLength(4); // science, physics, electricity, heat
        for (const summary of summaries) {
          expect(summary.querySelectorAll('a, button, input, select, textarea, [tabindex]').map((el) => el.outerHTML)).toEqual([]);
        }
      });

      it('names each topic and its article count in the summary, where the Explore filter updates the count', async () => {
        const tree = await renderTree(lang);
        for (const li of tree.querySelectorAll('li.tree-topic')) {
          const topic = catalog.topics.get(li.getAttribute('data-topic')!)!;
          const summary = children(children(li, 'details')[0]!, 'summary')[0]!;
          expect(summary.text).toContain(localized(topic.name, lang));
          expect(summary.querySelector('[data-count]')?.text).toMatch(/^\d+$/);
        }
      });

      it('keeps every topic page one tap away: a link right after the summary, outside it', async () => {
        const tree = await renderTree(lang);
        for (const li of tree.querySelectorAll('li.tree-topic')) {
          const topic = catalog.topics.get(li.getAttribute('data-topic')!)!;
          const links = children(li, 'a');
          expect(links, topic.id).toHaveLength(1);
          expect(links[0]!.getAttribute('href')).toBe(topicUrl(topic, lang));
          expect(links[0]!.text.trim()).toBe(localized(topic.name, lang)); // its name for screen readers
          const elements = li.childNodes.filter((n): n is HTMLElement => n.nodeType === 1);
          expect(elements.indexOf(links[0]!), topic.id).toBe(elements.indexOf(children(li, 'details')[0]!) + 1);
        }
      });

      it('is fully open without JS: every topic open and every article linked', async () => {
        const tree = await renderTree(lang);
        expect(tree.querySelectorAll('details').every((details) => details.hasAttribute('open'))).toBe(true);
        expect(tree.querySelectorAll('.tree-article a').map((a) => a.getAttribute('href')).sort()).toHaveLength(4); // voltage, atom ×2, ampere
      });
    });
  }
});
