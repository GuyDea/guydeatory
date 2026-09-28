/**
 * Thin wrapper around Pagefind's browser API. Pagefind is loaded lazily, the first time
 * someone searches; the index for the page language is picked by Pagefind from <html lang>.
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
interface Pagefind {
  options(options: Record<string, unknown>): Promise<void>;
  init(): Promise<void> | void;
  search(query: string | null, options?: { filters?: Filters }): Promise<PagefindSearch>;
  debouncedSearch(query: string | null, options?: { filters?: Filters }, ms?: number): Promise<PagefindSearch | null>;
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

let loading: Promise<Pagefind | null> | undefined;

export function loadPagefind(): Promise<Pagefind | null> {
  loading ??= (async () => {
    try {
      const url = '/pagefind/pagefind.js';
      const pagefind = (await import(/* @vite-ignore */ url)) as Pagefind;
      await pagefind.options({ excerptLength: 24 });
      await pagefind.init();
      return pagefind;
    } catch {
      return null; // not built yet (astro dev) or offline
    }
  })();
  return loading;
}

/**
 * Runs a search. Returns 'unavailable' when Pagefind cannot load, null when a newer
 * debounced search superseded this one, otherwise the total count and the first `limit` hits.
 */
export async function runSearch(
  query: string,
  { labels = [], topic = '', limit = 10, debounce = true }: { labels?: string[]; topic?: string; limit?: number; debounce?: boolean } = {},
): Promise<SearchOutcome | null | 'unavailable'> {
  const pagefind = await loadPagefind();
  if (!pagefind) return 'unavailable';
  const filters: Filters = {};
  if (labels.length) filters.label = { any: labels };
  if (topic) filters.topic = topic;
  const term = query.trim() === '' ? null : query.trim();
  const search = debounce ? await pagefind.debouncedSearch(term, { filters }, 180) : await pagefind.search(term, { filters });
  if (search === null) return null;
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
}
