import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { parse } from 'node-html-parser';
import { beforeAll, describe, expect, it } from 'vitest';
import ArticleHeader from '../src/components/article/ArticleHeader.astro';
import GoodToKnow from '../src/components/article/GoodToKnow.astro';
import ShortAnswer from '../src/components/article/ShortAnswer.astro';
import { buildCatalog } from '../src/lib/content/build-catalog.ts';
import type { Catalog } from '../src/lib/content/types.ts';
import { article, raw } from './fixtures/content.ts';

/**
 * These components sit inside the article's `data-pagefind-body`, so Pagefind indexes their text
 * unless it is inside a `data-pagefind-ignore` element. Page chrome that repeats on every article
 * ("min read", "The short answer") must not make every article match.
 */
function indexedText(html: string): string {
  const root = parse(html);
  for (const ignored of root.querySelectorAll('[data-pagefind-ignore]')) ignored.remove();
  return root.textContent.replace(/\s+/g, ' ').trim();
}

let container: AstroContainer;
let catalog: Catalog;

beforeAll(async () => {
  container = await AstroContainer.create();
  const content = raw({
    articles: [
      article('ohm', { meta: { labels: ['high-level', 'trivia'], prerequisites: ['volt', 'amp'] }, en: { title: 'What is resistance?' } }),
      article('volt', { en: { title: 'What is voltage?', term: 'voltage' } }),
      article('amp', { meta: { status: 'stub' }, en: { title: 'What is current?', term: 'current' } }),
    ],
  });
  const built = buildCatalog(content, { includeDrafts: false });
  expect(built.problems).toEqual([]);
  catalog = built.catalog;
});

const text = (id: string) => catalog.articles.get(id)!.texts.en!;

describe('page chrome stays out of the search index', () => {
  it('indexes the article title but not the label chips or the reading time', async () => {
    const html = await container.renderToString(ArticleHeader, { props: { lang: 'en', article: catalog.articles.get('ohm')!, text: text('ohm'), catalog } });
    expect(html).toContain('Big picture');
    expect(html).toContain('min read');
    expect(indexedText(html)).toBe('What is resistance?');
  });

  it('indexes a stub article title but not the stub notice', async () => {
    const html = await container.renderToString(ArticleHeader, { props: { lang: 'en', article: catalog.articles.get('amp')!, text: text('amp'), catalog } });
    expect(html).toContain('This is a short version.');
    expect(indexedText(html)).toBe('What is current?');
  });

  it('indexes the short answer but not its "The short answer" tab', async () => {
    const summary = 'Resistance is how hard it is for electric current to get through something.';
    const html = await container.renderToString(ShortAnswer, { props: { lang: 'en', summary } });
    expect(html).toContain('The short answer');
    expect(indexedText(html)).toBe(summary);
    expect(parse(html).querySelector('[data-pagefind-meta="summary"]')!.textContent).toBe(summary);
  });

  it('keeps the whole "Good to know first" line out of the index', async () => {
    const html = await container.renderToString(GoodToKnow, { props: { lang: 'en', ids: ['volt', 'amp'], catalog } });
    expect(html).toContain('Good to know first:');
    expect(html).toContain('voltage');
    expect(indexedText(html)).toBe('');
  });
});
