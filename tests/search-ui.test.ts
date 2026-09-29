// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchOutcome } from '../src/scripts/search-client.ts';

// The scripts' only way to Pagefind. Each test answers the searches itself, in any order.
const client = vi.hoisted(() => ({ runSearch: vi.fn(), loadPagefind: vi.fn(async () => null) }));
vi.mock('../src/scripts/search-client.ts', () => client);

type Answer = SearchOutcome | 'unavailable';
let answers: Map<string, (answer: Answer) => void>;

const DATA = {
  labels: {},
  count: { one: '{n} result', other: '{n} results' },
  none: 'Nothing found.',
  unavailable: 'Search is not available.',
  hint: 'Type a word.',
  searching: 'Searching…',
};
const SEARCH_DATA = `<script type="application/json" id="search-data">${JSON.stringify(DATA)}</script>`;

const outcome = (query: string, total: number): SearchOutcome => ({
  total,
  hits: Array.from({ length: Math.min(total, 8) }, (_, i) => ({ url: `/en/${query}-${i}/`, title: `${query} ${i}`, summary: '', labels: [] })),
});

async function answer(query: string, value: Answer) {
  answers.get(query)!(value);
  await vi.advanceTimersByTimeAsync(0);
}

function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const status = () => document.querySelector('[data-search-status]')!.textContent;
const hits = () => document.querySelectorAll('[data-search-results] li').length;

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  answers = new Map();
  client.runSearch.mockReset();
  client.runSearch.mockImplementation((query: string) => new Promise<Answer>((resolve) => answers.set(query, resolve)));
  document.documentElement.lang = 'en';
  history.replaceState(null, '', '/en/search/');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the search page', () => {
  async function openSearchPage() {
    document.body.innerHTML = `${SEARCH_DATA}
      <div data-search-page>
        <form data-search-form><input name="q" type="search" /></form>
        <button type="button" data-search-label="trivia" aria-pressed="false">Fun facts</button>
        <select data-search-topic><option value="">Any topic</option><option value="physics">Physics</option></select>
        <p data-search-status>Type a word.</p>
        <ul data-search-results></ul>
      </div>`;
    await import('../src/scripts/search-page.ts');
    return document.querySelector<HTMLInputElement>('input[name="q"]')!;
  }

  it('shows the hint at once when the input is cleared, and the old results never come back', async () => {
    const input = await openSearchPage();
    type(input, 'electron');
    await vi.advanceTimersByTimeAsync(180);
    await answer('electron', outcome('electron', 13));
    expect(status()).toBe('13 results');

    type(input, 'electro');
    await vi.advanceTimersByTimeAsync(60);
    type(input, '');
    expect([status(), hits()]).toEqual(['Type a word.', 0]);

    await vi.advanceTimersByTimeAsync(2000);
    if (answers.has('electro')) await answer('electro', outcome('electro', 14));
    expect([status(), hits()]).toEqual(['Type a word.', 0]);
    expect(location.search).toBe('');
  });

  it('never lets a slow answer to an earlier query replace the answer to the latest one', async () => {
    const input = await openSearchPage();
    type(input, 'volt');
    await vi.advanceTimersByTimeAsync(180);
    type(input, 'voltage');
    await vi.advanceTimersByTimeAsync(180);
    await answer('voltage', outcome('voltage', 2));
    if (answers.has('volt')) await answer('volt', outcome('volt', 7));
    expect([status(), hits()]).toEqual(['2 results', 2]);
    expect(document.querySelector('.hit-title')!.textContent).toBe('voltage 0');
  });

  it('says when search is unavailable, and searches again on the next change', async () => {
    const input = await openSearchPage();
    type(input, 'atom');
    await vi.advanceTimersByTimeAsync(180);
    await answer('atom', 'unavailable');
    expect([status(), hits()]).toEqual(['Search is not available.', 0]);

    type(input, 'atoms');
    await vi.advanceTimersByTimeAsync(180);
    await answer('atoms', outcome('atoms', 1));
    expect([status(), hits()]).toEqual(['1 result', 1]);
  });

  it('runs the search from the address when it opens', async () => {
    history.replaceState(null, '', '/en/search/?q=heat&label=trivia');
    const input = await openSearchPage();
    expect(input.value).toBe('heat');
    await vi.advanceTimersByTimeAsync(180);
    expect(client.runSearch).toHaveBeenCalledExactlyOnceWith('heat', { labels: ['trivia'], topic: '', limit: 50 });
  });
});

describe('the search dialog', () => {
  it('shows the hint at once when the input is cleared, and the old results never come back', async () => {
    document.body.innerHTML = `${SEARCH_DATA}
      <button data-search-open>Search</button>
      <dialog data-search-dialog data-search-page="/en/search/">
        <input type="search" data-search-input />
        <button type="button" data-search-close>Esc</button>
        <button type="button" data-search-label="trivia" aria-pressed="false">Fun facts</button>
        <p data-search-status></p>
        <ul data-search-results></ul>
        <a data-search-all href="/en/search/" hidden>See all results</a>
      </dialog>`;
    await import('../src/scripts/search-dialog.ts');
    document.querySelector<HTMLButtonElement>('[data-search-open]')!.click();
    const input = document.querySelector<HTMLInputElement>('[data-search-input]')!;
    const all = document.querySelector<HTMLAnchorElement>('[data-search-all]')!;
    expect(status()).toBe('Type a word.');

    type(input, 'electron');
    await vi.advanceTimersByTimeAsync(180);
    await answer('electron', outcome('electron', 13));
    expect([status(), hits(), all.hidden]).toEqual(['13 results', 8, false]);

    type(input, 'electro');
    await vi.advanceTimersByTimeAsync(60);
    type(input, '');
    expect([status(), hits(), all.hidden]).toEqual(['Type a word.', 0, true]);

    await vi.advanceTimersByTimeAsync(2000);
    if (answers.has('electro')) await answer('electro', outcome('electro', 14));
    expect([status(), hits(), all.hidden]).toEqual(['Type a word.', 0, true]);
  });
});
