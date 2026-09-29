<script lang="ts">
  /** A segmented choice built from real radio buttons (arrow keys work natively). */
  import { hydrated } from './hydration.svelte.ts';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    label: string;
    options: Option[];
    value: string;
  }

  let { label, options, value = $bindable() }: Props = $props();
  const name = `toggle-${Math.random().toString(36).slice(2, 8)}`;
  const live = hydrated();
</script>

<fieldset class="toggle">
  <legend>{label}</legend>
  <div class="segments">
    {#each options as option (option.value)}
      <label class="segment" class:selected={option.value === value}>
        <input type="radio" {name} value={option.value} bind:group={value} disabled={!live.current} />
        <span>{option.label}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .toggle {
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }

  legend {
    padding: 0;
    margin-bottom: var(--space-2);
    font-weight: 700;
    font-size: var(--text-sm);
  }

  .segments {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    background: var(--surface);
    border: 1.5px solid var(--line-strong);
    border-radius: var(--radius-pill);
  }

  .segment {
    position: relative;
    flex: 1;
    display: grid;
    place-items: center;
    min-height: var(--touch);
    padding: 0 var(--space-3);
    border-radius: var(--radius-pill);
    font-weight: 700;
    font-size: 0.95rem;
    text-align: center;
    cursor: pointer;
  }

  .segment input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .segment.selected {
    background: var(--accent);
    color: var(--accent-ink);
  }

  .segment:has(input:focus-visible) {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
</style>
