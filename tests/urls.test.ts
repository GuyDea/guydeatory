import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../src/lib/content/build-catalog.ts';
import { absolute, articleUrl, homeUrl, resolveArticleLink, sectionUrl, topicUrl } from '../src/lib/urls.ts';
import { article, raw } from './fixtures/content.ts';

function catalogWith(...ids: string[]) {
  const { catalog, problems } = buildCatalog(raw({ articles: ids.map((id) => article(id)) }), { includeDrafts: false });
  expect(problems).toEqual([]);
  return catalog;
}

describe('URL builders', () => {
  it('builds language homes and localized section URLs', () => {
    expect(homeUrl('sk')).toBe('/sk/');
    expect(sectionUrl('sk', 'explore')).toBe('/sk/objavuj/');
    expect(sectionUrl('en', 'search')).toBe('/en/search/');
    expect(sectionUrl('sk', 'about')).toBe('/sk/o-projekte/');
  });

  it('builds article URLs from the localized slug', () => {
    const catalog = catalogWith('voltage');
    const voltage = catalog.articles.get('voltage')!;
    expect(articleUrl(voltage, 'en')).toBe('/en/voltage/');
    expect(articleUrl(voltage, 'sk')).toBe('/sk/voltage-sk/');
  });

  it('returns null for an article without that language', () => {
    const catalog = catalogWith('voltage');
    const voltage = catalog.articles.get('voltage')!;
    delete voltage.texts.sk;
    expect(articleUrl(voltage, 'sk')).toBeNull();
  });

  it('builds topic URLs under the localized topics section', () => {
    const catalog = catalogWith();
    expect(topicUrl(catalog.topics.get('electricity')!, 'sk')).toBe('/sk/temy/elektrina/');
    expect(topicUrl(catalog.topics.get('physics')!, 'en')).toBe('/en/topics/physics/');
  });

  it('makes absolute URLs on the production origin', () => {
    expect(absolute('/sk/')).toBe('https://theguydea.com/sk/');
  });
});

describe('resolveArticleLink', () => {
  it('resolves a target in the page language', () => {
    const catalog = catalogWith('voltage');
    const link = resolveArticleLink(catalog, 'voltage', 'sk');
    expect(link).toMatchObject({ href: '/sk/voltage-sk/', lang: 'sk', isFallback: false });
    expect(link?.text.lang).toBe('sk');
  });

  it('falls back to the default language when the target is not translated', () => {
    const catalog = catalogWith('voltage');
    delete catalog.articles.get('voltage')!.texts.sk;
    expect(resolveArticleLink(catalog, 'voltage', 'sk')).toMatchObject({ href: '/en/voltage/', lang: 'en', isFallback: true });
  });

  it('returns null for an unknown article', () => {
    expect(resolveArticleLink(catalogWith('voltage'), 'nope', 'en')).toBeNull();
  });
});
