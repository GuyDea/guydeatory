/** DOM rendering shared by the search dialog and the search page. */
import { LAB_ICON_PATH } from '../lib/lab-icon.ts';
import type { SearchHit } from './search-client.ts';

export interface SearchData {
  labels: Record<string, { name: string; color: string }>;
  count: Record<string, string>;
  none: string;
  unavailable: string;
  hint: string;
  searching: string;
  /** The lab badge's text. */
  lab: string;
}

export function searchData(): SearchData {
  return JSON.parse(document.getElementById('search-data')!.textContent!) as SearchData;
}

export function countText(data: SearchData, n: number): string {
  const category = new Intl.PluralRules(document.documentElement.lang).select(n);
  const template = data.count[category] ?? data.count.other!;
  return template.replace('{n}', new Intl.NumberFormat(document.documentElement.lang).format(n));
}

function labBadge(text: string): HTMLElement {
  const badge = document.createElement('span');
  badge.className = 'lab-badge';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'lab-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', LAB_ICON_PATH);
  svg.append(path);
  const label = document.createElement('span');
  label.textContent = text;
  badge.append(svg, label);
  return badge;
}

export function renderHits(list: HTMLElement, hits: SearchHit[], data: SearchData) {
  list.replaceChildren(
    ...hits.map((hit) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'hit';
      link.href = hit.url;
      const title = document.createElement('span');
      title.className = 'hit-title';
      title.textContent = hit.title;
      const summary = document.createElement('span');
      summary.className = 'hit-summary';
      summary.textContent = hit.summary;
      const labels = document.createElement('span');
      labels.className = 'hit-labels';
      for (const id of hit.labels) {
        const label = data.labels[id];
        if (!label) continue;
        const chip = document.createElement('span');
        chip.className = 'hit-chip';
        chip.style.setProperty('--chip', `var(--label-${label.color})`);
        chip.style.setProperty('--chip-bg', `var(--label-${label.color}-bg)`);
        chip.textContent = label.name;
        labels.append(chip);
      }
      if (hit.lab) labels.append(labBadge(data.lab));
      link.append(title, summary, labels);
      li.append(link);
      return li;
    }),
  );
}
