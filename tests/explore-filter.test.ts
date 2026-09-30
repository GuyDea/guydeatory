// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** A minimal Explore page: one topic with a lab article and a plain article. */
function page() {
  document.body.innerHTML = `
    <div data-explore>
      <button data-label-chip="trivia" aria-pressed="false">Trivia</button>
      <button data-lab-chip aria-pressed="false">Has a lab</button>
      <input data-explore-query />
      <p data-explore-status data-template="{n} of {total}"></p>
      <button data-explore-clear hidden>Clear</button>
      <p data-explore-empty hidden>Nothing</p>
      <ul>
        <li class="tree-topic">
          <details open><summary>Atoms <span data-count>2</span></summary></details>
          <ul class="tree-articles">
            <li class="tree-article" data-id="atom" data-labels="high-level" data-search="atom" data-lab="true"></li>
            <li class="tree-article" data-id="ion" data-labels="trivia" data-search="ion" data-lab="false"></li>
          </ul>
        </li>
      </ul>
    </div>`;
}

async function start(url = '/en/explore/') {
  history.replaceState(null, '', url);
  page();
  vi.resetModules();
  await import('../src/scripts/explore.ts');
}

const hidden = (id: string) => document.querySelector<HTMLElement>(`[data-id="${id}"]`)!.hidden;
const labChip = () => document.querySelector<HTMLButtonElement>('[data-lab-chip]')!;

describe('the Explore "Has a lab" filter', () => {
  beforeEach(() => history.replaceState(null, '', '/'));

  it('shows only articles with a lab, and keeps the choice in the URL', async () => {
    await start();
    labChip().click();
    expect(labChip().getAttribute('aria-pressed')).toBe('true');
    expect(hidden('atom')).toBe(false);
    expect(hidden('ion')).toBe(true);
    expect(document.querySelector('[data-count]')!.textContent).toBe('1');
    expect(location.search).toBe('?lab=1');
  });

  it('combines with the label chips: both must match', async () => {
    await start();
    labChip().click();
    document.querySelector<HTMLButtonElement>('[data-label-chip="trivia"]')!.click();
    expect(hidden('atom')).toBe(true);
    expect(hidden('ion')).toBe(true);
    expect(document.querySelector<HTMLElement>('[data-explore-empty]')!.hidden).toBe(false);
  });

  it('restores the filter from the URL, and Clear switches it off', async () => {
    await start('/en/explore/?lab=1');
    expect(labChip().getAttribute('aria-pressed')).toBe('true');
    expect(hidden('ion')).toBe(true);
    document.querySelector<HTMLButtonElement>('[data-explore-clear]')!.click();
    expect(labChip().getAttribute('aria-pressed')).toBe('false');
    expect(hidden('ion')).toBe(false);
    expect(location.search).toBe('');
  });
});
