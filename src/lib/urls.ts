import { DEFAULT_LANG, getLanguage } from '../i18n/languages.ts';
import type { LangCode, SectionKey } from '../i18n/languages.ts';
import type { Article, ArticleText, Catalog, Topic } from './content/types.ts';

export const SITE = 'https://theguydea.com';

export function homeUrl(lang: LangCode): string {
  return `/${lang}/`;
}

export function sectionUrl(lang: LangCode, section: SectionKey): string {
  return `/${lang}/${getLanguage(lang).sections[section]}/`;
}

export function articleUrl(article: Article, lang: LangCode): string | null {
  const text = article.texts[lang];
  return text ? `/${lang}/${text.slug}/` : null;
}

export function topicUrl(topic: Topic, lang: LangCode): string | null {
  const slug = topic.slug[lang];
  return slug ? `${sectionUrl(lang, 'topics')}${slug}/` : null;
}

export function absolute(path: string): string {
  return new URL(path, SITE).href;
}

export interface ResolvedLink {
  href: string;
  /** Language of the page the link points to (differs from the page language on fallback). */
  lang: LangCode;
  isFallback: boolean;
  text: ArticleText;
}

/** Where a link to article `targetId` goes from a page in `lang`; falls back to the default language. */
export function resolveArticleLink(catalog: Catalog, targetId: string, lang: LangCode): ResolvedLink | null {
  const target = catalog.articles.get(targetId);
  if (!target) return null;
  for (const candidate of [lang, DEFAULT_LANG]) {
    const text = target.texts[candidate];
    if (text) return { href: `/${candidate}/${text.slug}/`, lang: candidate, isFallback: candidate !== lang, text };
  }
  return null;
}
