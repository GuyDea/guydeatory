/** How long a value must stay unchanged before screen readers hear it (0.5–1 s feels settled). */
export const SETTLE_MS = 700;

/**
 * Passes a changing value on to `announce` only once it has stopped changing for `delay` ms.
 *
 * A dragged slider changes its readouts many times a second. A live region that followed every
 * step would queue one announcement per step. With this, screen readers hear the final value once.
 */
export function settle<T>(announce: (value: T) => void, delay = SETTLE_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    /** A new value: start the wait again. */
    push(value: T) {
      clearTimeout(timer);
      timer = setTimeout(() => announce(value), delay);
    },
    /** Drop the waiting value, e.g. when the widget goes away. */
    cancel() {
      clearTimeout(timer);
    },
  };
}
