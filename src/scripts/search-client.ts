/**
 * Thin wrapper around Pagefind's browser API. Pagefind is loaded lazily, the first time
 * someone searches; the index for the page language is picked by Pagefind from <html lang>.
 * Debouncing and dropping outdated answers happen in search-flow.ts.
 */
interface PagefindResultData {
  url: string;
  excerpt: string;
  meta: { title?: string; summary?: string };
  filters: Record<string, string[]>;
}
interface PagefindResult {
  data(): Promise<PagefindResultData>;
}
interface PagefindSearch {
  results: PagefindResult[];
}
type Filters = Record<string, { any: string[] } | string>;
export interface Pagefind {
  options(options: Record<string, unknown>): Promise<void>;
  init(): Promise<void> | void;
  search(query: string | null, options?: { filters?: Filters }): Promise<PagefindSearch>;
}

export interface SearchHit {
  url: string;
  title: string;
  summary: string;
  labels: string[];
}

export interface SearchOutcome {
  total: number;
  hits: SearchHit[];
}

/**
 * Shares one load between everyone who asks. A failed load is not kept: callers get null, and
 * the next call tries again. `load` gets the attempt number, counting from 0.
 */
export function createLoader<T>(load: (attempt: number) => Promise<T>): () => Promise<T | null> {
  let loading: Promise<T | null> | undefined;
  let attempts = 0;
  return () => {
    loading ??= load(attempts++).catch(() => {
      loading = undefined;
      return null;
    });
    return loading;
  };
}

/**
 * Browsers remember a failed import() of a URL for the life of the page, so every retry asks for
 * a new URL. Pagefind finds its other files from its own URL and allows a query string after it.
 */
export function pagefindUrl(attempt: number): string {
  return attempt === 0 ? '/pagefind/pagefind.js' : `/pagefind/pagefind.js?retry=${attempt}`;
}

/** Pagefind, or null when it cannot load: not built yet (astro dev) or offline. */
export const loadPagefind = createLoader(async (attempt): Promise<Pagefind> => {
  const url = pagefindUrl(attempt);
  const pagefind = (await import(/* @vite-ignore */ url)) as Pagefind;
  await pagefind.options({ excerptLength: 24 });
  await pagefind.init();
  return pagefind;
});

/**
 * Runs a search. Returns 'unavailable' when Pagefind cannot load or the search fails, otherwise
 * the total count and the first `limit` hits. An empty query lists everything the filters allow.
 */
export async function runSearch(
  query: string,
  { labels = [], topic = '', limit = 10 }: { labels?: string[]; topic?: string; limit?: number } = {},
  load: () => Promise<Pagefind | null> = loadPagefind,
): Promise<SearchOutcome | 'unavailable'> {
  const pagefind = await load();
  if (!pagefind) return 'unavailable';
  const filters: Filters = {};
  if (labels.length) filters.label = { any: labels };
  if (topic) filters.topic = topic;
  const term = query.trim() === '' ? null : query.trim();
  try {
    const search = await pagefind.search(term, { filters });
    const data = await Promise.all(search.results.slice(0, limit).map((result) => result.data()));
    return {
      total: search.results.length,
      hits: data.map((d) => ({
        url: d.url,
        title: d.meta.title ?? d.url,
        summary: d.meta.summary ?? '',
        labels: d.filters.label ?? [],
      })),
    };
  } catch {
    return 'unavailable';
  }
}
