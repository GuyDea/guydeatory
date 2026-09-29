<script lang="ts">
  /** A pill button for a widget's actions: presets, places, parts, bulbs. Disabled until the widget hydrates. */
  import type { Snippet } from 'svelte';
  import { hydrated } from './hydration.svelte.ts';

  interface Props {
    onclick: () => void;
    /** For buttons that stay chosen: sets aria-pressed and the chosen look. */
    pressed?: boolean;
    children: Snippet;
  }

  let { onclick, pressed, children }: Props = $props();
  const live = hydrated();
</script>

<button type="button" class="button" aria-pressed={pressed} disabled={!live.current} {onclick}>{@render children()}</button>

<style>
  .button {
    min-height: var(--touch);
    padding: 0 var(--space-3);
    border: 1.5px solid var(--line-strong);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--ink);
    font-weight: 700;
    font-size: 0.9rem;
  }

  .button:enabled:hover {
    border-color: var(--accent);
  }

  .button[aria-pressed='true'] {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }

  .button:disabled {
    cursor: default;
    opacity: 0.6;
  }
</style>
