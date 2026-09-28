import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../src/lib/content/build-catalog.ts';
import {
  articleLangs,
  articlesInTopic,
  getText,
  localized,
  readingMinutes,
  topicAncestry,
  topicArticleCount,
  topicHasContent,
} from '../src/lib/content/queries.ts';
import type { ArticleText } from '../src/lib/content/types.ts';
import { article, raw } from './fixtures/content.ts';

const { catalog, problems } = buildCatalog(
  raw({
    articles: [
      article('voltage', { meta: { topics: ['electricity'] }, en: { term: 'voltage' }, sk: { term: 'napätie' } }),
      article('atom', { meta: { topics: ['electricity', 'heat'] }, en: { term: 'atom' }, sk: { term: 'atóm' } }),
      article('heat', { meta: { topics: ['heat'] }, en: { term: 'heat' }, sk: { term: 'teplo' } }),
      article('ampere', { meta: { topics: ['physics'] }, en: { term: 'ampere' }, sk: { term: 'ampér' } }),
    ],
  }),
  { includeDrafts: false },
);

describe('catalog queries', () => {
  it('fixture is valid', () => expect(problems).toEqual([]));

  it('gets a text and lists available languages in config order', () => {
    const voltage = catalog.articles.get('voltage')!;
    expect(getText(voltage, 'sk')?.term).toBe('napätie');
    expect(articleLangs(voltage)).toEqual(['en', 'sk']);
  });

  it('returns the ancestry from root to topic', () => {
    expect(topicAncestry(catalog, 'electricity').map((t) => t.id)).toEqual(['science', 'physics', 'electricity']);
    expect(topicAncestry(catalog, 'science').map((t) => t.id)).toEqual(['science']);
  });

  it('lists direct articles of a topic, sorted by term in that language', () => {
    expect(articlesInTopic(catalog, 'electricity', 'sk', false).map((a) => a.id)).toEqual(['atom', 'voltage']);
    expect(articlesInTopic(catalog, 'physics', 'en', false).map((a) => a.id)).toEqual(['ampere']);
  });

  it('lists articles of a whole subtree once each', () => {
    expect(articlesInTopic(catalog, 'physics', 'en', true).map((a) => a.id)).toEqual(['ampere', 'atom', 'heat', 'voltage']);
  });

  it('counts subtree articles without double-counting multi-topic articles', () => {
    expect(topicArticleCount(catalog, 'science', 'en')).toBe(4);
    expect(topicArticleCount(catalog, 'heat', 'en')).toBe(2);
  });

  it('knows which topics have content', () => {
    expect(topicHasContent(catalog, 'science', 'en')).toBe(true);
    expect(topicHasContent(catalog, 'technology', 'en')).toBe(false);
  });

  it('only counts articles available in the requested language', () => {
    const ampere = catalog.articles.get('ampere')!;
    const saved = ampere.texts.sk;
    delete ampere.texts.sk;
    expect(topicArticleCount(catalog, 'physics', 'sk')).toBe(3);
    ampere.texts.sk = saved;
  });

  it('picks a localized value with fallback to the default language', () => {
    expect(localized({ en: 'Heat', sk: 'Teplo' }, 'sk')).toBe('Teplo');
    expect(localized({ en: 'Heat' }, 'sk')).toBe('Heat');
  });

  it('estimates reading minutes at 150 words per minute, at least 1', () => {
    const minutes = (wordCount: number) => readingMinutes({ wordCount } as ArticleText);
    expect(minutes(0)).toBe(1);
    expect(minutes(150)).toBe(1);
    expect(minutes(151)).toBe(2);
    expect(minutes(600)).toBe(4);
  });
});
