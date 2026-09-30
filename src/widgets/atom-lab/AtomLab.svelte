<script lang="ts">
  import { untrack } from 'svelte';
  import type { LangCode } from '../../i18n/languages.ts';
  import { hydrated } from '../kit/hydration.svelte.ts';
  import { reducedMotion, visibleLoop } from '../kit/motion.svelte.ts';
  import { settle } from '../kit/settle.ts';
  import WidgetFrame from '../kit/WidgetFrame.svelte';
  import { ELEMENTS } from './data.ts';
  import { capacity, collect, LIMITS, mostCommon, newlyDone, nucleusLayout, PARTICLES, QUESTS, seatOrder, START, view } from './model.ts';
  import type { Atom, Particle, QuestId, QuestSet } from './model.ts';
  import { strings } from './strings.ts';
  import type { Readouts } from './strings.ts';

  let { lang, quests = 'atoms' }: { lang: LangCode; quests?: QuestSet } = $props();
  const s = $derived(strings[lang]);
  const live = hydrated();
  const reduced = reducedMotion();
  const uid = $props.id();
  const set = untrack(() => quests);
  const start = START[set];
  const list = QUESTS[set];

  let atom = $state<Atom>({ ...start });
  // Quests done and elements built since the page opened (never saved).
  let done = $state<QuestId[]>([]);
  let built = $state<number[]>([]);
  let paused = $state(false);
  let clock = $state(0);

  const v = $derived(view(atom));
  const r = $derived(s.readouts(v));
  const READOUTS: (keyof Readouts)[] = ['element', 'isotope', 'charge', 'shell'];
  const moving = $derived(live.current && !paused && !reduced.current);

  // ── Drawing: coordinates around the centre of the atom ───────────────────────────────────────
  const CX = 180;
  const CY = 196;
  const RINGS = [66, 92, 118, 144];
  const SPIN = [0.55, 0.4, 0.3, 0.24]; // radians a second: inner shells a little faster
  const TILT = [0, 0.35, 0.7, 1.05]; // so the shells' electrons don't line up
  const PARTICLE = 6.2;
  const SPACING = 6.4;
  const FIT = 150; // how far from the centre the drawing may reach

  const orbits = $derived(
    v.z === 0
      ? []
      : v.shells.map((count, k) => {
          const places = capacity(k);
          const turn = -Math.PI / 2 + TILT[k]! + SPIN[k]! * clock;
          const at = (seat: number) => {
            const angle = turn + (seat * 2 * Math.PI) / places;
            return { x: RINGS[k]! * Math.cos(angle), y: RINGS[k]! * Math.sin(angle) };
          };
          const order = seatOrder(places);
          const outermost = k === v.shells.length - 1;
          return { r: RINGS[k]!, electrons: order.slice(0, count).map(at), empty: outermost ? order.slice(count).map(at) : [] };
        }),
  );

  const shortLived = $derived(v.nucleus.kind === 'short-lived');
  // Without protons nothing holds the particles, so they are drawn scattered.
  const particles = $derived(nucleusLayout(v.z, v.n, v.z === 0 ? SPACING * 2.8 : shortLived ? SPACING * 1.18 : SPACING));
  const extent = $derived(particles.reduce((far, p) => Math.max(far, Math.hypot(p.x, p.y)), 0) + PARTICLE);
  const loose = $derived(
    v.z === 0
      ? Array.from({ length: v.e }, (_, k) => {
          const angle = k * 2.39996 + 0.4;
          const radius = 104 + (36 * ((k * 7) % 10)) / 10;
          return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
        })
      : [],
  );

  // Zoom so that a small atom fills the drawing too; it eases when a shell is added or removed.
  const fit = $derived(
    Math.min(1.6, FIT / (v.z === 0 ? (v.e > 0 ? FIT : extent + 30) : v.shells.length > 0 ? RINGS[v.shells.length - 1]! + 8 : extent + 30)),
  );
  let eased = $state(untrack(() => fit));
  const zoom = $derived(moving ? eased : fit);

  // An unstable nucleus trembles: hard when it falls apart within a day, gently when it lasts longer.
  const shake = $derived.by(() => {
    const strength = shortLived ? 1.7 : v.nucleus.kind === 'radioactive' ? 0.7 : v.z === 0 ? 1 : 0;
    const t = clock;
    return strength === 0
      ? { x: 0, y: 0 }
      : { x: strength * (Math.sin(t * 31) + 0.5 * Math.sin(t * 17)), y: strength * (Math.sin(t * 27) + 0.5 * Math.sin(t * 21)) };
  });

  const tone = $derived(v.z === 0 ? 'd-muted' : v.nucleus.kind === 'stable' ? 'd-cool' : v.nucleus.kind === 'radioactive' ? 'd-warm' : 'd-hot');
  const chargeMark = $derived(v.charge === 0 ? '' : `${Math.abs(v.charge) === 1 ? '' : Math.abs(v.charge)}${v.charge > 0 ? '+' : '−'}`);
  const notation = $derived(v.z > 0 ? { a: v.a, z: v.z, symbol: v.element!.symbol } : v.n === 1 && v.e === 0 ? { a: 1, z: 0, symbol: 'n' } : null);

  // The celebration: sparks fly out from the atom for a moment (only while things may move).
  let burstAt = $state(-99);
  const SPARKS = Array.from({ length: 16 }, (_, i) => ({
    angle: (i / 16) * 2 * Math.PI + 0.2,
    reach: i % 2 === 0 ? 1 : 0.78,
    size: i % 2 === 0 ? 4.2 : 3,
    tone: ['d-glow', 'd-positive', 'd-electron', 'd-accent'][i % 4],
  }));
  const burst = $derived.by(() => {
    const t = (clock - burstAt) / 1.2;
    if (!moving || t < 0 || t > 1) return null;
    return { radius: 40 + 125 * (1 - (1 - t) ** 3), fade: 1 - t };
  });

  const tick = (dt: number) => {
    clock += dt;
    eased += (fit - eased) * (1 - Math.exp(-6 * dt));
  };

  // ── Screen readers: one settled announcement of what changed, and of quests done ─────────────
  const lines = (a: Atom) => {
    const readouts = s.readouts(view(a));
    return [...PARTICLES.map((k) => `${s.particles[k]}: ${a[k]}.`), ...READOUTS.map((k) => `${s.labels[k]}: ${readouts[k].value}.`)];
  };
  let heard = untrack(() => lines(start));
  let news: string[] = [];
  let spoken = $state('');
  const announcer = settle<Atom>((a) => {
    const now = lines(a);
    const message = [...now.filter((line, i) => line !== heard[i]), ...news].join(' ');
    heard = now;
    news = [];
    if (message) spoken = message;
  });
  $effect(() => announcer.cancel);

  let toast = $state<string[]>([]);
  let fresh = $state<QuestId[]>([]);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => () => clearTimeout(toastTimer));

  // ── Actions ──────────────────────────────────────────────────────────────────────────────────
  /** A move by the reader: the new atom, then any quest it completes and the collection. */
  function apply(next: Atom) {
    atom = next;
    const newly = newlyDone(set, done, next);
    if (newly.length > 0) {
      done = [...done, ...newly];
      const finished = done.length === list.length;
      news.push(...newly.map((id, i) => s.announceQuest(s.quests[id], done.length - newly.length + i + 1, list.length)));
      if (finished) news.push(s.allDone);
      toast = [...newly.map((id) => s.questDone(s.quests[id])), ...(finished ? [s.allDone] : [])];
      fresh = newly;
      burstAt = clock;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast = [];
        fresh = [];
      }, 3200);
    }
    const collected = collect(built, next);
    if (collected.length > built.length) built = collected;
    announcer.push(next);
  }

  function change(kind: Particle, step: 1 | -1) {
    const count = atom[kind] + step;
    if (count < 0 || count > LIMITS[kind]) return;
    apply({ ...atom, [kind]: count });
  }

  function reset() {
    clearTimeout(toastTimer);
    done = [];
    built = [];
    toast = [];
    fresh = [];
    burstAt = -99;
    atom = { ...start };
    announcer.push(atom);
  }
