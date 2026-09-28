/**
 * Animation helpers. Widgets animate only while they are on screen, the tab is visible,
 * the reader has not asked for reduced motion, and the widget is not paused.
 */

export interface LoopParams {
  /** Called every frame with the seconds since the previous frame (capped) and the total time. */
  tick: (dt: number, time: number) => void;
  paused?: boolean;
}

const reducedQuery = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null);

/** Reactive "prefers reduced motion" flag; false during server rendering. */
export function reducedMotion() {
  let reduced = $state(false);
  $effect(() => {
    const query = reducedQuery();
    if (!query) return;
    reduced = query.matches;
    const onChange = (event: MediaQueryListEvent) => (reduced = event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  });
  return {
    get current() {
      return reduced;
    },
  };
}

/** Svelte action: `use:visibleLoop={{ tick, paused }}` runs `tick` on animation frames only when it should. */
export function visibleLoop(node: Element, initial: LoopParams) {
  let params = initial;
  let frame = 0;
  let last = 0;
  let visible = false;
  let running = false;
  const query = reducedQuery();

  const loop = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    params.tick(dt, now / 1000);
    frame = requestAnimationFrame(loop);
  };

  const sync = () => {
    const shouldRun = visible && !document.hidden && !query?.matches && !params.paused;
    if (shouldRun && !running) {
      running = true;
      last = 0;
      frame = requestAnimationFrame(loop);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(frame);
    }
  };

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    sync();
  });
  observer.observe(node);
  query?.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);

  return {
    update(next: LoopParams) {
      params = next;
      sync();
    },
    destroy() {
      observer.disconnect();
      cancelAnimationFrame(frame);
      query?.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    },
  };
}
