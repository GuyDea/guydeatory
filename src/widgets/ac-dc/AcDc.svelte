<script lang="ts">
  import type { LangCode } from '../../i18n/languages.ts';
  import { formatNumber } from '../kit/format.ts';
  import { visibleLoop } from '../kit/motion.svelte.ts';
  import Slider from '../kit/Slider.svelte';
  import Toggle from '../kit/Toggle.svelte';
  import WidgetFrame from '../kit/WidgetFrame.svelte';
  import { current } from './model.ts';
  import type { Mode } from './model.ts';
  import { strings } from './strings.ts';

  let { lang }: { lang: LangCode } = $props();
  const s = $derived(strings[lang]);

  let mode = $state<Mode>('ac');
  let frequency = $state(0.5);
  let paused = $state(false);
  let time = $state(4); // start with a full graph window

  const WINDOW = 4; // seconds of history on the graph
  const now = $derived(current(time, mode, frequency));

  // Electrons: DC drifts steadily to the right; AC swings around each electron's home.
  const SPACING = 40;
  const electrons = $derived.by(() => {
    const shift =
      mode === 'dc' ? (time * 30) % SPACING : 16 * (1 - Math.cos(2 * Math.PI * frequency * time)) - 16;
    return Array.from({ length: 10 }, (_, i) => 20 + i * SPACING + shift).filter((x) => x > 28 && x < 372);
  });

  const graph = $derived.by(() => {
    const points: string[] = [];
    for (let k = 0; k <= 160; k++) {
      const tau = time - WINDOW + (k / 160) * WINDOW;
      const x = 40 + (k / 160) * 340;
      const y = 160 - 42 * current(tau, mode, frequency);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return points.join(' ');
  });

  const arrowLength = $derived(Math.abs(now) * 60);
  const direction = $derived(Math.abs(now) < 0.05 ? 1 : now > 0 ? 0 : 2);

  const tick = (dt: number) => {
    time += dt;
  };
</script>

<WidgetFrame name="ac-dc" title={s.title} hint={s.hint} {lang} onreset={() => ((mode = 'ac'), (frequency = 0.5), (time = 4))} animated bind:paused>
  <svg viewBox="0 0 400 250" class="diagram" role="img" aria-label={s.picture({ ac: mode === 'ac' })} use:visibleLoop={{ tick, paused }}>
    <!-- the wire with its electrons -->
    <rect x="20" y="40" width="360" height="34" rx="17" class="d-box-alt" />
    {#each electrons as x, i (i)}
      <circle cx={x} cy="57" r="7" class="d-electron" />
    {/each}
    <!-- which way the current flows right now -->
    {#if arrowLength > 3}
      <path
        d={now > 0 ? `M${200 - arrowLength / 2} 22H${200 + arrowLength / 2}` : `M${200 + arrowLength / 2} 22H${200 - arrowLength / 2}`}
        class="d-line d-arrow-accent"
        stroke-width="4"
      />
    {/if}
    <text x="385" y="28" text-anchor="end" class="d-small d-muted">{s.direction[direction]}</text>

    <!-- the graph -->
    <path d="M40 112V208M40 160H382" class="d-line" style="stroke: var(--d-muted)" />
    <text x="46" y="118" class="d-small d-muted">+ {s.current}</text>
    <text x="46" y="206" class="d-small d-muted">− </text>
    <text x="380" y="236" text-anchor="end" class="d-small d-muted">{s.time} →</text>
    <polyline points={graph} fill="none" stroke="var(--d-accent)" stroke-width="3.5" stroke-linejoin="round" />
    <circle cx="380" cy={160 - 42 * now} r="6" class="d-accent" />
  </svg>

  {#snippet controls()}
    <Toggle
      label={s.kind}
      options={[
        { value: 'dc', label: s.dc },
        { value: 'ac', label: s.ac },
      ]}
      bind:value={mode}
    />
    {#if mode === 'ac'}
      <Slider label={s.speed} bind:value={frequency} min={0.2} max={2} step={0.1} {lang} format={(f) => formatNumber(f, lang, 1)} />
    {/if}
    <p class="note">{s.realLife}</p>
  {/snippet}
</WidgetFrame>

<style>
  .note {
    grid-column: 1 / -1;
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-soft);
  }
</style>
