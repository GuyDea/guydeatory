<script lang="ts">
  import type { LangCode } from '../../i18n/languages.ts';
  import Button from '../kit/Button.svelte';
  import { formatQuantity } from '../kit/format.ts';
  import { hotspot } from '../kit/hotspot.ts';
  import { hydrated } from '../kit/hydration.svelte.ts';
  import Readout from '../kit/Readout.svelte';
  import Toggle from '../kit/Toggle.svelte';
  import WidgetFrame from '../kit/WidgetFrame.svelte';
  import { BULB_COUNTS, circuit, VOLTS } from './model.ts';
  import type { BulbCount, Mode } from './model.ts';
  import { strings } from './strings.ts';

  let { lang }: { lang: LangCode } = $props();
  const s = $derived(strings[lang]);
  const live = hydrated();

  let mode = $state<Mode>('series');
  let present = $state([true, true, true]); // one entry per bulb holder: is a bulb screwed in?
  const count = $derived(present.length as BulbCount);
  const result = $derived(circuit(mode, present));
  const series = $derived(mode === 'series');
  const totalText = $derived(formatQuantity(result.totalAmps, 'A', lang, 2));

  // Bulb centres, spread evenly 90 apart: along the top wire (series) or on the rungs of a ladder (parallel).
  const xs = $derived(Array.from({ length: count }, (_, i) => (series ? 220 : 240) + (i - (count - 1) / 2) * 90));
  const position = (i: number) => ({ x: xs[i]!, y: series ? 55 : 128 });

  // Wire pieces. In series they stop at each bulb holder (radius 21), so the loop runs through the bulbs.
  const wires = $derived.by(() => {
    const last = xs[xs.length - 1]!;
    if (series) {
      return [
        `M40 105V55H${xs[0]! - 22}`,
        ...xs.slice(1).map((x, i) => `M${xs[i]! + 22} 55H${x - 22}`),
        `M${last + 22} 55H370V205H40V150`,
      ];
    }
    const rails = [`M40 105V55H${last}`, `M40 150V205H${last}`];
    const rungs = xs.flatMap((x) => [`M${x} 55V106`, `M${x} 150V205`]);
    return [...rails, ...rungs];
  });

  const glow = (b: number) => (b <= 0 ? 0 : 0.3 + 0.7 * Math.sqrt(b));

  function toggleBulb(i: number) {
    present = present.map((p, j) => (j === i ? !p : p));
  }

  /** Keeps the bulbs already there as they are; a new holder gets a bulb screwed in. */
  function setCount(next: BulbCount) {
    present = Array.from({ length: next }, (_, i) => present[i] ?? true);
  }
</script>

<WidgetFrame name="series-parallel" title={s.title} hint={s.hint} {lang} onreset={() => ((present = [true, true, true]), (mode = 'series'))}>
  <svg
    viewBox="0 0 400 240"
    class="diagram"
    role="group"
    aria-label={s.picture({ series, holders: count, lit: result.bulbs.filter((b) => b.brightness > 0).length, total: totalText })}
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
      <g class="bulb" {...hotspot(live.current, bulb.present ? s.unscrew(i + 1) : s.screwIn(i + 1), () => toggleBulb(i))}>
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
        <!-- the current through this bulb: under it in series; in parallel beside its rung, below
             the glows, so the next bulb's glow never covers it -->
        <text x={series ? p.x : p.x + 7} y={series ? p.y + 45 : 192} text-anchor={series ? 'middle' : 'start'} class="d-small">
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
    <Toggle
      label={s.count}
      options={BULB_COUNTS.map((n) => ({ value: String(n), label: s.bulbs(n) }))}
      bind:value={() => String(count), (next) => setCount(Number(next) as BulbCount)}
    />
    <Readout label={s.total} value={totalText} tone="accent" />
    <div class="bulb-buttons">
      {#each present as isIn, i (i)}
        <Button onclick={() => toggleBulb(i)}>{isIn ? s.unscrew(i + 1) : s.screwIn(i + 1)}</Button>
      {/each}
    </div>
  {/snippet}
</WidgetFrame>

<style>
  .bulb[role='button'] {
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
</style>
