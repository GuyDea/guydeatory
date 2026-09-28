<script lang="ts">
  /**
   * The exhibit frame every widget uses: title, optional hint, optional Pause/Play and Start-again
   * buttons, a stage (the picture) and a controls area. The root carries data-widget for checks.
   */
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { LangCode } from '../../i18n/languages.ts';
  import { kitStrings } from './strings.ts';

  interface Props {
    name: string;
    title: string;
    hint?: string;
    lang: LangCode;
    onreset?: () => void;
    /** Shows a Pause/Play button (needed for anything that moves on its own). */
    animated?: boolean;
    paused?: boolean;
    children: Snippet;
    controls?: Snippet;
  }

  let { name, title, hint, lang, onreset, animated = false, paused = $bindable(false), children, controls }: Props = $props();
  const s = $derived(kitStrings[lang]);
  let hydrated = $state(false);
  onMount(() => (hydrated = true));
</script>

<section class="widget" data-widget={name} role="group" aria-label={title}>
  <header class="head">
    <p class="title">{title}</p>
    {#if hydrated && (animated || onreset)}
      <div class="actions">
        {#if animated}
          <button type="button" class="btn" aria-pressed={paused} onclick={() => (paused = !paused)}>
            {paused ? s.play : s.pause}
          </button>
        {/if}
        {#if onreset}
          <button type="button" class="btn" onclick={onreset}>{s.reset}</button>
        {/if}
      </div>
    {/if}
  </header>
  {#if hint}<p class="hint">{hint}</p>{/if}
  <div class="stage">{@render children()}</div>
  {#if controls}<div class="controls">{@render controls()}</div>{/if}
</section>

<style>
  .widget {
    display: grid;
    background: var(--surface);
    border: 2px solid var(--ink);
    border-radius: var(--radius-lg);
    box-shadow: 6px 6px 0 var(--line-strong);
    overflow: hidden;
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1.5px solid var(--line);
  }

  .title {
    margin: 0;
    font-family: var(--font-display-stack);
    font-weight: 750;
    font-size: 1.1rem;
  }

  .actions {
    display: flex;
    gap: var(--space-2);
  }

  .btn {
    min-height: 40px;
    padding: 0 var(--space-3);
    border: 1.5px solid var(--line-strong);
    border-radius: var(--radius-pill);
    background: var(--paper);
    color: var(--ink);
    font-weight: 700;
    font-size: 0.9rem;
  }

  .btn:hover {
    border-color: var(--accent);
  }

  .hint {
    margin: 0;
    padding: var(--space-2) var(--space-4) 0;
    color: var(--ink-soft);
    font-size: var(--text-sm);
  }

  /* Graph paper: the lab bench the experiment sits on. */
  .stage {
    padding: var(--space-3);
    background-color: var(--surface);
    background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px);
    background-size: 24px 24px;
    background-position: center;
  }

  .stage :global(svg) {
    display: block;
    width: 100%;
    max-width: 34rem;
    height: auto;
    max-height: 60vh;
    margin-inline: auto;
  }

  .controls {
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    align-items: end;
    padding: var(--space-4);
    background: var(--surface-sunk);
    border-top: 1.5px solid var(--line);
  }
</style>
