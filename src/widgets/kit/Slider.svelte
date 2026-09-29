<script lang="ts">
  /** A labelled slider with the current value (and unit) shown and spoken. Supports a log scale. */
  import type { LangCode } from '../../i18n/languages.ts';
  import { formatQuantity } from './format.ts';
  import { hydrated } from './hydration.svelte.ts';
  import { logPosition, logValue } from './scale.ts';

  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    digits?: number;
    lang: LangCode;
    /** 'log' spreads values like 1…1000 evenly along the track. */
    scale?: 'linear' | 'log';
    /** Custom text for the value, e.g. "open". */
    format?: (value: number) => string;
  }

  let { label, value = $bindable(), min, max, step = 1, unit = '', digits = 0, lang, scale = 'linear', format }: Props = $props();
  const live = hydrated();

  const LOG_STEPS = 1000;
  const toPosition = (v: number) => (scale === 'log' ? logPosition(v, min, max, LOG_STEPS) : v);
  const fromPosition = (p: number) => (scale === 'log' ? logValue(p, min, max, LOG_STEPS, step) : p);

  const text = $derived(format ? format(value) : unit ? formatQuantity(value, unit, lang, digits) : String(value));
</script>

<label class="slider">
  <span class="top">
    <span class="label">{label}</span>
    <output class="value">{text}</output>
  </span>
  <input
    type="range"
    min={scale === 'log' ? 0 : min}
    max={scale === 'log' ? LOG_STEPS : max}
    step={scale === 'log' ? 1 : step}
    value={toPosition(value)}
    oninput={(event) => (value = fromPosition(Number(event.currentTarget.value)))}
    aria-valuetext={text}
    disabled={!live.current}
  />
</label>

<style>
  .slider {
    display: grid;
    gap: var(--space-2);
  }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-3);
  }

  .label {
    font-weight: 700;
    font-size: var(--text-sm);
  }

  .value {
    font-family: var(--font-display-stack);
    font-weight: 800;
    font-size: 1.15rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  input[type='range'] {
    width: 100%;
    height: var(--touch);
    margin: 0;
    background: transparent;
    accent-color: var(--accent);
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }

  input[type='range']:disabled {
    cursor: default;
    opacity: 0.6;
  }

  input[type='range']::-webkit-slider-runnable-track {
    height: 10px;
    border-radius: var(--radius-pill);
    background: var(--line-strong);
  }

  input[type='range']::-moz-range-track {
    height: 10px;
    border-radius: var(--radius-pill);
    background: var(--line-strong);
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 30px;
    height: 30px;
    margin-top: -10px;
    border-radius: 50%;
    background: var(--accent);
    border: 3px solid var(--surface);
    box-shadow: 0 0 0 2px var(--accent);
  }

  input[type='range']::-moz-range-thumb {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--accent);
    border: 3px solid var(--surface);
    box-shadow: 0 0 0 2px var(--accent);
  }
</style>
