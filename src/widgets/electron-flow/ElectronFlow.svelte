<script lang="ts">
  import type { LangCode } from '../../i18n/languages.ts';
  import { formatQuantity } from '../kit/format.ts';
  import { hotspot } from '../kit/hotspot.ts';
  import { hydrated } from '../kit/hydration.svelte.ts';
  import { visibleLoop } from '../kit/motion.svelte.ts';
  import Readout from '../kit/Readout.svelte';
  import Slider from '../kit/Slider.svelte';
  import Toggle from '../kit/Toggle.svelte';
  import WidgetFrame from '../kit/WidgetFrame.svelte';
  import { flow, MAX_VOLTS } from './model.ts';
  import { strings } from './strings.ts';

  let { lang }: { lang: LangCode } = $props();
  const s = $derived(strings[lang]);
  const live = hydrated();

  let volts = $state(4.5);
  let switchState = $state<'open' | 'closed'>('open');
  let paused = $state(false);
  let offset = $state(0);
  const closed = $derived(switchState === 'closed');
  const result = $derived(flow({ volts, closed }));

  // The loop, starting at the battery's minus end and ending at its plus end (electron direction).
  const SEGMENTS: [number, number, number, number][] = [
    [160, 205, 60, 205],
    [60, 205, 60, 45],
    [60, 45, 340, 45],
    [340, 45, 340, 205],
    [340, 205, 240, 205],
  ];
  const LENGTHS = SEGMENTS.map(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1));
  const TOTAL = LENGTHS.reduce((a, b) => a + b, 0);
  const COUNT = 22;
  const GAP = { top: 95, bottom: 150 }; // where the switch sits on the left wire

  function pointAt(distance: number): [number, number] {
    let rest = ((distance % TOTAL) + TOTAL) % TOTAL;
    for (let i = 0; i < SEGMENTS.length; i++) {
      const [x1, y1, x2, y2] = SEGMENTS[i]!;
      if (rest <= LENGTHS[i]!) {
        const t = rest / LENGTHS[i]!;
        return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
      }
      rest -= LENGTHS[i]!;
    }
    return [SEGMENTS[0]![0], SEGMENTS[0]![1]];
  }

  const electrons = $derived(
    Array.from({ length: COUNT }, (_, i) => pointAt((i * TOTAL) / COUNT + offset)).filter(
      ([x, y]) => (closed || !(x === 60 && y > GAP.top && y < GAP.bottom)) && Math.hypot(x - 200, y - 45) > 26,
    ),
  );

  const tick = (dt: number) => {
    offset += result.amps * 20 * dt;
  };

  const bulbState = $derived(result.glow === 0 ? 0 : result.glow < 0.15 ? 1 : result.glow < 0.6 ? 2 : 3);
  const voltsText = $derived(formatQuantity(volts, 'V', lang, 1));
  const ampsText = $derived(formatQuantity(result.amps, 'A', lang, 2));
  const flowing = $derived(result.amps > 0);

  function toggleSwitch() {
    switchState = closed ? 'open' : 'closed';
  }

  function reset() {
    volts = 4.5;
    switchState = 'open';
    offset = 0;
  }
</script>

<WidgetFrame name="electron-flow" title={s.title} hint={s.hint} {lang} onreset={reset} animated bind:paused>
  <svg
    viewBox="0 0 400 250"
    class="diagram"
    role="group"
    aria-label={s.picture({ closed, volts: voltsText, amps: ampsText, bulb: s.bulbStates[bulbState] })}
    use:visibleLoop={{ tick, paused }}
  >
    <!-- wires (with a gap where the switch is) -->
    <path d={`M160 205H60V${GAP.bottom}M60 ${GAP.top}V45H340V205H240`} class="d-wire" />
    <!-- bulb glow -->
    {#if result.glow > 0}
      <circle cx="200" cy="45" r={30 + 34 * result.glow} class="d-glow" opacity={0.18 + 0.3 * result.glow} />
    {/if}
    <circle cx="200" cy="45" r="24" class="d-box" />
    <circle cx="200" cy="45" r="24" class="d-glow" opacity={result.glow === 0 ? 0 : 0.35 + 0.65 * result.glow} />
    <path d="M190 53c3-12 7-12 10 0s7 12 10 0" class="d-line" />
    <text x="200" y="100" text-anchor="middle" class="d-label">{s.bulb}</text>
    <!-- battery -->
    <rect x="160" y="185" width="80" height="40" rx="7" class="d-box" />
    <rect x="240" y="196" width="7" height="18" rx="2" class="d-box" />
    <text x="176" y="212" class="d-label">−</text>
    <text x="214" y="212" class="d-label">+</text>
    <text x="200" y="246" text-anchor="middle" class="d-small">{s.battery}: {voltsText}</text>
    <!-- electrons -->
    {#each electrons as [x, y], i (i)}
      <circle cx={x} cy={y} r="5.5" class="d-electron" />
    {/each}
    <!-- flow arrows (always shown when current flows; the only motion cue with reduced motion) -->
    {#if flowing}
      <path d="M80 185V160" class="d-line d-arrow-electron" />
      <path d="M110 65H150" class="d-line d-arrow-electron" />
      <path d="M320 70V110" class="d-line d-arrow-electron" />
    {/if}
    <!-- the switch: click it -->
    <g class="switch" {...hotspot(live.current, s.toggleSwitch, toggleSwitch, closed)}>
      <rect x="20" y={GAP.top - 10} width="80" height={GAP.bottom - GAP.top + 20} fill="transparent" />
      <circle cx="60" cy={GAP.bottom} r="6" class="d-box" />
      <circle cx="60" cy={GAP.top} r="6" class="d-box" />
      <path
        d={closed ? `M60 ${GAP.bottom}L60 ${GAP.top}` : `M60 ${GAP.bottom}L28 ${GAP.top + 8}`}
        class="d-wire lever"
      />
    </g>
    <text x="80" y={GAP.top + 32} class="d-small d-muted">{closed ? s.closed : s.open}</text>
  </svg>

  {#snippet controls()}
    <Toggle
      label={s.switch}
      options={[
        { value: 'open', label: s.open },
        { value: 'closed', label: s.closed },
      ]}
      bind:value={switchState}
    />
    <Slider label={s.voltage} bind:value={volts} min={0} max={MAX_VOLTS} step={1.5} unit="V" digits={1} {lang} />
    <Readout label={s.current} value={ampsText} tone="accent" />
    <Readout label={s.bulb} value={s.bulbStates[bulbState]} />
  {/snippet}
</WidgetFrame>

<style>
  .switch[role='button'] {
    cursor: pointer;
  }

  .switch:focus-visible {
    outline: none;
  }

  .switch:focus-visible .lever {
    stroke: var(--focus);
  }
</style>
