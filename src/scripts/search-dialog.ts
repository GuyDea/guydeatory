/** Opens the quick-search dialog and runs searches as the reader types. */
import { runSearch } from './search-client.ts';
import { countText, renderHits, searchData } from './search-render.ts';

const dialog = document.querySelector<HTMLDialogElement>('[data-search-dialog]');

if (dialog && typeof dialog.showModal === 'function') {
  const input = dialog.querySelector<HTMLInputElement>('[data-search-input]')!;
  const status = dialog.querySelector<HTMLElement>('[data-search-status]')!;
  const results = dialog.querySelector<HTMLElement>('[data-search-results]')!;
  const all = dialog.querySelector<HTMLAnchorElement>('[data-search-all]')!;
  const chips = [...dialog.querySelectorAll<HTMLButtonElement>('[data-search-label]')];
  const data = searchData();

  const selectedLabels = () => chips.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.searchLabel!);

  async function update() {
    const query = input.value;
    const labels = selectedLabels();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (labels.length) params.set('label', labels.join(','));
    all.href = `${dialog!.dataset.searchPage}${params.size ? `?${params}` : ''}`;
    if (!query.trim() && labels.length === 0) {
      status.textContent = data.hint;
      results.replaceChildren();
      all.hidden = true;
      return;
    }
    const outcome = await runSearch(query, { labels, limit: 8 });
    if (outcome === null) return; // superseded by a newer keystroke
    if (outcome === 'unavailable') {
      status.textContent = data.unavailable;
      results.replaceChildren();
      all.hidden = true;
      return;
    }
    status.textContent = outcome.total === 0 ? data.none : countText(data, outcome.total);
    renderHits(results, outcome.hits, data);
    all.hidden = outcome.total <= outcome.hits.length;
  }

  function open() {
    if (dialog!.open) return;
    dialog!.showModal();
    input.focus();
    input.select();
    void update();
  }

  input.addEventListener('input', () => void update());
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
      void update();
    });
  }
  dialog.querySelector('[data-search-close]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); // click on the backdrop
  });

  // Arrow keys move between the input and the results.
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const links = [...results.querySelectorAll<HTMLAnchorElement>('a')];
    if (links.length === 0) return;
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    event.preventDefault();
    if (event.key === 'ArrowDown') links[Math.min(index + 1, links.length - 1)]!.focus();
    else if (index <= 0) input.focus();
    else links[index - 1]!.focus();
  });

  document.addEventListener('click', (event) => {
    const trigger = (event.target as Element | null)?.closest('[data-search-open]');
    if (!trigger) return;
    event.preventDefault();
    open();
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      open();
    } else if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      open();
    }
  });
}
