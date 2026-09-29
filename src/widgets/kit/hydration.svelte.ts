import { onMount } from 'svelte';

/**
 * Reactive "this widget is live" flag: false in the server render and until the component hydrates
 * in the browser, true after that. Without JS a control does nothing, so every kit control stays
 * disabled (and every clickable drawing stays a plain picture) until this turns true.
 *
 * Call it while the component initialises, like `onMount`.
 */
export function hydrated() {
  let live = $state(false);
  onMount(() => {
    live = true;
  });
  return {
    get current() {
      return live;
    },
  };
}
