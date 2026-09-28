<script lang="ts">
  /** A big live number with its label, announced politely to screen readers. */
  interface Props {
    label: string;
    value: string;
    tone?: 'default' | 'accent' | 'hot' | 'cold';
    /** Smaller type for words rather than numbers. */
    compact?: boolean;
  }
  let { label, value, tone = 'default', compact = false }: Props = $props();
</script>

<div class="readout" class:compact data-tone={tone}>
  <span class="label">{label}</span>
  <span class="value" aria-live="polite" aria-atomic="true">{value}</span>
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
