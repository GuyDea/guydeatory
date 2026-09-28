import { DEFAULT_LANG, LANG_CODES } from '../../i18n/languages.ts';
import type { LangCode } from '../../i18n/languages.ts';
import type { Article, ArticleText, Catalog, Localized, Topic } from './types.ts';

export const WORDS_PER_MINUTE = 150;

export function getText(article: Article, lang: LangCode): ArticleText | undefined {
  return article.texts[lang];
}

export function articleLangs(article: Article): LangCode[] {
  return LANG_CODES.filter((lang) => article.texts[lang]);
}

/** A localized value, falling back to the default language. */
export function localized(value: Localized, lang: LangCode): string {
  return value[lang] ?? value[DEFAULT_LANG] ?? '';
}

/** Topics from the root down to (and including) `topicId`. */
export function topicAncestry(catalog: Catalog, topicId: string): Topic[] {
  const path: Topic[] = [];
  for (let topic = catalog.topics.get(topicId); topic; topic = topic.parent ? catalog.topics.get(topic.parent) : undefined) {
    path.unshift(topic);
  }
  return path;
}

function subtreeIds(catalog: Catalog, topicId: string): Set<string> {
  const ids = new Set<string>();
  const stack = [topicId];
  while (stack.length) {
    const id = stack.pop()!;
    ids.add(id);
    stack.push(...(catalog.topics.get(id)?.children ?? []));
  }
  return ids;
}

/** Articles available in `lang` filed under the topic (and, if recursive, its subtopics), sorted by term. */
export function articlesInTopic(catalog: Catalog, topicId: string, lang: LangCode, recursive: boolean): Article[] {
  const topicIds = recursive ? subtreeIds(catalog, topicId) : new Set([topicId]);
  const collator = new Intl.Collator(lang);
  return [...catalog.articles.values()]
    .filter((article) => article.texts[lang] && article.topics.some((t) => topicIds.has(t)))
    .sort((a, b) => collator.compare(a.texts[lang]!.term, b.texts[lang]!.term));
}

export function topicArticleCount(catalog: Catalog, topicId: string, lang: LangCode): number {
  return articlesInTopic(catalog, topicId, lang, true).length;
}

export function topicHasContent(catalog: Catalog, topicId: string, lang: LangCode): boolean {
  return topicArticleCount(catalog, topicId, lang) > 0;
}

export function readingMinutes(text: ArticleText): number {
  return Math.max(1, Math.ceil(text.wordCount / WORDS_PER_MINUTE));
}