</script>

<WidgetFrame name="atom-lab" title={s.title} hint={s.hints[set]} {lang} onreset={reset} animated bind:paused>
  <div class="lab">
    <div class="bench">
      <div class="figure">
        <svg viewBox="0 0 360 380" class="diagram atom" role="img" aria-label={s.picture(v)} use:visibleLoop={{ tick, paused }}>
          <text x="12" y="32" class="name">{s.name(v)}</text>
          {#if notation}
            <text x="292" y="26" text-anchor="end" class="number">{notation.a}</text>
            <text x="292" y="56" text-anchor="end" class="number">{notation.z}</text>
            <text x="295" y="50" class="symbol">{notation.symbol}{#if chargeMark}<tspan dy="-24" class="number">{chargeMark}</tspan>{/if}</text>
          {/if}

          <g transform={`translate(${CX} ${CY}) scale(${zoom.toFixed(4)})`}>
            <!-- shells, with electrons and the outer shell's empty places -->
            {#each orbits as orbit, k (k)}
              <circle r={orbit.r} class="ring" />
              {#each orbit.empty as seat, i (i)}
                <circle cx={seat.x.toFixed(2)} cy={seat.y.toFixed(2)} r="4.6" class="seat" />
              {/each}
              {#each orbit.electrons as electron, i (i)}
                <g transform={`translate(${electron.x.toFixed(2)} ${electron.y.toFixed(2)})`}>
                  <circle r="5.5" class="d-electron" />
                  <path d="M-2.6 0h5.2" class="mark" />
                </g>
              {/each}
            {/each}

            <!-- the nucleus: protons (+) and neutrons, packed; the ones in the middle drawn last, on top -->
            <g transform={`translate(${shake.x.toFixed(2)} ${shake.y.toFixed(2)})`}>
              {#if v.z > 0 && v.nucleus.kind !== 'stable'}
                <circle r={extent + 7} class={shortLived ? 'd-hot' : 'd-warm'} opacity="0.22" />
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
              <circle r="22" class="placeholder" />
            {/if}
          </g>

          {#if burst}
            <g transform={`translate(${CX} ${CY})`} opacity={burst.fade.toFixed(3)}>
              <circle r={(burst.radius * 0.9).toFixed(1)} class="burst-ring" />
              {#each SPARKS as spark, i (i)}
                <circle
                  cx={(burst.radius * spark.reach * Math.cos(spark.angle)).toFixed(1)}
                  cy={(burst.radius * spark.reach * Math.sin(spark.angle)).toFixed(1)}
                  r={spark.size}
                  class={spark.tone}
                />
              {/each}
            </g>
          {/if}

          <circle cx="20" cy="360" r="7" class={tone} />
          <text x="34" y="366" class="status">{s.status(v)}</text>
        </svg>
        <p class="footnote">{s.footnote}</p>
        {#if toast.length > 0}
          <div class="toast" aria-hidden="true">
            {#each toast as line (line)}<p><span class="tick"></span>{line}</p>{/each}
          </div>
        {/if}
      </div>

      <div class="steppers">
        {#each PARTICLES as kind (kind)}
          <div class="stepper" role="group" aria-labelledby={`${uid}-${kind}`}>
            <span class="particle-name" id={`${uid}-${kind}`}>{s.particles[kind]}</span>
            <button
              type="button"
              class="step"
              aria-label={s.remove[kind]}
              aria-disabled={atom[kind] === 0 || undefined}
              disabled={!live.current}
              onclick={() => change(kind, -1)}>−</button
            >
            <span class={`count ${kind}`}>{atom[kind]}</span>
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

  {#snippet controls()}
    <div class="deck-wrap">
      <div class="deck">
        <div class="panel" role="group" aria-labelledby={`${uid}-pick`}>
          <p class="panel-title" id={`${uid}-pick`}>{s.pick}</p>
          <div class="table">
            {#each ELEMENTS as element, i (element.symbol)}
              <button
                type="button"
                class="cell"
                class:built={built.includes(i + 1)}
                style:grid-column={element.column}
                style:grid-row={element.period}
                aria-label={`${element.symbol}, ${s.elements[i]}${built.includes(i + 1) ? `, ${s.builtMark}` : ''}`}
                aria-current={atom.protons === i + 1 || undefined}
                disabled={!live.current}
                onclick={() => apply(mostCommon(i + 1))}><span class="cell-z">{i + 1}</span>{element.symbol}</button
              >
            {/each}
          </div>
          <p class="collection"><span class="key" aria-hidden="true"></span>{s.built(built.length, ELEMENTS.length)}</p>
        </div>

        <div class="panel" role="group" aria-labelledby={`${uid}-quests`}>
          <div class="quest-head">
            <p class="panel-title" id={`${uid}-quests`}>{s.questsTitle}</p>
            <p class="progress">{s.progress(done.length, list.length)}</p>
          </div>
          <div class="bar" aria-hidden="true"><span style:width={`${(100 * done.length) / list.length}%`}></span></div>
          <ol class="quests">
            {#each list as quest (quest.id)}
              {@const complete = done.includes(quest.id)}
              <li class="quest" class:complete class:fresh={fresh.includes(quest.id)}>
                <span class="tick" role="img" aria-label={complete ? s.questState.done : s.questState.open}></span>
                <span>{s.quests[quest.id]}</span>
              </li>
            {/each}
          </ol>
          {#if done.length === list.length}<p class="all-done">{s.allDone}</p>{/if}
        </div>
      </div>
    </div>
  {/snippet}
</WidgetFrame>

<style>
  .lab,
  .deck-wrap {
    container-type: inline-size;
  }

  .bench,
  .deck {
    display: grid;
    gap: var(--space-3);
  }

  .deck-wrap {
    grid-column: 1 / -1;
  }

  @container (min-width: 38rem) {
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

    .deck {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
    }
  }

  .figure {
    position: relative;
  }

  /* The drawing */
  /* Text sizes stay readable (about 14 px) when a 360 px phone shrinks the drawing to 0.73. */
  .atom .name {
    font-family: var(--font-display-stack);
    font-weight: 750;
    font-size: 25px;
  }

  .atom .symbol {
    font-family: var(--font-display-stack);
    font-weight: 750;
    font-size: 32px;
  }

  .atom .number {
    font-size: 18px;
    font-weight: 700;
  }

  .atom .status {
    font-size: 20px;
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

  .burst-ring {
    fill: none;
    stroke: var(--d-glow);
    stroke-width: 3;
  }

  .footnote {
    margin: var(--space-1) 0 0;
    text-align: center;
    font-size: 0.85rem;
    color: var(--ink-soft);
  }

  /* The short celebration */
  /* Over the status line at the bottom, so the atom that just changed stays in view. */
  .toast {
    position: absolute;
    bottom: 0;
    left: 50%;
    translate: -50% 0;
    display: grid;
    gap: var(--space-1);
    width: max-content;
    max-width: calc(100% - var(--space-2));
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    background: var(--ink);
    color: var(--paper);
    box-shadow: var(--shadow-raised);
    font-size: 0.9rem;
    font-weight: 700;
    line-height: 1.3;
    pointer-events: none;
    animation: toast-in 0.25s ease-out;
  }

  .toast p {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      translate: -50% 0.5rem;
    }
  }

  /* A tick drawn with CSS (the fonts have no ✓): a circle holding a rotated corner */
  .tick {
    flex: none;
    position: relative;
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 50%;
    background: var(--safe);
  }

  .tick::after {
    content: '';
    position: absolute;
    left: 0.45rem;
    top: 0.22rem;
    width: 0.32rem;
    height: 0.6rem;
    border: solid var(--surface);
    border-width: 0 2.5px 2.5px 0;
    rotate: 45deg;
  }

  /* Protons, neutrons, electrons: − count + */
  .steppers,
  .readouts,
  .panel {
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
    grid-template-columns: minmax(0, 1fr) var(--touch) 2.4rem var(--touch);
    align-items: center;
    gap: var(--space-2);
    font-size: 1rem;
  }

  .particle-name {
    font-weight: 700;
    hyphens: auto;
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

  .step:disabled {
    cursor: default;
    opacity: 0.6;
  }

  /* At 0 or at the limit the button stays focusable (focus must not jump away), so only its
     sign and border fade and the focus ring keeps full strength. */
  .step[aria-disabled='true'],
  .step[aria-disabled='true']:hover {
    cursor: default;
    border-color: var(--line);
    background: var(--surface);
    color: var(--line-strong);
  }

  /* The count sits in a ball of its particle's colour, like the ones in the drawing. */
  .count {
    display: grid;
    place-items: center;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    color: var(--d-fill);
    font-family: var(--font-display-stack);
    font-size: 1.25rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .count.protons {
    background: var(--d-positive);
  }

  .count.neutrons {
    background: var(--d-muted);
  }

  .count.electrons {
    background: var(--d-electron);
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

  /* Panels below: the table and the quests */
  .panel {
    padding: var(--space-3);
  }

  .panel-title {
    margin: 0 0 var(--space-2);
    font-weight: 700;
    font-size: var(--text-sm);
  }

  .table {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 2px;
    max-width: 26rem;
  }

  .cell {
    position: relative;
    min-width: 0;
    min-height: var(--touch);
    padding: 0.6rem 0 0;
    border: 1.5px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    font-family: var(--font-display-stack);
    font-size: 0.9rem;
    font-weight: 750;
    line-height: 1;
    white-space: nowrap;
  }

  @container (min-width: 22rem) {
    .table {
      gap: 3px;
    }

    .cell {
      font-size: 1rem;
    }
  }

  .cell-z {
    position: absolute;
    top: 3px;
    left: 4px;
    font-family: var(--font-body-stack);
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--ink-soft);
  }

  .cell.built {
    background: var(--accent-soft);
  }

  .cell:enabled:hover {
    border-color: var(--accent);
  }

  .cell[aria-current='true'] {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
  }

  .cell[aria-current='true'] .cell-z {
    color: inherit;
  }

  .cell:disabled {
    cursor: default;
  }

  .collection {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: var(--space-2) 0 0;
    font-size: 0.85rem;
    color: var(--ink-soft);
  }

  .key {
    width: 0.9rem;
    height: 0.9rem;
    border: 1.5px solid var(--line-strong);
    border-radius: 3px;
    background: var(--accent-soft);
  }

  .quest-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-2);
  }

  .progress {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ink-soft);
  }

  .bar {
    height: 6px;
    margin-bottom: var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--line);
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    background: var(--safe);
    transition: width 0.4s ease-out;
  }

  .quests {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 1rem;
  }

  .quest {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: 0.3rem 0.4rem;
    border-radius: var(--radius-sm);
    line-height: 1.35;
  }

  .quest .tick {
    margin-top: 0.05rem;
    background: transparent;
    border: 2px solid var(--line-strong);
  }

  .quest .tick::after {
    display: none;
  }

  .quest.complete .tick {
    background: var(--safe);
    border-color: var(--safe);
  }

  .quest.complete .tick::after {
    display: block;
    left: 0.35rem;
    top: 0.12rem;
  }

  .quest.fresh {
    animation: flash 1.6s ease-out;
  }

  @keyframes flash {
    from {
      background: var(--highlight-soft);
    }
  }

  .all-done {
    margin: var(--space-2) 0 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--safe);
  }
</style>
