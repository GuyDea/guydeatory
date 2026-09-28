<script lang="ts">
  import type { LangCode } from '../../i18n/languages.ts';
  import { formatNumber, formatQuantity } from '../kit/format.ts';
  import Readout from '../kit/Readout.svelte';
  import Slider from '../kit/Slider.svelte';
  import WidgetFrame from '../kit/WidgetFrame.svelte';
  import { boilingPointPropane, boilingPointWater, PLACES } from './model.ts';
  import { strings } from './strings.ts';

  let { lang }: { lang: LangCode } = $props();
  const s = $derived(strings[lang]);

  let pressure = $state(1.01);
  const water = $derived(boilingPointWater(pressure));
  const propane = $derived(boilingPointPropane(pressure));

  // Chart: pressure 0.3–3 bar across, water temperature 60–140 °C up.
  const P_MIN = 0.3;
  const P_MAX = 3;
  const T_MIN = 60;
  const T_MAX = 140;
  const x = (p: number) => 56 + ((p - P_MIN) / (P_MAX - P_MIN)) * 324;
  const y = (t: number) => 196 - ((t - T_MIN) / (T_MAX - T_MIN)) * 176;

  const curve = Array.from({ length: 80 }, (_, i) => {
    const p = P_MIN + (i / 79) * (P_MAX - P_MIN);
    return `${x(p).toFixed(1)},${y(boilingPointWater(p)).toFixed(1)}`;
  }).join(' ');

  const pressureText = $derived(formatQuantity(pressure, 'bar', lang, 2));
  const waterText = $derived(formatQuantity(Math.round(water), '°C', lang));
  const propaneText = $derived(formatQuantity(Math.round(propane), '°C', lang));
</script>

<WidgetFrame name="boiling-point" title={s.title} hint={s.hint} {lang} onreset={() => (pressure = 1.01)}>
  <svg viewBox="0 0 400 240" class="diagram" role="img" aria-label={s.picture({ pressure: pressureText, water: waterText, propane: propaneText })}>
    <!-- axes and grid -->
    {#each [60, 80, 100, 120, 140] as t (t)}
      <path d={`M56 ${y(t)}H380`} stroke="var(--d-muted)" stroke-width="1" stroke-dasharray="3 5" />
      <text x="48" y={y(t) + 5} text-anchor="end" class="d-small">{t}</text>
    {/each}
    {#each [0.5, 1, 2, 3] as p (p)}
      <text x={x(p)} y="218" text-anchor="middle" class="d-small">{formatNumber(p, lang, p < 1 ? 1 : 0)}</text>
    {/each}
    <text x="10" y="16" class="d-small d-muted">{s.axisTemp}</text>
    <text x="380" y="236" text-anchor="end" class="d-small d-muted">{s.axisPressure}</text>
    <path d="M56 20V196H382" class="d-line" />

    <!-- the boiling curve of water -->
    <polyline points={curve} fill="none" stroke="var(--d-hot)" stroke-width="4" stroke-linejoin="round" />

    <!-- famous places -->
    {#each PLACES as place, i (place.id)}
      <circle cx={x(place.bar)} cy={y(boilingPointWater(place.bar))} r="5" class="d-box" />
      <text x={x(place.bar) + 8} y={y(boilingPointWater(place.bar)) + (i % 2 === 0 ? -8 : 18)} class="d-small">{s.shortNames[place.id]}</text>
    {/each}

    <!-- where we are now -->
    <path d={`M${x(pressure)} 196V${y(water)}`} stroke="var(--d-accent)" stroke-width="2" stroke-dasharray="5 4" />
    <circle cx={x(pressure)} cy={y(water)} r="8" class="d-accent" />
  </svg>

  {#snippet controls()}
    <Slider label={s.pressure} bind:value={pressure} min={P_MIN} max={P_MAX} step={0.01} unit="bar" digits={2} {lang} />
    <Readout label={s.water} value={waterText} tone="hot" />
    <Readout label={s.propane} value={propaneText} tone="cold" />
    <div class="places" role="group" aria-label={s.places}>
      <span class="places-label">{s.places}</span>
      {#each PLACES as place (place.id)}
        <button type="button" class="place" onclick={() => (pressure = place.bar)}>{s.placeNames[place.id]}</button>
      {/each}
    </div>
  {/snippet}
</WidgetFrame>

<style>
  .places {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .places-label {
    font-weight: 700;
    font-size: var(--text-sm);
    margin-right: var(--space-1);
  }

  .place {
    min-height: 40px;
    padding: 0 var(--space-3);
    border: 1.5px solid var(--line-strong);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--ink);
    font-weight: 700;
    font-size: 0.9rem;
  }

  .place:hover {
    border-color: var(--accent);
  }
</style>
