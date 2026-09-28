<script lang="ts">
  import type { LangCode } from '../../i18n/languages.ts';
  import { formatNumber, formatQuantity } from '../kit/format.ts';
  import Readout from '../kit/Readout.svelte';
  import Slider from '../kit/Slider.svelte';
  import Toggle from '../kit/Toggle.svelte';
  import WidgetFrame from '../kit/WidgetFrame.svelte';
  import { cop } from './model.ts';
  import { strings } from './strings.ts';

  let { lang }: { lang: LangCode } = $props();
  const s = $derived(strings[lang]);

  let outdoor = $state(7);
  let system = $state<'underfloor' | 'radiators'>('underfloor');
  const flow = $derived(system === 'underfloor' ? 35 : 55);
  const value = $derived(cop(outdoor, flow));

  const copText = $derived(formatNumber(value, lang, 1));
  const heatText = $derived(formatQuantity(value, 'kWh', lang, 1));

  const SIZE = 38;
  const GAP = 6;
  // Blocks of 1 kWh: the first is electricity, the rest (and a partial last block) came from the air.
  const blocks = $derived.by(() => {
    const full = Math.floor(value);
    const list: { x: number; width: number; kind: 'electricity' | 'air' }[] = [];
    for (let i = 0; i < full; i++) list.push({ x: 12 + i * (SIZE + GAP), width: SIZE, kind: i === 0 ? 'electricity' : 'air' });
    const rest = value - full;
    if (rest > 0.02) list.push({ x: 12 + full * (SIZE + GAP), width: SIZE * rest, kind: 'air' });
    return list;
  });
</script>

<WidgetFrame name="cop-explorer" title={s.title} hint={s.hint} {lang} onreset={() => ((outdoor = 7), (system = 'underfloor'))}>
  <svg viewBox="0 0 400 200" class="diagram" role="img" aria-label={s.picture({ outside: formatQuantity(outdoor, '°C', lang), cop: copText, heat: heatText })}>
    <text x="12" y="26" class="d-label">{s.heatPumpRow(heatText)}</text>
    {#each blocks as block, i (i)}
      <rect x={block.x} y="38" width={block.width} height={SIZE} rx="5" class={block.kind === 'electricity' ? 'd-glow' : 'd-cool'} stroke="var(--d-ink)" stroke-width="1.5" />
    {/each}

    <text x="12" y="112" class="d-label">{s.heaterRow}</text>
    <rect x="12" y="124" width={SIZE} height={SIZE} rx="5" class="d-glow" stroke="var(--d-ink)" stroke-width="1.5" />

    <rect x="12" y="180" width="16" height="16" rx="3" class="d-glow" />
    <text x="34" y="194" class="d-small">{s.electricity}</text>
    <rect x="186" y="180" width="16" height="16" rx="3" class="d-cool" />
    <text x="208" y="194" class="d-small">{s.air}</text>
  </svg>

  {#snippet controls()}
    <Slider label={s.outdoor} bind:value={outdoor} min={-20} max={15} step={1} unit="°C" {lang} />
    <Toggle
      label={s.system}
      options={[
        { value: 'underfloor', label: s.underfloor },
        { value: 'radiators', label: s.radiators },
      ]}
      bind:value={system}
    />
    <Readout label={s.cop} value={copText} tone="accent" />
    <Readout label={s.heatOut} value={heatText} tone="hot" />
  {/snippet}
</WidgetFrame>
