import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLoader, pagefindUrl, runSearch } from '../src/scripts/search-client.ts';
import type { Pagefind } from '../src/scripts/search-client.ts';
import { createSearchFlow, SEARCH_DELAY_MS, SLOW_SEARCH_MS } from '../src/scripts/search-flow.ts';

/** A fake search whose answers the test releases one by one. */
function fakeSearch() {
  const pending = new Map<string, (result: string) => void>();
  const search = vi.fn((query: string) => new Promise<string>((resolve) => pending.set(query, resolve)));
  const answer = (query: string) => pending.get(query)!(`results for ${query}`);
  return { search, answer };
}

function setup() {
  const { search, answer } = fakeSearch();
  const shown: string[] = [];
  const flow = createSearchFlow<string, string>({
    search,
    show: (result) => shown.push(result),
    showIdle: () => shown.push('idle'),
    showSlow: () => shown.push('searching'),
  });
  return { flow, search, answer, shown };
}

describe('createSearchFlow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('searches once the input has been still for a moment', async () => {
    const { flow, search, answer, shown } = setup();
    flow.update('a');
    await vi.advanceTimersByTimeAsync(100);
    flow.update('at');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS - 1);
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(search).toHaveBeenCalledExactlyOnceWith('at');
    answer('at');
    await vi.advanceTimersByTimeAsync(0);
    expect(shown).toEqual(['results for at']);
  });

  it('shows the idle state at once when the input is cleared, and never searches', async () => {
    const { flow, search, shown } = setup();
    flow.update('electro');
    await vi.advanceTimersByTimeAsync(60);
    flow.update(null);
    expect(shown).toEqual(['idle']);
    await vi.advanceTimersByTimeAsync(2000);
    expect(search).not.toHaveBeenCalled();
    expect(shown).toEqual(['idle']);
  });

  it('drops the answer of a search that was running when the input was cleared', async () => {
    const { flow, answer, shown } = setup();
    flow.update('electro');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS);
    flow.update(null);
    answer('electro');
    await vi.advanceTimersByTimeAsync(2000);
    expect(shown).toEqual(['idle']);
  });

  it('never lets a slow, outdated answer overwrite a newer one', async () => {
    const { flow, answer, shown } = setup();
    flow.update('volt');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS);
    flow.update('voltage');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS);
    answer('voltage');
    await vi.advanceTimersByTimeAsync(0);
    answer('volt');
    await vi.advanceTimersByTimeAsync(0);
    expect(shown).toEqual(['results for voltage']);
  });

  it('shows the searching notice when the latest search is slow', async () => {
    const { flow, answer, shown } = setup();
    flow.update('atom');
    await vi.advanceTimersByTimeAsync(SLOW_SEARCH_MS - 1);
    expect(shown).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(shown).toEqual(['searching']);
    answer('atom');
    await vi.advanceTimersByTimeAsync(0);
    expect(shown).toEqual(['searching', 'results for atom']);
  });

  it('shows no searching notice for a quick search, or after the input was cleared', async () => {
    const { flow, answer, shown } = setup();
    flow.update('atom');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS);
    answer('atom');
    await vi.advanceTimersByTimeAsync(2000);
    expect(shown).toEqual(['results for atom']);

    flow.update('heat');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS);
    flow.update(null);
    await vi.advanceTimersByTimeAsync(2000);
    expect(shown).toEqual(['results for atom', 'idle']);
  });
});

describe('createLoader', () => {
  it('loads once and shares the result', async () => {
    const load = vi.fn(async () => 'pagefind');
    const get = createLoader(load);
    expect(await Promise.all([get(), get()])).toEqual(['pagefind', 'pagefind']);
    expect(await get()).toBe('pagefind');
    expect(load).toHaveBeenCalledOnce();
  });

  it('reads a failed load as null, and tries again on the next call', async () => {
    const load = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('pagefind');
    const get = createLoader(load);
    expect(await get()).toBeNull();
    expect(await get()).toBe('pagefind');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('gives callers that wait on a failing load that failure, then tries again', async () => {
    const load = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('pagefind');
    const get = createLoader(load);
    expect(await Promise.all([get(), get()])).toEqual([null, null]);
    expect(await get()).toBe('pagefind');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('numbers the attempts, so a retry can ask for a new URL', async () => {
    const load = vi.fn<(attempt: number) => Promise<string>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('pagefind');
    const get = createLoader(load);
    await get();
    await get();
    expect(load.mock.calls).toEqual([[0], [1]]);
  });
});

describe('pagefindUrl', () => {
  // Browsers remember a failed import() of a URL for the life of the page, so each retry needs a
  // new one. Pagefind finds its files from its own URL and allows a query string after it.
  it('asks for the plain file first and a new URL for every retry', () => {
    expect(pagefindUrl(0)).toBe('/pagefind/pagefind.js');
    expect(pagefindUrl(1)).toBe('/pagefind/pagefind.js?retry=1');
    expect(pagefindUrl(2)).toBe('/pagefind/pagefind.js?retry=2');
  });
});

describe('runSearch', () => {
  const hit = (n: number) => ({
    data: async () => ({ url: `/en/a${n}/`, excerpt: '', meta: { title: `A${n}`, summary: `About a${n}.` }, filters: { label: ['high-level'] } }),
  });

  function fakePagefind(results = [hit(1), hit(2), hit(3)]) {
    const search = vi.fn(async (_query: string | null, _options?: unknown) => ({ results }));
    const pagefind: Pagefind = { options: async () => {}, init: async () => {}, search };
    return { pagefind, search };
  }

  it('reports "unavailable" when Pagefind cannot load', async () => {
    expect(await runSearch('atom', {}, async () => null)).toBe('unavailable');
  });

  it('searches with the filters and returns the total and the first hits', async () => {
    const { pagefind, search } = fakePagefind();
    const outcome = await runSearch('  atom ', { labels: ['high-level'], topic: 'physics', limit: 2 }, async () => pagefind);
    expect(search).toHaveBeenCalledExactlyOnceWith('atom', { filters: { label: { any: ['high-level'] }, topic: 'physics' } });
    expect(outcome).toEqual({
      total: 3,
      hits: [
        { url: '/en/a1/', title: 'A1', summary: 'About a1.', labels: ['high-level'] },
        { url: '/en/a2/', title: 'A2', summary: 'About a2.', labels: ['high-level'] },
      ],
    });
  });

  it('lists everything matching the filters when the query is empty', async () => {
    const { pagefind, search } = fakePagefind();
    await runSearch(' ', { labels: ['trivia'] }, async () => pagefind);
    expect(search).toHaveBeenCalledExactlyOnceWith(null, { filters: { label: { any: ['trivia'] } } });
  });

  it('reports "unavailable" when the search itself fails', async () => {
    const { pagefind, search } = fakePagefind();
    search.mockRejectedValueOnce(new Error('offline'));
    expect(await runSearch('atom', {}, async () => pagefind)).toBe('unavailable');
  });

  it('after a failed load, shows "unavailable" and loads again for the next search', async () => {
    const { pagefind } = fakePagefind();
    const load = createLoader(vi.fn<() => Promise<Pagefind>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(pagefind));
    expect(await runSearch('atom', {}, load)).toBe('unavailable');
    expect(await runSearch('atom', {}, load)).toMatchObject({ total: 3 });
  });
});
