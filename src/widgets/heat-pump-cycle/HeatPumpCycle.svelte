<script lang="ts">
  import type { LangCode } from '../../i18n/languages.ts';
  import { formatQuantity } from '../kit/format.ts';
  import { visibleLoop } from '../kit/motion.svelte.ts';
  import Readout from '../kit/Readout.svelte';
  import Slider from '../kit/Slider.svelte';
  import Toggle from '../kit/Toggle.svelte';
  import WidgetFrame from '../kit/WidgetFrame.svelte';
  import { cycleStates, OUTDOOR_RANGE } from './model.ts';
  import type { Mode } from './model.ts';
  import { strings } from './strings.ts';
  import type { Part } from './strings.ts';

  let { lang }: { lang: LangCode } = $props();
  const s = $derived(strings[lang]);

  const DEFAULTS: Record<Mode, { outdoor: number; indoor: number }> = {
    heating: { outdoor: 0, indoor: 21 },
    cooling: { outdoor: 32, indoor: 25 },
  };

  let mode = $state<Mode>('heating');
  let outdoor = $state(0);
  let selected = $state<Part | null>(null);
  let paused = $state(false);
  let flowOffset = $state(0);

  const indoor = $derived(DEFAULTS[mode].indoor);
  const states = $derived(cycleStates(mode, outdoor, indoor));
  const heating = $derived(mode === 'heating');

  // Loop segments, each drawn in the direction the refrigerant flows. Roles decide the colour.
  type Role = 'hot' | 'warm' | 'cold' | 'cool';
  const segments = $derived.by((): { d: string; role: Role; label: [number, number]; temp: number }[] => {
    const condensing = heating ? states.indoorCoil : states.outdoorCoil;
    const liquid = condensing - 3;
    const suction = (heating ? states.outdoorCoil : states.indoorCoil) + 5;
    return heating
      ? [
          { d: 'M186 268H92V192', role: 'hot', label: [124, 290], temp: states.afterCompressor },
          { d: 'M92 140V96H196', role: 'warm', label: [120, 86], temp: liquid },
          { d: 'M224 96H336V140', role: 'cold', label: [290, 86], temp: states.afterValve },
          { d: 'M336 212V268H234', role: 'cool', label: [296, 290], temp: suction },
        ]
      : [
          { d: 'M234 268H336V212', role: 'hot', label: [296, 290], temp: states.afterCompressor },
          { d: 'M336 140V96H224', role: 'warm', label: [290, 86], temp: liquid },
          { d: 'M196 96H92V140', role: 'cold', label: [120, 86], temp: states.afterValve },
          { d: 'M92 192V268H186', role: 'cool', label: [124, 290], temp: suction },
        ];
  });

  const temp = (celsius: number) => formatQuantity(Math.round(celsius), '°C', lang);

  const tick = (dt: number) => {
    flowOffset += 28 * dt;
  };

  function setMode(next: Mode) {
    mode = next;
    outdoor = DEFAULTS[next].outdoor;
  }

  function choose(part: Part) {
    selected = selected === part ? null : part;
  }

  const keyChoose = (part: Part) => (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(part);
    }
  };
</script>

<WidgetFrame
  name="heat-pump-cycle"
  title={s.title}
  hint={s.hint}
  {lang}
  onreset={() => ((selected = null), setMode('heating'))}
  animated
  bind:paused
