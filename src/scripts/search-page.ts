/** The full search page: query + label + topic filters, with the state kept in the URL. */
import { runSearch } from './search-client.ts';
import { countText, renderHits, searchData } from './search-render.ts';

const page = document.querySelector<HTMLElement>('[data-search-page]');

if (page) {
  const form = page.querySelector<HTMLFormElement>('[data-search-form]')!;
  const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
  const topic = page.querySelector<HTMLSelectElement>('[data-search-topic]')!;
  const chips = [...page.querySelectorAll<HTMLButtonElement>('[data-search-label]')];
  const status = page.querySelector<HTMLElement>('[data-search-status]')!;
  const results = page.querySelector<HTMLElement>('[data-search-results]')!;
  const data = searchData();

  const labels = () => chips.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.searchLabel!);

  async function update() {
    const query = input.value.trim();
    const chosen = labels();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (chosen.length) params.set('label', chosen.join(','));
    if (topic.value) params.set('topic', topic.value);
    history.replaceState(null, '', params.size ? `?${params}` : location.pathname);

    if (!query && chosen.length === 0 && !topic.value) {
      status.textContent = data.hint;
      results.replaceChildren();
      return;
    }
    const outcome = await runSearch(query, { labels: chosen, topic: topic.value, limit: 50 });
    if (outcome === null) return;
    if (outcome === 'unavailable') {
      status.textContent = data.unavailable;
      results.replaceChildren();
      return;
    }
    status.textContent = outcome.total === 0 ? data.none : countText(data, outcome.total);
    renderHits(results, outcome.hits, data);
  }

  const params = new URLSearchParams(location.search);
  input.value = params.get('q') ?? '';
  const wanted = (params.get('label') ?? '').split(',');
  for (const chip of chips) chip.setAttribute('aria-pressed', String(wanted.includes(chip.dataset.searchLabel!)));
  topic.value = params.get('topic') ?? '';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void update();
  });
  input.addEventListener('input', () => void update());
  topic.addEventListener('change', () => void update());
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
      void update();
    });
  }
  void update();
}
