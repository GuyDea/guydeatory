/**
 * Keeps what a search box shows in step with what is typed in it. Used by the search dialog and
 * the search page; pure timing logic, so it is tested with fake timers (tests/search-flow.test.ts).
 */

/** How long the input must be still before a search starts. */
export const SEARCH_DELAY_MS = 180;
/** A search not answered this long after the last change shows the "Searching…" notice. */
export const SLOW_SEARCH_MS = 250;

export interface SearchFlowOptions<Q, R> {
  /** Runs one search. It should not reject: report failures as a result instead. */
  search: (request: Q) => Promise<R>;
  /** Shows the result of the latest search. Never called for an outdated one. */
  show: (result: R) => void;
  /** Shows the state for "nothing to search", such as the hint. */
  showIdle: () => void;
  /** Shows that the latest search is taking a while. */
  showSlow: () => void;
}

export interface SearchFlow<Q> {
  /** Call on every change. `null` means there is nothing to search (an empty query and no filters). */
  update(request: Q | null): void;
}

/**
 * - Nothing to search: the idle state shows at once, and any waiting or running search is dropped.
 * - Otherwise the search starts once the input has been still for SEARCH_DELAY_MS.
 * - Only the answer to the latest change is shown. Answers to outdated searches are dropped.
 */
export function createSearchFlow<Q, R>({ search, show, showIdle, showSlow }: SearchFlowOptions<Q, R>): SearchFlow<Q> {
  let latest = 0;
  let waiting: ReturnType<typeof setTimeout> | undefined;
  let slow: ReturnType<typeof setTimeout> | undefined;

  return {
    update(request) {
      const change = ++latest;
      clearTimeout(waiting);
      clearTimeout(slow);
      if (request === null) {
        showIdle();
        return;
      }
      slow = setTimeout(showSlow, SLOW_SEARCH_MS);
      waiting = setTimeout(async () => {
        const result = await search(request);
        if (change !== latest) return;
        clearTimeout(slow);
        show(result);
      }, SEARCH_DELAY_MS);
    },
  };
}
