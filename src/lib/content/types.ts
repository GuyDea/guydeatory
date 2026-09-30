import type { LangCode } from '../../i18n/languages.ts';
import type { WikiLink } from './wiki-links.ts';

export type Status = 'published' | 'stub' | 'draft';
export type Localized = Partial<Record<LangCode, string>>;

/** One language version of an article. */
export interface ArticleText {
  lang: LangCode;
  /** Id of the entry in the `articleTexts` Astro collection: `<article-id>/<lang>`. */
  entryId: string;
  /** Path relative to the project root, used in error messages. */
  file: string;
  title: string;
  /** Short name used as link text and in lists. Defaults to `title`. */
  term: string;
  slug: string;
  summary: string;
  keywords: string[];
  reviewed: boolean;
  links: WikiLink[];
  wordCount: number;
  /** The text embeds at least one interactive widget. */
  hasLab: boolean;
  /** Title, summary or body still contains a TODO placeholder (allowed only in drafts). */
  hasTodo: boolean;
}

export interface Source {
  title: string;
  url: string;
}

export interface Article {
  id: string;
  metaFile: string;
  topics: string[];
  labels: string[];
  prerequisites: string[];
  related: string[];
  status: Status;
  created: Date;
  updated: Date;
  sources: Source[];
  texts: Partial<Record<LangCode, ArticleText>>;
}

export interface Topic {
  id: string;
  parent: string | null;
  children: string[];
  depth: number;
  icon?: string;
  slug: Localized;
  name: Localized;
  description: Localized;
}

export interface Label {
  id: string;
  color: string;
  name: Localized;
  description: Localized;
}

export interface Catalog {
  articles: Map<string, Article>;
  /** All topics, flattened depth-first in file order. */
  topics: Map<string, Topic>;
  rootTopics: string[];
  /** Labels in file order (the order used everywhere in the UI). */
  labels: Map<string, Label>;
  featured: string[];
  /** target article id → ids of articles linking to it (sorted). */
  backlinks: Map<string, string[]>;
}

export interface Problem {
  file: string;
  message: string;
}

/** Content as read from disk, before validation. Produced by the fs loader or test fixtures. */
export interface RawContent {
  metas: { id: string; file: string; data: unknown }[];
  texts: { id: string; lang: string; entryId: string; file: string; data: unknown; body: string }[];
  topics: { file: string; data: unknown };
  labels: { file: string; data: unknown };
  home: { file: string; data: unknown };
  /** Syntax errors found while reading files (reported before validation problems). */
  loadProblems?: Problem[];
}
