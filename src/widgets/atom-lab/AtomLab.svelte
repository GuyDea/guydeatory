<script lang="ts">
  import { untrack } from 'svelte';
  import type { LangCode } from '../../i18n/languages.ts';
  import { hydrated } from '../kit/hydration.svelte.ts';
  import { visibleLoop } from '../kit/motion.svelte.ts';
  import { settle } from '../kit/settle.ts';
  import WidgetFrame from '../kit/WidgetFrame.svelte';
  import { capacity, LIMITS, nucleusLayout, PARTICLES, seatOrder, START, view } from './model.ts';
  import type { Atom, Particle, QuestSet } from './model.ts';
  import { strings } from './strings.ts';
  import type { Readouts } from './strings.ts';

  let { lang, quests = 'atoms' }: { lang: LangCode; quests?: QuestSet } = $props();
  const s = $derived(strings[lang]);
  const live = hydrated();
  const uid = $props.id();
  const start = untrack(() => START[quests]);

  let atom = $state<Atom>({ ...start });
  let paused = $state(false);
  let clock = $state(0);

  const v = $derived(view(atom));
  const r = $derived(s.readouts(v));
  const READOUTS: (keyof Readouts)[] = ['element', 'isotope', 'charge', 'shell'];

  // ── Drawing ──────────────────────────────────────────────────────────────────────────────────
  const CX = 180;
  const CY = 196;
  const RINGS = [66, 92, 118, 144];
  const SPIN = [0.55, 0.4, 0.3, 0.24]; // radians a second: inner shells a little faster
  const TILT = [0, 0.35, 0.7, 1.05]; // so the shells' electrons don't line up
  const PARTICLE = 6.2;
  const SPACING = 6.4;

  const orbits = $derived(
    v.z === 0
      ? []
      : v.shells.map((count, k) => {
          const places = capacity(k);
          const order = seatOrder(places);
          const turn = -Math.PI / 2 + TILT[k]! + SPIN[k]! * clock;
          const at = (seat: number) => {
            const angle = turn + (seat * 2 * Math.PI) / places;
            return { x: CX + RINGS[k]! * Math.cos(angle), y: CY + RINGS[k]! * Math.sin(angle) };
          };
          const outermost = k === v.shells.length - 1;
          return { r: RINGS[k]!, electrons: order.slice(0, count).map(at), empty: outermost ? order.slice(count).map(at) : [] };
        }),
  );

  const unbound = $derived(v.nucleus.kind === 'unbound');
  // Without protons nothing holds the particles, so they are drawn scattered.
  const particles = $derived(nucleusLayout(v.z, v.n, v.z === 0 ? SPACING * 2.8 : unbound ? SPACING * 1.18 : SPACING));
  const extent = $derived(particles.reduce((far, p) => Math.max(far, Math.hypot(p.x, p.y)), 0) + PARTICLE);
  const loose = $derived(
    v.z === 0
      ? Array.from({ length: v.e }, (_, k) => {
          const angle = k * 2.39996 + 0.4;
          const radius = 104 + 36 * ((k * 7) % 10) / 10;
          return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) };
        })
      : [],
  );

  // An unstable nucleus trembles: hard when it falls apart quickly, gently when it is radioactive.
  const shake = $derived.by(() => {
    const strength = unbound ? 1.7 : v.nucleus.kind === 'radioactive' ? 0.7 : v.z === 0 ? 1 : 0;
    if (strength === 0) return { x: 0, y: 0 };
    const t = clock;
    return { x: strength * (Math.sin(t * 31) + 0.5 * Math.sin(t * 17)), y: strength * (Math.sin(t * 27 + 1) - Math.sin(1) + 0.5 * Math.sin(t * 21)) };
  });

  const tone = $derived(
    v.z === 0 ? 'd-muted' : v.nucleus.kind === 'stable' ? 'd-cool' : v.nucleus.kind === 'radioactive' ? 'd-warm' : 'd-hot',
  );
  const chargeMark = $derived(v.charge === 0 ? '' : `${Math.abs(v.charge) === 1 ? '' : Math.abs(v.charge)}${v.charge > 0 ? '+' : '−'}`);
  const notation = $derived(
    v.z > 0 ? { a: v.a, z: v.z, symbol: v.element!.symbol } : v.n === 1 && v.e === 0 ? { a: 1, z: 0, symbol: 'n' } : null,
  );

  const tick = (dt: number) => {
    clock += dt;
  };

  // ── Screen readers: one settled announcement of what changed ─────────────────────────────────
  const lines = (a: Atom) => {
    const readouts = s.readouts(view(a));
    return [...PARTICLES.map((k) => `${s.particles[k]}: ${a[k]}.`), ...READOUTS.map((k) => `${s.labels[k]}: ${readouts[k].value}.`)];
  };
  let heard = untrack(() => lines(start));
  let spoken = $state('');
  const announcer = settle<Atom>((a) => {
    const now = lines(a);
    const changed = now.filter((line, i) => line !== heard[i]);
    heard = now;
    if (changed.length > 0) spoken = changed.join(' ');
  });
  $effect(() => announcer.cancel);

  // ── Actions ──────────────────────────────────────────────────────────────────────────────────
  function apply(next: Atom) {
    atom = next;
    announcer.push(next);
  }

  function change(kind: Particle, step: 1 | -1) {
    const count = atom[kind] + step;
    if (count < 0 || count > LIMITS[kind]) return;
    apply({ ...atom, [kind]: count });
  }

  function reset() {
    apply({ ...start });
  }
