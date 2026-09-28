<script lang="ts">
  import type { LangCode } from '../../i18n/languages.ts';
  import { formatQuantity } from '../kit/format.ts';
  import { visibleLoop } from '../kit/motion.svelte.ts';
  import Readout from '../kit/Readout.svelte';
  import Slider from '../kit/Slider.svelte';
  import WidgetFrame from '../kit/WidgetFrame.svelte';
  import { ohmsDigits, PRESETS, solve } from './model.ts';
  import { strings } from './strings.ts';

  let { lang }: { lang: LangCode } = $props();
  const s = $derived(strings[lang]);

  let volts = $state(12);
  let ohms = $state(6);
  let paused = $state(false);
  let offset = $state(0);
  const result = $derived(solve({ volts, ohms }));

  const ampDigits = (a: number) => (a === 0 ? 0 : a < 0.1 ? 3 : a < 10 ? 2 : 1);
  const ampsText = $derived(formatQuantity(result.amps, 'A', lang, ampDigits(result.amps)));
  const wattsText = $derived(formatQuantity(result.watts, 'W', lang, result.watts < 10 && result.watts > 0 ? 1 : 0));
  const voltsText = $derived(formatQuantity(volts, 'V', lang));
  const ohmsText = $derived(formatQuantity(ohms, 'Ω', lang, ohmsDigits(ohms)));

  // The pipe narrows as resistance grows (log scale 1 Ω … 10 000 Ω).
  const pipeHeight = $derived(10 + 40 * (1 - Math.log10(ohms) / 4));
  const speed = $derived(22 * Math.log10(1 + 50 * result.amps)); // px/s, gentle log scale
  const pushLength = $derived(8 + 34 * (volts / 240));
  const DOTS = 12;
  const dots = $derived(Array.from({ length: DOTS }, (_, i) => 90 + (((i * 290) / DOTS + offset) % 290)));

  const tick = (dt: number) => {
    offset += speed * dt;
  };

  function preset(id: (typeof PRESETS)[number]['id']) {
    const chosen = PRESETS.find((p) => p.id === id)!;
    volts = chosen.volts;
    ohms = chosen.ohms;
  }

  function reset() {
    volts = 12;
    ohms = 6;
  }
</script>

<WidgetFrame name="ohms-law" title={s.title} hint={s.hint} {lang} onreset={reset} animated bind:paused>
  <svg
    viewBox="0 0 400 220"
    class="diagram"
    role="img"
    aria-label={s.picture({ amps: ampsText, volts: voltsText, ohms: ohmsText })}
    use:visibleLoop={{ tick, paused }}
  >
    <text x="200" y="40" text-anchor="middle" class="formula">
      <tspan class="sym-i">I</tspan> = <tspan class="sym-v">{s.voltageSymbol}</tspan> {s.divide} <tspan class="sym-r">R</tspan>
    </text>
    <text x="200" y="76" text-anchor="middle" class="numbers">
      <tspan class="sym-i">{ampsText}</tspan> = <tspan class="sym-v">{voltsText}</tspan> {s.divide} <tspan class="sym-r">{ohmsText}</tspan>
    </text>

    <!-- the push (battery / pump) -->
    <circle cx="50" cy="150" r="30" class="d-box" />
    <path d={`M${50 - pushLength / 2} 150H${50 + pushLength / 2}`} class="d-line d-arrow-hot" stroke-width="4" />
    <text x="50" y="205" text-anchor="middle" class="d-small">{s.push}</text>

    <!-- the pipe: narrower = more resistance -->
    <rect x="80" y={150 - pipeHeight / 2} width="300" height={pipeHeight} rx={pipeHeight / 2} class="d-box-alt" />
    {#each dots as x, i (i)}
      <circle cx={x} cy="150" r={Math.max(2.5, Math.min(6, pipeHeight / 4))} class="d-electron" />
    {/each}
    {#if result.amps > 0}
      <path d="M300 118H350" class="d-line d-arrow-electron" />
    {/if}
    <text x="230" y="205" text-anchor="middle" class="d-small">{s.narrow}: {ohmsText}</text>
    <text x="325" y="108" text-anchor="middle" class="d-small">{s.flow}</text>
  </svg>

  {#snippet controls()}
    <Slider label={s.voltage} bind:value={volts} min={0} max={240} step={1} unit="V" {lang} />
    <Slider label={s.resistance} bind:value={ohms} min={1} max={10000} step={0.5} unit="Ω" digits={ohmsDigits(ohms)} scale="log" {lang} />
    <Readout label={s.current} value={ampsText} tone="accent" />
    <Readout label={s.power} value={wattsText} tone="hot" />
    <div class="presets" role="group" aria-label={s.presets}>
      <span class="presets-label">{s.presets}</span>
      {#each PRESETS as p (p.id)}
        <button type="button" class="preset" onclick={() => preset(p.id)}>{s.presetNames[p.id]}</button>
      {/each}
    </div>
  {/snippet}
</WidgetFrame>

<style>
  .formula {
    font-family: var(--font-display-stack);
    font-weight: 800;
    font-size: 32px;
    fill: var(--d-ink);
  }

  .numbers {
    font-family: var(--font-display-stack);
    font-weight: 700;
    font-size: 21px;
    fill: var(--d-ink);
  }

  .sym-i {
    fill: var(--accent);
  }

  .sym-v {
    fill: var(--hot);
  }

  .sym-r {
    fill: var(--label-violet);
  }

  .presets {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .presets-label {
    font-weight: 700;
    font-size: var(--text-sm);
    margin-right: var(--space-1);
  }

  .preset {
    min-height: 40px;
    padding: 0 var(--space-3);
    border: 1.5px solid var(--line-strong);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--ink);
    font-weight: 700;
    font-size: 0.9rem;
  }

  .preset:hover {
    border-color: var(--accent);
  }
</style>