>
  <svg
    viewBox="0 0 420 305"
    class="diagram"
    role="group"
    aria-label={s.picture({ mode, outside: temp(outdoor), inside: temp(indoor) })}
    use:visibleLoop={{ tick, paused }}
  >
    <!-- the house (inside) and the weather (outside) -->
    <path d="M8 70 104 18 200 70V300H8Z" class="d-box-alt" />
    <text x="18" y="228" class="d-small">{s.inside}</text>
    <text x="18" y="248" class="d-small temp">{temp(indoor)}</text>
    <text x="232" y="32" class="d-small">{s.outside}: {temp(outdoor)}</text>
    {#if heating}
      <g class="d-cool" transform="translate(392 26)">
        <path d="M0-14V14M-12-7 12 7M-12 7 12-7" stroke="var(--d-cold)" stroke-width="3" stroke-linecap="round" />
      </g>
    {:else}
      <circle cx="392" cy="26" r="12" class="d-glow" />
    {/if}

    <!-- pipes: dark casing, temperature colour, moving dashes = refrigerant flow -->
    {#each segments as seg (seg.d)}
      <path d={seg.d} fill="none" stroke="var(--d-wire)" stroke-width="11" stroke-linejoin="round" />
      <path d={seg.d} fill="none" class={`pipe pipe-${seg.role}`} stroke-width="6" stroke-linejoin="round" />
      <path d={seg.d} fill="none" class="flow" stroke-width="4" stroke-dasharray="3 13" stroke-dashoffset={-flowOffset} stroke-linecap="round" />
      <text x={seg.label[0]} y={seg.label[1]} text-anchor="middle" class="d-small temp">{temp(seg.temp)}</text>
    {/each}

    <!-- heat arrows: into the house in winter, out of the house in summer (one path per arrow) -->
    {#each heating ? ['M150 154H188', 'M150 180H188', 'M300 238V216', 'M372 238V216'] : ['M188 154H150', 'M188 180H150', 'M300 216V238', 'M372 216V238'] as d (d)}
      <path {d} class="d-line d-arrow-hot" stroke-width="3" />
    {/each}
    <text x="169" y="143" text-anchor="middle" class="d-small heat-label">{s.heat}</text>
    <text x="300" y="256" text-anchor="middle" class="d-small heat-label">{s.heat}</text>

    <!-- parts (clickable) -->
    <g class="part" class:active={selected === 'indoor'} role="button" tabindex="0" aria-label={s.partNames.indoor} onclick={() => choose('indoor')} onkeydown={keyChoose('indoor')}>
      <rect x="40" y="140" width="104" height="52" rx="8" class="d-box" />
      <path d="M52 150h80M52 160h80M52 170h80M52 180h80" class="d-line" style="stroke: var(--d-muted)" />
    </g>
    <g class="part" class:active={selected === 'outdoor'} role="button" tabindex="0" aria-label={s.partNames.outdoor} onclick={() => choose('outdoor')} onkeydown={keyChoose('outdoor')}>
      <rect x="282" y="140" width="110" height="72" rx="8" class="d-box" />
      <circle cx="337" cy="176" r="24" fill="none" stroke="var(--d-ink)" stroke-width="2" />
      <path d="M337 176l0-20M337 176l17 10M337 176l-17 10" class="d-line" />
    </g>
    <g class="part" class:active={selected === 'valve'} role="button" tabindex="0" aria-label={s.partNames.valve} onclick={() => choose('valve')} onkeydown={keyChoose('valve')}>
      <path d="M196 84V108L210 96ZM224 84V108L210 96Z" class="d-box" />
    </g>
    <g class="part" class:active={selected === 'compressor'} role="button" tabindex="0" aria-label={s.partNames.compressor} onclick={() => choose('compressor')} onkeydown={keyChoose('compressor')}>
      <circle cx="210" cy="268" r="25" class="d-box" />
      <path d="M198 276 210 258 222 276" class="d-line" stroke-width="3" />
    </g>
  </svg>
  <p class="part-info" aria-live="polite">
    {#if selected}
      <strong>{s.partNames[selected]}:</strong> {s.describe(selected, mode)}
    {:else}
      {s.pickHint}
    {/if}
  </p>

  {#snippet controls()}
    <Toggle
      label={s.season}
      options={[
        { value: 'heating', label: s.heating },
        { value: 'cooling', label: s.cooling },
      ]}
      bind:value={() => mode, (next) => setMode(next as Mode)}
    />
    <Slider label={s.outdoorTemp} bind:value={outdoor} min={OUTDOOR_RANGE[mode][0]} max={OUTDOOR_RANGE[mode][1]} step={1} unit="°C" {lang} />
    <Readout label={s.heatMoved} value={s.heatDirection[mode]} tone="hot" compact />
    <div class="part-buttons" role="group" aria-label={s.parts}>
      <span class="part-buttons-label">{s.parts}</span>
      {#each ['compressor', 'indoor', 'valve', 'outdoor'] as const as part (part)}
        <button type="button" class="part-button" aria-pressed={selected === part} onclick={() => choose(part)}>{s.partNames[part]}</button>
      {/each}
    </div>
  {/snippet}
</WidgetFrame>

<style>
  .pipe-hot {
    stroke: var(--d-hot);
  }

  .pipe-warm {
    stroke: var(--d-warm);
  }

  .pipe-cool {
    stroke: var(--d-cool);
  }

  .pipe-cold {
    stroke: var(--d-cold);
  }

  .flow {
    stroke: var(--surface);
    opacity: 0.85;
  }

  .temp {
    font-weight: 700;
    font-size: 17px;
  }

  .heat-label {
    fill: var(--hot);
    font-weight: 700;
  }

  .part {
    cursor: pointer;
  }

  .part:focus-visible {
    outline: none;
  }

  .part.active :global(.d-box),
  .part:focus-visible :global(.d-box) {
    stroke: var(--focus);
    stroke-width: 4;
  }

  .part-info {
    min-height: 3.2em;
    margin: var(--space-2) auto 0;
    max-width: 34rem;
    font-size: var(--text-sm);
  }

  .part-buttons {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .part-buttons-label {
    font-weight: 700;
    font-size: var(--text-sm);
    margin-right: var(--space-1);
  }

  .part-button {
    min-height: var(--touch);
    padding: 0 var(--space-3);
    border: 1.5px solid var(--line-strong);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--ink);
    font-weight: 700;
    font-size: 0.9rem;
  }

  .part-button[aria-pressed='true'] {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
</style>
