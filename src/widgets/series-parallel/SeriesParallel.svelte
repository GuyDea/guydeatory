<script lang="ts">
  import type { LangCode } from '../../i18n/languages.ts';
  import { formatQuantity } from '../kit/format.ts';
  import Readout from '../kit/Readout.svelte';
  import Toggle from '../kit/Toggle.svelte';
  import WidgetFrame from '../kit/WidgetFrame.svelte';
  import { circuit, VOLTS } from './model.ts';
  import type { Mode } from './model.ts';
  import { strings } from './strings.ts';

  let { lang }: { lang: LangCode } = $props();
  const s = $derived(strings[lang]);

  let mode = $state<Mode>('series');
  let present = $state([true, true, true]);
  const result = $derived(circuit(mode, present));
  const series = $derived(mode === 'series');
  const totalText = $derived(formatQuantity(result.totalAmps, 'A', lang, 2));

  // Bulb positions: on the top wire (series) or on three rungs of a ladder (parallel).
  const SERIES_X = [130, 220, 310];
  const PARALLEL_X = [150, 240, 330];
  const position = (i: number) => (series ? { x: SERIES_X[i]!, y: 55 } : { x: PARALLEL_X[i]!, y: 128 });

  // Wire pieces, leaving gaps where a bulb has been removed.
  const wires = $derived.by(() => {
    if (series) {
      const pieces = ['M40 105V55H108', 'M152 55H198', 'M242 55H288', 'M332 55H370V205H40V150'];
      return pieces;
    }
    const rails = ['M40 105V55H330', 'M40 150V205H330'];
    const rungs = PARALLEL_X.flatMap((x) => [`M${x} 55V106`, `M${x} 150V205`]);
    return [...rails, ...rungs];
  });

  const glow = (b: number) => (b <= 0 ? 0 : 0.3 + 0.7 * Math.sqrt(b));

  function toggleBulb(i: number) {
    present = present.map((p, j) => (j === i ? !p : p));
  }
</script>

<WidgetFrame name="series-parallel" title={s.title} hint={s.hint} {lang} onreset={() => ((present = [true, true, true]), (mode = 'series'))}>
  <svg
    viewBox="0 0 400 240"
    class="diagram"
    role="group"
    aria-label={s.picture({ series, lit: result.bulbs.filter((b) => b.brightness > 0).length, total: totalText })}
  >
    {#each wires as d (d)}
      <path {d} class="d-wire" />
    {/each}
    <!-- battery on the left edge -->
    <rect x="22" y="105" width="36" height="45" rx="6" class="d-box" />
    <text x="40" y="126" text-anchor="middle" class="d-small">+</text>
    <text x="40" y="145" text-anchor="middle" class="d-small">−</text>
    <text x="40" y="232" text-anchor="middle" class="d-small">{s.battery} {formatQuantity(VOLTS, 'V', lang)}</text>

    {#each result.bulbs as bulb, i (i)}
      {@const p = position(i)}
      <g
        class="bulb"
        role="button"
        tabindex="0"
        aria-label={bulb.present ? s.unscrew(i + 1) : s.screwIn(i + 1)}
        onclick={() => toggleBulb(i)}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleBulb(i);
          }
        }}
      >
        {#if bulb.present}
          {#if bulb.brightness > 0}
            <circle cx={p.x} cy={p.y} r={24 + 20 * bulb.brightness} class="d-glow" opacity={0.15 + 0.25 * bulb.brightness} />
          {/if}
          <circle cx={p.x} cy={p.y} r="21" class="d-box" />
          <circle cx={p.x} cy={p.y} r="21" class="d-glow" opacity={glow(bulb.brightness)} />
          <path d={`M${p.x - 10} ${p.y + 7}c3-12 7-12 10 0s7 12 10 0`} class="d-line" />
        {:else}
          <circle cx={p.x} cy={p.y} r="21" fill="none" stroke="var(--d-muted)" stroke-width="2" stroke-dasharray="4 4" />
        {/if}
        <text x={series ? p.x : p.x + 27} y={series ? p.y + 45 : p.y + 6} text-anchor={series ? 'middle' : 'start'} class="d-small">
          {formatQuantity(bulb.amps, 'A', lang, 2)}
        </text>
      </g>
    {/each}
  </svg>

  {#snippet controls()}
    <Toggle
      label={s.mode}
      options={[
        { value: 'series', label: s.series },
        { value: 'parallel', label: s.parallel },
      ]}
      bind:value={mode}
    />
    <Readout label={s.total} value={totalText} tone="accent" />
    <div class="bulb-buttons">
      {#each present as isIn, i (i)}
        <button type="button" class="bulb-button" onclick={() => toggleBulb(i)}>{isIn ? s.unscrew(i + 1) : s.screwIn(i + 1)}</button>
      {/each}
    </div>
  {/snippet}
</WidgetFrame>

<style>
  .bulb {
    cursor: pointer;
  }

  .bulb:focus-visible {
    outline: none;
  }

  .bulb:focus-visible circle.d-box {
    stroke: var(--focus);
    stroke-width: 4;
  }

  .bulb-buttons {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .bulb-button {
    min-height: var(--touch);
    padding: 0 var(--space-3);
    border: 1.5px solid var(--line-strong);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--ink);
    font-weight: 700;
    font-size: 0.9rem;
  }

  .bulb-button:hover {
    border-color: var(--accent);
  }
</style>
