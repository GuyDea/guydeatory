/**
 * Explore page filters: label chips (OR-ed), "Has a lab" and a name filter, applied to the
 * server-rendered tree. Topics with nothing visible hide; counts update; the state lives in the URL
 * (?label=a,b&lab=1&q=text).
 */
import { foldDiacritics } from '../lib/text.ts';

const root = document.querySelector<HTMLElement>('[data-explore]');
if (root) {
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-label-chip]')];
  const labChip = root.querySelector<HTMLButtonElement>('[data-lab-chip]');
  const input = root.querySelector<HTMLInputElement>('[data-explore-query]')!;
  const status = root.querySelector<HTMLElement>('[data-explore-status]')!;
  const empty = root.querySelector<HTMLElement>('[data-explore-empty]')!;
  const clear = root.querySelector<HTMLButtonElement>('[data-explore-clear]')!;
  const articles = [...root.querySelectorAll<HTMLElement>('.tree-article')];
  const topics = [...root.querySelectorAll<HTMLElement>('.tree-topic')].reverse(); // children before parents
  const total = new Set(articles.map((a) => a.dataset.id)).size;

  const selected = () => chips.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.labelChip!);
  const labOnly = () => labChip?.getAttribute('aria-pressed') === 'true';

  function apply() {
    const labels = selected();
    const query = foldDiacritics(input.value.trim().toLowerCase());
    const lab = labOnly();
    const filtering = labels.length > 0 || query !== '' || lab;
    const visibleIds = new Set<string>();

    for (const article of articles) {
      const labelMatch = labels.length === 0 || article.dataset.labels!.split(' ').some((l) => labels.includes(l));
      const textMatch = query === '' || article.dataset.search!.includes(query);
      const labMatch = !lab || article.dataset.lab === 'true';
      article.hidden = !(labelMatch && textMatch && labMatch);
      if (!article.hidden) visibleIds.add(article.dataset.id!);
    }
    for (const topic of topics) {
      const ids = new Set([...topic.querySelectorAll<HTMLElement>('.tree-article:not([hidden])')].map((a) => a.dataset.id));
      topic.hidden = ids.size === 0;
      topic.querySelector<HTMLElement>(':scope > details > summary [data-count]')!.textContent = String(ids.size);
      if (filtering) topic.querySelector('details')!.open = true;
    }

    status.textContent = (status.dataset.template ?? '').replace('{n}', String(visibleIds.size)).replace('{total}', String(total));
    empty.hidden = visibleIds.size > 0;
    clear.hidden = !filtering;

    const params = new URLSearchParams();
    if (labels.length) params.set('label', labels.join(','));
    if (lab) params.set('lab', '1');
    if (input.value.trim()) params.set('q', input.value.trim());
    const search = params.toString();
    history.replaceState(null, '', search ? `?${search}` : location.pathname);
  }

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
      apply();
    });
  }
  labChip?.addEventListener('click', () => {
    labChip.setAttribute('aria-pressed', String(!labOnly()));
    apply();
  });
  input.addEventListener('input', apply);
  clear.addEventListener('click', () => {
    for (const chip of chips) chip.setAttribute('aria-pressed', 'false');
    labChip?.setAttribute('aria-pressed', 'false');
    input.value = '';
    apply();
    input.focus();
  });

  // Restore state from the URL (links from label chips elsewhere land here with ?label=…)
  const params = new URLSearchParams(location.search);
  const wanted = (params.get('label') ?? '').split(',').filter(Boolean);
  for (const chip of chips) chip.setAttribute('aria-pressed', String(wanted.includes(chip.dataset.labelChip!)));
  labChip?.setAttribute('aria-pressed', String(params.get('lab') === '1'));
  input.value = params.get('q') ?? '';
  apply();
}
