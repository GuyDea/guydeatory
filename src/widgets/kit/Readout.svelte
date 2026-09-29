<script lang="ts">
  /**
   * A big number with its label. The number on screen changes at once. Screen readers hear
   * "label: value" from a polite live region once the value has stopped changing (settle.ts), so a
   * dragged slider is announced once, not at every step. The on-screen copy is hidden from them,
   * so nothing is read twice.
   */
  import { untrack } from 'svelte';
  import { settle } from './settle.ts';

  interface Props {
    label: string;
    value: string;
    tone?: 'default' | 'accent' | 'hot' | 'cold';
    /** Smaller type for words rather than numbers. */
    compact?: boolean;
  }
  let { label, value, tone = 'default', compact = false }: Props = $props();

  let spoken = $state(untrack(() => value));
  const settler = settle<string>((settled) => (spoken = settled));
  $effect(() => {
    settler.push(value);
    return settler.cancel;
  });
</script>

<div class="readout" class:compact data-tone={tone}>
  <span class="label" aria-hidden="true">{label}</span>
  <span class="value" aria-hidden="true">{value}</span>
  <span class="visually-hidden" aria-live="polite" aria-atomic="true">{label}: {spoken}</span>
</div>

<style>
  .readout {
    display: grid;
    gap: 2px;
    padding: var(--space-2) var(--space-3);
    background: var(--surface);
    border: 1.5px solid var(--line);
    border-radius: var(--radius-md);
  }

  .label {
    font-size: var(--text-sm);
    color: var(--ink-soft);
    font-weight: 700;
  }

  .value {
    font-family: var(--font-display-stack);
    font-weight: 800;
    font-size: 1.6rem;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  .compact .value {
    font-size: 1.15rem;
    line-height: 1.25;
  }

  [data-tone='accent'] .value {
    color: var(--accent);
  }

  [data-tone='hot'] .value {
    color: var(--hot);
  }

  [data-tone='cold'] .value {
    color: var(--cold);
  }
</style>