</script>

<WidgetFrame name="atom-lab" title={s.title} hint={s.hints[quests]} {lang} onreset={reset} animated bind:paused>
  <div class="lab">
    <div class="bench">
      <div class="figure">
        <svg viewBox="0 0 360 380" class="diagram atom" role="img" aria-label={s.picture(v)} use:visibleLoop={{ tick, paused }}>
          <text x="12" y="32" class="name">{s.name(v)}</text>
          {#if notation}
            <g class="notation">
              <text x="292" y="26" text-anchor="end" class="number">{notation.a}</text>
              <text x="292" y="56" text-anchor="end" class="number">{notation.z}</text>
              <text x="295" y="50" class="symbol">{notation.symbol}{#if chargeMark}<tspan dy="-24" class="number">{chargeMark}</tspan>{/if}</text>
            </g>
          {/if}

          <!-- shells, with electrons and the outer shell's empty places -->
          {#each orbits as orbit, k (k)}
            <circle cx={CX} cy={CY} r={orbit.r} class="ring" />
            {#each orbit.empty as seat, i (i)}
              <circle cx={seat.x} cy={seat.y} r="4.6" class="seat" />
            {/each}
            {#each orbit.electrons as electron, i (i)}
              <g transform={`translate(${electron.x.toFixed(2)} ${electron.y.toFixed(2)})`}>
                <circle r="5.5" class="d-electron" />
                <path d="M-2.6 0h5.2" class="mark" />
              </g>
            {/each}
          {/each}

          <!-- the nucleus: protons (+) and neutrons, packed; the ones in the middle drawn last, on top -->
          <g transform={`translate(${(CX + shake.x).toFixed(2)} ${(CY + shake.y).toFixed(2)})`}>
            {#if v.z > 0 && v.nucleus.kind !== 'stable'}
              <circle r={extent + 7} class={unbound ? 'd-hot' : 'd-warm'} opacity="0.22" />
            {/if}
            {#each [...particles].reverse() as p, i (i)}
              <g transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`}>
                <circle r={PARTICLE} class={p.proton ? 'particle d-positive' : 'particle d-muted'} />
                {#if p.proton}<path d="M-3 0h6M0 -3v6" class="mark" />{/if}
              </g>
            {/each}
          </g>
          {#each loose as electron, i (i)}
            <g transform={`translate(${electron.x.toFixed(2)} ${electron.y.toFixed(2)})`}>
              <circle r="5.5" class="d-electron" />
              <path d="M-2.6 0h5.2" class="mark" />
            </g>
          {/each}
          {#if v.z === 0 && v.n === 0 && v.e === 0}
            <circle cx={CX} cy={CY} r="22" class="placeholder" />
          {/if}

          <circle cx="20" cy="360" r="7" class={tone} />
          <text x="34" y="366" class="status">{s.status(v)}</text>
        </svg>
        <p class="footnote">{s.footnote}</p>
      </div>

      <div class="steppers">
        {#each PARTICLES as kind (kind)}
          <div class="stepper" role="group" aria-labelledby={`${uid}-${kind}`}>
            <span class={`swatch ${kind}`} aria-hidden="true">{kind === 'protons' ? '+' : kind === 'electrons' ? '−' : ''}</span>
            <span class="particle-name" id={`${uid}-${kind}`}>{s.particles[kind]}</span>
            <button
              type="button"
              class="step"
              aria-label={s.remove[kind]}
              aria-disabled={atom[kind] === 0 || undefined}
              disabled={!live.current}
              onclick={() => change(kind, -1)}>−</button
            >
            <span class="count">{atom[kind]}</span>
            <button
              type="button"
              class="step"
              aria-label={s.add[kind]}
              aria-disabled={atom[kind] === LIMITS[kind] || undefined}
              disabled={!live.current}
              onclick={() => change(kind, 1)}>+</button
            >
          </div>
        {/each}
      </div>

      <dl class="readouts">
        {#each READOUTS as key (key)}
          <div class="readout">
            <dt>{s.labels[key]}</dt>
            <dd><span class="value">{r[key].value}</span> <span class="detail">{r[key].detail}</span></dd>
          </div>
        {/each}
      </dl>
    </div>
    <p class="visually-hidden" aria-live="polite" aria-atomic="true">{spoken}</p>
  </div>
</WidgetFrame>

<style>
  .lab {
    container: atomlab / inline-size;
  }

  .bench {
    display: grid;
    gap: var(--space-3);
  }

  @container atomlab (min-width: 38rem) {
    .bench {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
      grid-template-areas:
        'figure steppers'
        'figure readouts';
      grid-template-rows: auto 1fr;
      align-items: start;
    }

    .figure {
      grid-area: figure;
    }

    .steppers {
      grid-area: steppers;
    }

    .readouts {
      grid-area: readouts;
    }
  }

  .figure {
    position: relative;
  }

  /* The drawing */
  .atom .name {
    font-family: var(--font-display-stack);
    font-weight: 750;
    font-size: 24px;
  }

  .atom .symbol {
    font-family: var(--font-display-stack);
    font-weight: 750;
    font-size: 32px;
  }

  .atom .number {
    font-size: 16px;
    font-weight: 700;
  }

  .atom .status {
    font-size: 19px;
    font-weight: 700;
  }

  .ring {
    fill: none;
    stroke: var(--d-muted);
    stroke-width: 1.5;
    opacity: 0.5;
  }

  .seat {
    fill: none;
    stroke: var(--d-electron);
    stroke-width: 1.5;
    stroke-dasharray: 2.2 2.2;
    opacity: 0.8;
  }

  .particle {
    stroke: var(--d-fill);
    stroke-width: 1.2;
  }

  .mark {
    fill: none;
    stroke: var(--d-fill);
    stroke-width: 1.7;
    stroke-linecap: round;
  }

  .placeholder {
    fill: none;
    stroke: var(--d-muted);
    stroke-width: 2;
    stroke-dasharray: 5 5;
  }

  .footnote {
    margin: var(--space-1) 0 0;
    text-align: center;
    font-size: 0.85rem;
    color: var(--ink-soft);
  }

  /* Protons, neutrons, electrons: − count + */
  .steppers,
  .readouts {
    margin: 0;
    background: var(--surface);
    border: 1.5px solid var(--line);
    border-radius: var(--radius-md);
  }

  .steppers {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
  }

  .stepper {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) var(--touch) 2.4rem var(--touch);
    align-items: center;
    gap: var(--space-2);
  }

  .swatch {
    display: grid;
    place-items: center;
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 50%;
    color: var(--d-fill);
    font-weight: 800;
    line-height: 1;
  }

  .swatch.protons {
    background: var(--d-positive);
  }

  .swatch.neutrons {
    background: var(--d-muted);
  }

  .swatch.electrons {
    width: 1.1rem;
    height: 1.1rem;
    margin-inline: 0.125rem;
    background: var(--d-electron);
  }

  .particle-name {
    font-weight: 700;
  }

  .step {
    width: var(--touch);
    height: var(--touch);
    padding: 0;
    border: 1.5px solid var(--line-strong);
    border-radius: 50%;
    background: var(--surface);
    color: var(--ink);
    font-family: var(--font-display-stack);
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1;
  }

  .step:enabled:hover {
    border-color: var(--accent);
  }

  .step:enabled:active {
    background: var(--accent-soft);
  }

  .step:disabled,
  .step[aria-disabled='true'] {
    cursor: default;
    opacity: 0.45;
  }

  .step[aria-disabled='true']:hover {
    border-color: var(--line-strong);
  }

  .count {
    font-family: var(--font-display-stack);
    font-size: 1.5rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  /* Readouts */
  .readouts {
    padding: 0 var(--space-3);
  }

  .readout {
    padding: var(--space-2) 0;
  }

  .readout + .readout {
    border-top: 1px solid var(--line);
  }

  dt {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ink-soft);
  }

  dd {
    margin: 0;
  }

  .value {
    display: block;
    font-family: var(--font-display-stack);
    font-size: 1.15rem;
    font-weight: 750;
    line-height: 1.3;
  }

  .detail {
    display: block;
    font-size: 0.9rem;
    line-height: 1.45;
    color: var(--ink-soft);
  }
</style>
