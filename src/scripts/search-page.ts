/** The full search page: query + label, topic and lab filters, with the state kept in the URL. */
import { runSearch } from './search-client.ts';
import { createSearchFlow } from './search-flow.ts';
import { countText, renderHits, searchData } from './search-render.ts';

const page = document.querySelector<HTMLElement>('[data-search-page]');

if (page) {
  const form = page.querySelector<HTMLFormElement>('[data-search-form]')!;
  const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
  const topic = page.querySelector<HTMLSelectElement>('[data-search-topic]')!;
  const chips = [...page.querySelectorAll<HTMLButtonElement>('[data-search-label]')];
  const labChip = page.querySelector<HTMLButtonElement>('[data-search-lab]');
  const status = page.querySelector<HTMLElement>('[data-search-status]')!;
  const results = page.querySelector<HTMLElement>('[data-search-results]')!;
  const data = searchData();

  const labels = () => chips.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.searchLabel!);
  const labOnly = () => labChip?.getAttribute('aria-pressed') === 'true';

  const flow = createSearchFlow({
    search: ({ query, chosen, topicId, lab }: { query: string; chosen: string[]; topicId: string; lab: boolean }) =>
      runSearch(query, { labels: chosen, topic: topicId, lab, limit: 50 }),
    showIdle: () => {
      status.textContent = data.hint;
      results.replaceChildren();
    },
    showSlow: () => {
      status.textContent = data.searching;
    },
    show: (outcome) => {
      if (outcome === 'unavailable') {
        status.textContent = data.unavailable;
        results.replaceChildren();
        return;
      }
      status.textContent = outcome.total === 0 ? data.none : countText(data, outcome.total);
      renderHits(results, outcome.hits, data);
    },
  });

  function update() {
    const query = input.value.trim();
    const chosen = labels();
    const lab = labOnly();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (chosen.length) params.set('label', chosen.join(','));
    if (topic.value) params.set('topic', topic.value);
    if (lab) params.set('lab', '1');
    history.replaceState(null, '', params.size ? `?${params}` : location.pathname);
    flow.update(query || chosen.length || topic.value || lab ? { query, chosen, topicId: topic.value, lab } : null);
  }

  const params = new URLSearchParams(location.search);
  input.value = params.get('q') ?? '';
  const wanted = (params.get('label') ?? '').split(',');
  for (const chip of chips) chip.setAttribute('aria-pressed', String(wanted.includes(chip.dataset.searchLabel!)));
  topic.value = params.get('topic') ?? '';
  labChip?.setAttribute('aria-pressed', String(params.get('lab') === '1'));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    update();
  });
  input.addEventListener('input', update);
  topic.addEventListener('change', update);
  labChip?.addEventListener('click', () => {
    labChip.setAttribute('aria-pressed', String(!labOnly()));
    update();
  });
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
      update();
    });
  }
  update();
}
