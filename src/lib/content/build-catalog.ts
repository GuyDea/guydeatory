import { getLanguage, isLang, LANG_CODES, LANGUAGES, REQUIRED_LANGS } from '../../i18n/languages.ts';
import type { LangCode } from '../../i18n/languages.ts';
import { didYouMean, zodProblems } from './problems.ts';
import { articleMetaSchema, articleTextSchema, homeFileSchema, labelsFileSchema, topicsFileSchema } from './schemas.ts';
import type { TopicNode } from './schemas.ts';
import type { Article, ArticleText, Catalog, Label, Problem, RawContent, Topic } from './types.ts';
import { extractWikiLinks, findMalformedWikiLinks, findUnescapedTableLinks, stripCode, WIKI_LINK_RE } from './wiki-links.ts';

export interface BuildOptions {
  /** Drafts are included in dev and excluded from production builds. */
  includeDrafts: boolean;
}

/** Words a reader actually reads: no code, math, JSX tags or ESM lines. */
/** An interactive lab: a component hydrated in the browser (`client:visible` and friends), outside code samples. */
function hasLab(body: string): boolean {
  return /<[A-Z][\w.]*\b[^>]*\sclient:[a-z]+/.test(stripCode(body));
}

/** Words of the main text, which drive the reading time. Go-deeper blocks are optional and start collapsed. */
function countWords(body: string): number {
  const readable = stripCode(body)
    .replace(/<GoDeeper\b[^>]*>[\s\S]*?<\/GoDeeper>/g, '')
    .replace(/^(import|export)\s.*$/gm, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$[^$\n]+\$/g, '')
    .replace(/<\/?[A-Za-z][^>]*>/g, '')
    .replace(WIKI_LINK_RE, (_match, target: string, text?: string) => text ?? target.replace(/-/g, ' '));
  return readable.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

function buildLabels(raw: RawContent, problems: Problem[]): Map<string, Label> {
  const labels = new Map<string, Label>();
  const parsed = labelsFileSchema.safeParse(raw.labels.data);
  if (!parsed.success) {
    problems.push(...zodProblems(raw.labels.file, parsed.error));
    return labels;
  }
  for (const label of parsed.data) {
    if (labels.has(label.id)) {
      problems.push({ file: raw.labels.file, message: `duplicate label id "${label.id}"` });
      continue;
    }
    labels.set(label.id, { id: label.id, color: label.color, name: label.name, description: label.description });
  }
  return labels;
}

function buildTopics(raw: RawContent, problems: Problem[]): { topics: Map<string, Topic>; rootTopics: string[] } {
  const topics = new Map<string, Topic>();
  const rootTopics: string[] = [];
  const parsed = topicsFileSchema.safeParse(raw.topics.data);
  if (!parsed.success) {
    problems.push(...zodProblems(raw.topics.file, parsed.error));
    return { topics, rootTopics };
  }
  const slugOwners = new Map<string, string>(); // `${lang}/${slug}` → topic id
  const file = raw.topics.file;

  const visit = (node: TopicNode, parent: string | null, depth: number): string | undefined => {
    if (topics.has(node.id)) {
      problems.push({ file, message: `duplicate topic id "${node.id}"` });
      return undefined;
    }
    for (const [lang, slug] of Object.entries(node.slug) as [LangCode, string | undefined][]) {
      if (!slug) continue;
      const owner = slugOwners.get(`${lang}/${slug}`);
      if (owner) {
        problems.push({ file, message: `topic "${node.id}": slug "${slug}" (${lang}) is already used by topic "${owner}"` });
      } else {
        slugOwners.set(`${lang}/${slug}`, node.id);
      }
    }
    const topic: Topic = {
      id: node.id,
      parent,
      children: [],
      depth,
      slug: node.slug,
      name: node.name,
      description: node.description,
      ...(node.icon ? { icon: node.icon } : {}),
    };
    topics.set(node.id, topic);
    for (const child of node.children ?? []) {
      const childId = visit(child, node.id, depth + 1);
      if (childId) topic.children.push(childId);
    }
    return node.id;
  };

  for (const node of parsed.data) {
    const id = visit(node, null, 0);
    if (id) rootTopics.push(id);
  }
  return { topics, rootTopics };
}

function buildTexts(raw: RawContent, problems: Problem[]): Map<string, Partial<Record<LangCode, ArticleText>>> {
  const metaIds = new Set(raw.metas.map((m) => m.id));
  const textsByArticle = new Map<string, Partial<Record<LangCode, ArticleText>>>();

  for (const entry of raw.texts) {
    if (!isLang(entry.lang)) {
      problems.push({
        file: entry.file,
        message: `unknown language "${entry.lang}" — configured languages: ${LANG_CODES.join(', ')}`,
      });
      continue;
    }
    if (!metaIds.has(entry.id)) {
      problems.push({ file: entry.file, message: `no meta.yaml next to this file (content/articles/${entry.id}/meta.yaml)` });
      continue;
    }
    if (entry.data === null) continue; // unreadable file, already reported by the loader
    for (const link of findUnescapedTableLinks(entry.body)) {
      problems.push({
        file: entry.file,
        message: `${link} is inside a table, where | separates columns — escape the bar: ${link.replace('|', '\\|')}`,
      });
    }
    for (const malformed of findMalformedWikiLinks(entry.body)) {
      problems.push({
        file: entry.file,
        message: `malformed wiki-link ${malformed} — use [[article-id]] or [[article-id|text]] with a lowercase kebab-case id`,
      });
    }
    const parsed = articleTextSchema.safeParse(entry.data);
    if (!parsed.success) {
      problems.push(...zodProblems(entry.file, parsed.error));
      continue;
    }
    const data = parsed.data;
    const texts = textsByArticle.get(entry.id) ?? {};
    texts[entry.lang] = {
      lang: entry.lang,
      entryId: entry.entryId,
      file: entry.file,
      title: data.title,
      term: data.term ?? data.title,
      slug: data.slug,
      summary: data.summary,
      keywords: data.keywords,
      reviewed: data.reviewed,
      links: extractWikiLinks(entry.body),
      wordCount: countWords(entry.body),
      hasLab: hasLab(entry.body),
      hasTodo: [data.title, data.summary, entry.body].some((part) => /\bTODO\b/.test(part)),
    };
    textsByArticle.set(entry.id, texts);
  }
  return textsByArticle;
}

export function buildCatalog(raw: RawContent, options: BuildOptions): { catalog: Catalog; problems: Problem[] } {
  const problems: Problem[] = [...(raw.loadProblems ?? [])];
  const labels = buildLabels(raw, problems);
  const { topics, rootTopics } = buildTopics(raw, problems);
  const textsByArticle = buildTexts(raw, problems);

  // Language files that exist, valid or not — so a broken file is reported once, not also as "missing".
  const presentLangs = new Set(raw.texts.map((text) => `${text.id}/${text.lang}`));

  // Articles (meta + texts)
  const articles = new Map<string, Article>();
  const draftIds = new Set<string>();
  for (const entry of raw.metas) {
    const parsed = articleMetaSchema.safeParse(entry.data);
    if (!parsed.success) {
      problems.push(...zodProblems(entry.file, parsed.error));
      continue;
    }
    const texts = textsByArticle.get(entry.id) ?? {};
    for (const lang of REQUIRED_LANGS) {
      if (!presentLangs.has(`${entry.id}/${lang}`)) {
        problems.push({ file: entry.file, message: `missing ${getLanguage(lang).name} translation (${lang}.mdx)` });
      }
    }
    if (parsed.data.status === 'draft' && !options.includeDrafts) {
      draftIds.add(entry.id);
      continue;
    }
    articles.set(entry.id, { id: entry.id, metaFile: entry.file, ...parsed.data, texts });
  }

  // Cross-references
  const articleIds = [...articles.keys()];
  const unknownArticle = (id: string) =>
    draftIds.has(id) ? `"${id}", which is a draft (drafts are not published)` : `unknown article "${id}"${didYouMean(id, articleIds)}`;

  for (const article of articles.values()) {
    const file = article.metaFile;
    for (const topic of article.topics) {
      if (!topics.has(topic)) problems.push({ file, message: `unknown topic "${topic}"${didYouMean(topic, topics.keys())}` });
    }
    for (const label of article.labels) {
      if (!labels.has(label)) problems.push({ file, message: `unknown label "${label}"${didYouMean(label, labels.keys())}` });
    }
    for (const field of ['prerequisites', 'related'] as const) {
      for (const id of article[field]) {
        if (id === article.id) problems.push({ file, message: `${field}: lists the article itself` });
        else if (!articles.has(id)) problems.push({ file, message: `${field}: ${unknownArticle(id)}` });
      }
    }
    for (const text of Object.values(article.texts)) {
      if (text.hasTodo && article.status !== 'draft') {
        problems.push({ file: text.file, message: 'contains a TODO placeholder — finish it or set status: draft' });
      }
      for (const link of text.links) {
        if (articles.has(link.target)) continue;
        const written = `[[${link.target}${link.text === undefined ? '' : `|${link.text}`}]]`;
        problems.push({ file: text.file, message: `${written} links to ${unknownArticle(link.target)}` });
      }
    }
  }

  // Slugs: unique per language and not a reserved section name
  for (const language of LANGUAGES) {
    const reserved = new Set<string>(Object.values(language.sections));
    const owners = new Map<string, string>(); // slug → file
    for (const article of articles.values()) {
      const text = article.texts[language.code];
      if (!text) continue;
      if (reserved.has(text.slug)) {
        problems.push({ file: text.file, message: `slug "${text.slug}" is reserved for a site section in ${language.code}` });
        continue;
      }
      const owner = owners.get(text.slug);
      if (owner) problems.push({ file: text.file, message: `slug "${text.slug}" is already used by ${owner}` });
      else owners.set(text.slug, text.file);
    }
  }

  // Home curation
  let featured: string[] = [];
  const home = homeFileSchema.safeParse(raw.home.data);
  if (!home.success) {
    problems.push(...zodProblems(raw.home.file, home.error));
  } else {
    featured = home.data.featured.filter((id) => {
      if (articles.has(id)) return true;
      problems.push({ file: raw.home.file, message: `featured: ${unknownArticle(id)}` });
      return false;
    });
  }

  // Backlinks
  const backlinkSets = new Map<string, Set<string>>();
  for (const article of articles.values()) {
    for (const text of Object.values(article.texts)) {
      for (const { target } of text.links) {
        if (!articles.has(target) || target === article.id) continue;
        const sources = backlinkSets.get(target) ?? new Set<string>();
        sources.add(article.id);
        backlinkSets.set(target, sources);
      }
    }
  }
  const backlinks = new Map([...backlinkSets].map(([target, sources]) => [target, [...sources].sort()]));

  return { catalog: { articles, topics, rootTopics, labels, featured, backlinks }, problems };
}
