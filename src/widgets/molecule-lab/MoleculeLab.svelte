<script lang="ts">
  /**
   * A molecular construction kit: put atoms on the board, join them, and collect the molecules you
   * make. The chemistry is in model.ts, the drawing positions in layout.ts, the named molecules
   * and quests in molecules.ts. Nothing is saved: a new visit starts again.
   */
  import { tick, untrack } from 'svelte';
  import type { LangCode } from '../../i18n/languages.ts';
  import Button from '../kit/Button.svelte';
  import { hotspot } from '../kit/hotspot.ts';
  import { hydrated } from '../kit/hydration.svelte.ts';
  import { reducedMotion, visibleLoop } from '../kit/motion.svelte.ts';
  import { settle } from '../kit/settle.ts';
  import WidgetFrame from '../kit/WidgetFrame.svelte';
  import { DARK_INK, layout, RADIUS, viewBox } from './layout.ts';
  import type { Placed, Point } from './layout.ts';
  import {
    addAtom,
    bond,
    buildBoard,
    charge,
    elementOf,
    freeValence,
    ionNotation,
    isMetal,
    linkBetween,
    linksOf,
    loosen,
    moleculeShape,
    partialCharges,
    removeAtom,
  } from './model.ts';
  import type { Board, El, Link, MoleculeShape } from './model.ts';
  import { INITIAL, MOLECULES, QUESTS, report } from './molecules.ts';
  import type { Molecule, MoleculeId, ReportItem } from './molecules.ts';
  import { cap, strings } from './strings.ts';

  let { lang }: { lang: LangCode } = $props();
  const s = $derived(strings[lang]);
  const live = hydrated();
  const reduced = reducedMotion();
  const uid = $props.id();
  const shine = `molecule-lab-shine-${uid}`;

  /** Tap radius around each atom: at least 44 px on a 360 px phone. */
  const HIT = 27;
  const NONMETALS: El[] = ['H', 'C', 'N', 'O', 'F', 'S', 'Cl'];
  const METALS: El[] = ['Na', 'Mg'];
  const FIRST = layout(INITIAL.board, INITIAL.seeds);
  const firstFinds = (): MoleculeId[] =>
    report(INITIAL.board).items.flatMap((item) => (item.complete && item.molecule ? [item.molecule.id] : []));

  type Subject = { kind: 'atom'; id: number } | { kind: 'entry'; id: MoleculeId } | null;
  interface Flight {
    key: number;
    from: number;
    to: number;
    t: number;
  }

  let board = $state.raw<Board>(INITIAL.board);
  /** Where each atom is going; `shown` is where it is drawn while it glides there. */
  let targets = $state.raw<Record<number, Placed>>(FIRST);
  let shown = $state.raw<Record<number, Point>>(FIRST);
  let moving = $state(false);
  /** Electrons jumping from a metal to a nonmetal. */
  let flights = $state.raw<Flight[]>([]);
  let selected = $state<number | null>(null);
  let status = $state('');
  /** What the card under the board describes: the molecule an atom belongs to, or a collected molecule. */
  let subject = $state<Subject>({ kind: 'atom', id: 0 });
  let found = $state.raw<MoleculeId[]>(firstFinds());
  let party = $state<{ key: number; ids: number[] } | null>(null);
  let freshQuest = $state<MoleculeId | null>(null);
  /** Counts how often each atom was joined, so its little "snap" animation restarts every time. */
  let pops = $state.raw<Record<number, number>>({});
  let svg = $state<SVGSVGElement>();
  let serial = 0;

  const rep = $derived(report(board));
  const box = $derived(viewBox(targets));
  const finished = $derived(rep.items.filter((item) => item.complete));
  const questsDone = $derived(QUESTS.filter((quest) => found.includes(quest)).length);
  const deltas = $derived.by(() => {
    const marks: Record<number, 1 | -1> = {};
    for (const item of rep.items) if (item.molecule?.polarity === 'polar') Object.assign(marks, partialCharges(board, item.ids));
    return marks;
  });
  /** Atoms the picked atom could join right now: they get a dashed ring. */
  const partners = $derived.by(() => {
    const ids = new Set<number>();
    const picked = selected;
    if (picked === null || !board.atoms.some((atom) => atom.id === picked)) return ids;
    for (const atom of board.atoms) if (atom.id !== picked && bond(board, picked, atom.id).ok) ids.add(atom.id);
    return ids;
  });

  const el = (id: number) => elementOf(board, id);
  const at = (id: number): Point => (reduced.current ? targets[id] : (shown[id] ?? targets[id])) ?? { x: 0, y: 0 };
  const round = (n: number) => Math.round(n * 100) / 100;
  const deg = (rad: number) => round((rad * 180) / Math.PI);

  /** The widest free direction around an atom (away from its bonds and hands), for its δ or charge mark. */
  function freeSide(id: number): number {
    const p = at(id);
    const taken = [
      ...linksOf(board, id).map(({ other }) => Math.atan2(at(other).y - p.y, at(other).x - p.x)),
      ...(targets[id]?.hands ?? []).map((h) => Math.atan2(Math.sin(h), Math.cos(h))),
    ].sort((a, b) => a - b);
    if (!taken.length) return -Math.PI / 4;
    let [widest, side] = [-1, 0];
    taken.forEach((angle, i) => {
      const gap = (i + 1 < taken.length ? taken[i + 1]! : taken[0]! + 2 * Math.PI) - angle;
      if (gap > widest + 1e-6) [widest, side] = [gap, angle + gap / 2];
    });
    return side;
  }

  /** Bond lines: one per shared pair, side by side; an ionic bond is one dotted line. */
  function lines(link: Link) {
    const [p, q] = [at(link.a), at(link.b)];
    const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const [nx, ny] = [-(q.y - p.y) / length, (q.x - p.x) / length];
    const offsets = link.ionic || link.order === 1 ? [0] : link.order === 2 ? [-4.5, 4.5] : [-8, 0, 8];
    return offsets.map((o) => ({ x1: round(p.x + nx * o), y1: round(p.y + ny * o), x2: round(q.x + nx * o), y2: round(q.y + ny * o) }));
  }

  /** The tappable middle of a bond, trimmed so it never covers an atom's own tap area. */
  function bondHit(link: Link) {
    const [p, q] = [at(link.a), at(link.b)];
    const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const trim = Math.min(HIT, length / 2 - 4);
    const [ux, uy] = [(q.x - p.x) / length, (q.y - p.y) / length];
    return { x1: round(p.x + ux * trim), y1: round(p.y + uy * trim), x2: round(q.x - ux * trim), y2: round(q.y - uy * trim) };
  }

  /** The name on the board: without the part in brackets ("Table salt", not "Table salt (sodium chloride)"). */
  const boardName = (item: ReportItem) => (item.molecule ? s.molecules[item.molecule.id].name.replace(/\s*\(.*\)$/, '') : item.formula);

  /**
   * Name tags for finished molecules, each placed above, below, right or left of its molecule,
   * wherever it covers the fewest other atoms, tags and board edges. Worked out from where the
   * atoms are going, so a tag does not hop about while they glide.
   */
  const tags = $derived.by(() => {
    const taken: { x0: number; y0: number; x1: number; y1: number }[] = [];
    return finished.map((item) => {
      const text = boardName(item);
      const width = text.length * 9;
      const mine = item.ids.map((id) => ({ ...targets[id]!, marked: charge(board, id) !== 0 || deltas[id] !== undefined }));
      const cx = mine.reduce((sum, p) => sum + p.x, 0) / mine.length;
      const cy = mine.reduce((sum, p) => sum + p.y, 0) / mine.length;
      // Room for a δ or charge mark beyond the atom's edge.
      const top = Math.min(...mine.map((p) => p.y - p.r - (p.marked ? 20 : 4)));
      const bottom = Math.max(...mine.map((p) => p.y + p.r + (p.marked ? 20 : 4)));
      const left = Math.min(...mine.map((p) => p.x - p.r - (p.marked ? 20 : 4)));
      const right = Math.max(...mine.map((p) => p.x + p.r + (p.marked ? 20 : 4)));
      // Slide a tag sideways so it stays inside the drawing.
      const inside = (o: { x: number; x0: number; x1: number }) => {
        const dx = Math.max(box[0] + 2 - o.x0, Math.min(0, box[0] + box[2] - 2 - o.x1));
        return { x: o.x + dx, x0: o.x0 + dx, x1: o.x1 + dx };
      };
      // Centred above and below, beside it, and at its four corners.
      const centred = inside({ x: cx, x0: cx - width / 2, x1: cx + width / 2 });
      const leftAligned = inside({ x: left + width / 2, x0: left, x1: left + width });
      const rightAligned = inside({ x: right - width / 2, x0: right - width, x1: right });
      const options = [
        { ...centred, y: top - 6, anchor: 'middle' },
        { ...centred, y: bottom + 16, anchor: 'middle' },
        { x: right + 4, y: cy + 5, anchor: 'start', x0: right + 4, x1: right + 4 + width },
        { x: left - 4, y: cy + 5, anchor: 'end', x0: left - 4 - width, x1: left - 4 },
        { ...leftAligned, y: top - 6, anchor: 'middle' },
        { ...rightAligned, y: top - 6, anchor: 'middle' },
        { ...leftAligned, y: bottom + 16, anchor: 'middle' },
        { ...rightAligned, y: bottom + 16, anchor: 'middle' },
      ].map((o) => ({ ...o, y0: o.y - 15, y1: o.y + 4 }));
      const cost = (o: (typeof options)[number]) => {
        let c = 0;
        let [ownNearest, otherNearest] = [Infinity, Infinity];
        for (const atom of board.atoms) {
          const p = targets[atom.id]!;
          const d = Math.hypot(p.x - Math.max(o.x0, Math.min(p.x, o.x1)), p.y - Math.max(o.y0, Math.min(p.y, o.y1))) - p.r;
          const own = item.ids.includes(atom.id);
          // Never over an atom; and clear of other molecules' glow, so it is plain which molecule it names.
          if (d < 4) c += 3;
          else if (!own && d < 12) c += 1;
          if (own) ownNearest = Math.min(ownNearest, d);
          else otherNearest = Math.min(otherNearest, d);
        }
        if (otherNearest < ownNearest) c += 1.5;
        for (const t of taken) if (o.x0 < t.x1 && t.x0 < o.x1 && o.y0 < t.y1 && t.y0 < o.y1) c += 4;
        // Outside the drawing it would cover the text around the widget.
        if (o.x0 < box[0] || o.y0 < box[1] || o.x1 > box[0] + box[2] || o.y1 > box[1] + box[3]) c += 5;
        return c;
      };
      const best = options.reduce((a, b) => (cost(b) < cost(a) ? b : a));
      taken.push(best);
      return { key: item.ids.join('-'), text, x: round(best.x), y: round(best.y), anchor: best.anchor };
    });
  });

  function sparkles(ids: number[]) {
    const points = ids.map(at);
    const c = { x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length };
    return { x: round(c.x), y: round(c.y), r: round(Math.max(...points.map((p) => Math.hypot(p.x - c.x, p.y - c.y))) + 30) };
  }

  function flightAt(flight: Flight): Point {
    const [p, q] = [at(flight.from), at(flight.to)];
    const e = flight.t < 0.5 ? 2 * flight.t * flight.t : 1 - (2 - 2 * flight.t) ** 2 / 2;
    const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const lift = Math.sin(Math.PI * e) * 18;
    return { x: round(p.x + (q.x - p.x) * e + ((q.y - p.y) / length) * lift), y: round(p.y + (q.y - p.y) * e - ((q.x - p.x) / length) * lift) };
  }

  function shapeText(shape: MoleculeShape): string {
    if (shape.kind === 'ionic') return s.ionicShape;
    if (shape.kind === 'pair') return s.shapes.linear;
    if (shape.centres.length === 1) return s.shapes[shape.centres[0]!.shape];
    return s.centres(shape.centres);
  }

  const recipeShape = (molecule: Molecule) => {
    const built = buildBoard(molecule.atoms, molecule.bonds);
    return moleculeShape(built, built.atoms.map((atom) => atom.id));
  };

  /** The card under the board. */
  const card = $derived.by(() => {
    const now = subject;
    if (now?.kind === 'entry') {
      const molecule = MOLECULES.find((m) => m.id === now.id)!;
      return { kind: 'done' as const, molecule, formula: molecule.formula, shape: recipeShape(molecule) };
    }
    if (now?.kind !== 'atom' || !board.atoms.some((atom) => atom.id === now.id)) return null;
    const item = rep.items.find((i) => i.ids.includes(now.id));
    if (!item) return { kind: 'atom' as const, id: now.id };
    if (!item.complete) return { kind: 'unfinished' as const, formula: item.formula, hint: item.hint! };
    return { kind: 'done' as const, molecule: item.molecule, formula: item.formula, shape: moleculeShape(board, item.ids) };
  });

  // Screen readers hear what just happened and the whole board once things settle (kit/settle.ts).
  const announcement = $derived(`${status ? `${status} ` : ''}${s.summary(rep)}`);
  let spoken = $state(untrack(() => announcement));
  const settler = settle<string>((text) => (spoken = text));
  $effect(() => {
    settler.push(announcement);
    return settler.cancel;
  });

  function place(next: Board) {
    board = next;
    targets = layout(next, targets);
    if (reduced.current) shown = targets;
    else moving = true;
  }

  function celebrate(ids: number[]) {
    if (reduced.current) return;
    const key = ++serial;
    party = { key, ids };
    setTimeout(() => {
      if (party?.key === key) party = null;
    }, 1200);
  }

  function pick(id: number | null) {
    selected = id;
    status = id === null ? s.unpicked : s.picked(el(id));
    if (id !== null) subject = { kind: 'atom', id };
  }

  function tapAtom(id: number) {
    const picked = selected;
    if (picked === null || !board.atoms.some((atom) => atom.id === picked)) pick(id);
    else if (picked === id) pick(null);
    else join(picked, id);
  }

  function join(a: number, b: number) {
    const before = board;
    const outcome = bond(before, a, b);
    if (!outcome.ok) {
      status = s.refused({ reason: outcome.reason, el: outcome.atom === undefined ? undefined : elementOf(before, outcome.atom) });
      return;
    }
    const { link } = outcome;
    const given = link.order - (linkBetween(before, link.a, link.b)?.order ?? 0);
    place(outcome.board);
    pops = { ...pops, [a]: (pops[a] ?? 0) + 1, [b]: (pops[b] ?? 0) + 1 };
    if (link.ionic && !reduced.current) flights = [...flights, { key: ++serial, from: link.a, to: link.b, t: 0 }];
    let message = link.ionic
      ? s.gave(el(link.a), el(link.b), given, ionNotation(el(link.a), charge(board, link.a)), ionNotation(el(link.b), charge(board, link.b)))
      : s.joined(el(a), el(b), link.order);
    const item = rep.items.find((i) => i.ids.includes(b));
    if (item?.complete && item.molecule) {
      const id = item.molecule.id;
      const fresh = !found.includes(id);
      const quest = fresh && (QUESTS as readonly MoleculeId[]).includes(id);
      if (fresh) found = [...found, id];
      if (quest) freshQuest = id;
      message = [s.completed(s.molecules[id].name), fresh ? s.newFind : '', quest ? s.questDone : ''].filter(Boolean).join(' ');
      celebrate(item.ids);
    }
    status = message;
    subject = { kind: 'atom', id: b };
    // The first atom stays picked while it still has free bonds: pick C, then H, H, H, H.
    if (freeValence(board, a) === 0) selected = null;
  }

  async function focusAtom(id: number | undefined) {
    await tick();
    const target = id === undefined ? null : svg?.querySelector<SVGGElement>(`.atom[data-id="${id}"]`);
    (target ?? svg?.querySelector<SVGGElement>('.atom[tabindex]'))?.focus();
  }

  function tapBond(link: Link) {
    const focused = svg?.contains(document.activeElement) ?? false;
    place(loosen(board, link.a, link.b));
    status = s.loosened(el(link.a), el(link.b), link.order - 1, link.ionic);
    subject = { kind: 'atom', id: link.a };
    if (link.order === 1 && focused) focusAtom(link.a);
  }

  function removeNow(id: number) {
    const focused = svg?.contains(document.activeElement) ?? false;
    const neighbour = linksOf(board, id)[0]?.other;
    const element = el(id);
    if (selected === id) selected = null;
    place(removeAtom(board, id));
    status = s.removed(element);
    subject = neighbour === undefined ? null : { kind: 'atom', id: neighbour };
    if (focused) focusAtom(neighbour);
  }

  function add(element: El) {
    const next = addAtom(board, element);
    if (!next) {
      status = s.boardFull;
      return;
    }
    place(next);
    const id = next.atoms.at(-1)!.id;
    pops = { ...pops, [id]: 1 };
    status = s.added(element);
  }

  function clearBoard() {
    selected = null;
    place({ atoms: [], links: [], next: board.next });
    status = s.cleared;
    subject = null;
  }

  function reset() {
    board = INITIAL.board;
    targets = FIRST;
    shown = FIRST;
    moving = false;
    flights = [];
    selected = null;
    status = '';
    subject = { kind: 'atom', id: 0 };
    found = firstFinds();
    party = null;
    freshQuest = null;
    pops = {};
  }

  /** One animation frame: every atom glides a little closer to where it is going. */
  function step(dt: number) {
    const k = 1 - Math.exp(-dt * 10);
    let settled = true;
    const next: Record<number, Point> = {};
    for (const atom of board.atoms) {
      const goal = targets[atom.id]!;
      const now = shown[atom.id] ?? goal;
      const p = { x: now.x + (goal.x - now.x) * k, y: now.y + (goal.y - now.y) * k };
      if (Math.hypot(goal.x - p.x, goal.y - p.y) > 0.25) settled = false;
      next[atom.id] = p;
    }
    if (flights.length) flights = flights.map((f) => ({ ...f, t: f.t + dt / 0.55 })).filter((f) => f.t < 1);
    if (settled && !flights.length) {
      shown = targets;
      moving = false;
    } else {
      shown = next;
    }
  }

  /** An atom on the board is a button once the widget is live; Delete removes it and Escape lets go. */
  function atomSpot(id: number) {
    const q = charge(board, id);
    const spot = hotspot(live.current, s.atom(el(id), freeValence(board, id), ionNotation(el(id), q)), () => tapAtom(id), selected === id);
    const keys = spot.onkeydown;
    if (!keys) return spot;
    return {
      ...spot,
      onkeydown: (event: KeyboardEvent) => {
        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          removeNow(id);
        } else if (event.key === 'Escape' && selected !== null) {
          event.preventDefault();
          pick(null);
        } else {
          keys(event);
        }
      },
    };
  }

  const chargeLabel = (q: number) => `${Math.abs(q) > 1 ? Math.abs(q) : ''}${q > 0 ? '+' : '−'}`;
  const linkKey = (link: Link) => `${Math.min(link.a, link.b)}-${Math.max(link.a, link.b)}`;
</script>

<WidgetFrame name="molecule-lab" title={s.title} hint={s.hint} {lang} onreset={reset}>
  <svg
    bind:this={svg}
    viewBox={box.map(round).join(' ')}
    class="diagram board"
    role="group"
    aria-label={s.board(board.atoms.length)}
    use:visibleLoop={{ tick: step, paused: !moving }}
  >
    <defs>
      <radialGradient id={shine} cx="0.36" cy="0.3" r="0.72">
        <stop offset="0" class="shine-stop" />
        <stop offset="1" class="shine-stop" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- a soft glow behind every finished molecule -->
    {#each finished as item (item.ids.join('-'))}
      <g class="halo">
        {#each board.links.filter((link) => item.ids.includes(link.a)) as link (linkKey(link))}
          {@const [p, q] = [at(link.a), at(link.b)]}
          <line x1={round(p.x)} y1={round(p.y)} x2={round(q.x)} y2={round(q.y)} />
        {/each}
        {#each item.ids as id (id)}
          <circle cx={round(at(id).x)} cy={round(at(id).y)} r={RADIUS[el(id)] + 11} />
        {/each}
      </g>
    {/each}

    {#each board.links as link (linkKey(link))}
      <g class="bond" class:ionic={link.ionic}>
        {#each lines(link) as line, i (i)}
          <line {...line} />
        {/each}
      </g>
    {/each}

    {#each board.atoms as atom (atom.id)}
      {@const p = at(atom.id)}
      {@const r = RADIUS[atom.el]}
      {@const metal = isMetal(atom.el)}
      {@const q = charge(board, atom.id)}
      {@const d = deltas[atom.id]}
      {@const side = q || d ? freeSide(atom.id) : 0}
      <g
        class="atom"
        class:picked={selected === atom.id}
        class:partner={partners.has(atom.id)}
        class:ink-dark={DARK_INK.has(atom.el)}
        class:two={atom.el.length > 1}
        data-id={atom.id}
        data-el={atom.el}
        transform="translate({round(p.x)} {round(p.y)})"
        {...atomSpot(atom.id)}
      >
        <circle class="hit" r={HIT} />
        <circle class="ring" r={r + 6} />
        <circle class="focus-ring" r={r + 10} />
        {#each targets[atom.id]?.hands ?? [] as hand, i (i)}
          <g class="hand" transform="rotate({deg(hand)})">
            {#if !metal}<line x1={r - 1} x2={r + 8} />{/if}
            <circle cx={metal ? r + 7 : r + 12} r="4.5" />
          </g>
        {/each}
        <g class="body" class:pop-a={(pops[atom.id] ?? 0) % 2 === 1} class:pop-b={(pops[atom.id] ?? 0) > 0 && (pops[atom.id] ?? 0) % 2 === 0}>
          <circle class="disc" r={r} style:fill="var(--d-el-{atom.el.toLowerCase()})" />
          <circle class="shine" r={r - 1} fill="url(#{shine})" />
          <text class="symbol" text-anchor="middle" dy="0.35em">{atom.el}</text>
        </g>
        {#if q}
          <g class="charge" class:minus={q < 0} transform="translate({round(Math.cos(side) * (r + 3))} {round(Math.sin(side) * (r + 3))})">
            <circle r="9.5" />
            <text text-anchor="middle" dy="0.35em">{chargeLabel(q)}</text>
          </g>
        {:else if d}
          <text class="delta" class:minus={d < 0} x={round(Math.cos(side) * (r + 12))} y={round(Math.sin(side) * (r + 12))} text-anchor="middle" dy="0.35em">
            {d > 0 ? 'δ+' : 'δ−'}
          </text>
        {/if}
      </g>
    {/each}

    <!-- bonds are tapped in their middle, above the atoms but never over an atom's own tap area -->
    {#each board.links as link (linkKey(link))}
      <line
        class="bond-hit"
        {...bondHit(link)}
        {...hotspot(live.current, s.bond(el(link.a), el(link.b), link.order, link.ionic), () => tapBond(link))}
      />
    {/each}

    {#each tags as tag (tag.key)}
      <text class="name" x={tag.x} y={tag.y} text-anchor={tag.anchor}>{tag.text}</text>
    {/each}

    {#each flights as flight (flight.key)}
      {@const p = flightAt(flight)}
      <circle class="flying" cx={p.x} cy={p.y} r="5" />
    {/each}

    {#if party}
      {@const c = sparkles(party.ids)}
      {#key party.key}
        <g class="sparkles" transform="translate({c.x} {c.y})" style:--reach="{c.r}px">
          {#each [0, 45, 90, 135, 180, 225, 270, 315] as angle (angle)}
            <g transform="rotate({angle})"><path class="spark" d="M0 -5 1.4 -1.4 5 0 1.4 1.4 0 5 -1.4 1.4 -5 0 -1.4 -1.4Z" /></g>
          {/each}
        </g>
      {/key}
    {/if}
  </svg>

  <p class="status" aria-hidden="true">{status || s.welcome}</p>
  <div class="card">
    {#if card?.kind === 'done'}
      <p class="card-title">
        <span class="card-name">{card.molecule ? s.molecules[card.molecule.id].name : card.formula}</span>
        {#if card.molecule}<span class="formula">{card.formula}</span>{/if}
      </p>
      {#if !card.molecule}<p>{s.unnamed}</p>{/if}
      <p><strong>{s.shape}:</strong> {shapeText(card.shape)}</p>
      {#if card.molecule}
        <p>{s.polarity[card.molecule.polarity]}</p>
        <p class="fact">{s.molecules[card.molecule.id].fact}</p>
      {/if}
    {:else if card?.kind === 'unfinished'}
      <p class="card-title"><span class="card-name">{s.unfinished}</span> <span class="formula">{card.formula}</span></p>
      <p>{cap(s.hintText(card.hint))}.</p>
    {:else if card?.kind === 'atom'}
      <p class="card-title">{s.atom(el(card.id), freeValence(board, card.id), ionNotation(el(card.id), charge(board, card.id)))}</p>
    {:else}
      <p>{s.start}</p>
    {/if}
  </div>
  <p class="visually-hidden" aria-live="polite" aria-atomic="true">{spoken}</p>

  {#snippet controls()}
    <div class="palette">
      {#each [{ id: 'nonmetals', label: s.nonmetals, els: NONMETALS }, { id: 'metals', label: s.metals, els: METALS }] as group (group.id)}
        <div class="palette-group" role="group" aria-labelledby="{uid}-{group.id}">
          <span class="palette-label" id="{uid}-{group.id}">{group.label}</span>
          {#each group.els as element (element)}
            <Button onclick={() => add(element)}>
              <span class="chip" class:ink-dark={DARK_INK.has(element)} style:background="var(--d-el-{element.toLowerCase()})" aria-hidden="true">{element}</span>
              <span class="visually-hidden">{s.add} {element} ({s.element[element]})</span>
            </Button>
          {/each}
        </div>
      {/each}
      <div class="actions">
        <Button onclick={() => (selected === null ? (status = s.pickFirst) : removeNow(selected))}>{s.remove}</Button>
        <Button onclick={clearBoard}>{s.clear}</Button>
      </div>
    </div>

    <div class="panel quests">
      <p class="panel-title"><span>{s.quests}</span> <span class="count">{s.questsDone(questsDone, QUESTS.length)}</span></p>
      <ul>
        {#each QUESTS as quest (quest)}
          {@const done = found.includes(quest)}
          <li class:done class:fresh={done && freshQuest === quest}>
            <span class="tick" aria-hidden="true">{done ? '✓' : ''}</span>
            <span>{s.quest[quest]}{#if done}<span class="visually-hidden">, {s.doneMark}</span>{/if}</span>
          </li>
        {/each}
      </ul>
    </div>

    <div class="panel collection">
      <p class="panel-title"><span>{s.collection}</span> <span class="count">{s.discovered(found.length, MOLECULES.length)}</span></p>
      <div class="finds">
        {#each found as id (id)}
          <Button pressed={subject?.kind === 'entry' && subject.id === id} onclick={() => (subject = { kind: 'entry', id })}>{s.molecules[id].name}</Button>
        {/each}
      </div>
      <p class="help">{s.collectionHelp}</p>
    </div>
  {/snippet}
</WidgetFrame>

<style>
  /* The board ------------------------------------------------------------ */
  /* Quick taps on a phone should pick atoms, not zoom the page or select the symbols as text. */
  .board {
    touch-action: manipulation;
    -webkit-user-select: none;
    user-select: none;
  }

  .shine-stop {
    stop-color: var(--d-el-shine);
  }

  .halo {
    opacity: 0.38;
    pointer-events: none;
  }

  .halo line {
    stroke: var(--d-glow);
    stroke-width: 34;
    stroke-linecap: round;
  }

  .halo circle {
    fill: var(--d-glow);
  }

  .bond line {
    stroke: var(--d-wire);
    stroke-width: 4;
    stroke-linecap: round;
  }

  .bond.ionic line {
    stroke: var(--d-muted);
    stroke-width: 3.5;
    stroke-dasharray: 0.5 7;
  }

  .hit {
    fill: transparent;
  }

  .atom[role='button'] {
    cursor: pointer;
  }

  /* The ring (or the highlighted bond) shows focus instead of a box around the shape. */
  .atom:focus,
  .bond-hit:focus {
    outline: none;
  }

  .ring,
  .focus-ring {
    fill: none;
    stroke: transparent;
    stroke-width: 3;
  }

  /* Could join the picked atom: a dashed ring. */
  .atom.partner .ring {
    stroke: var(--d-accent);
    stroke-width: 2;
    stroke-dasharray: 4 4;
  }

  /* Picked: a spotlight behind the atom. */
  .atom.picked .ring {
    fill: var(--d-accent);
    fill-opacity: 0.22;
    stroke: var(--d-accent);
    stroke-width: 2.5;
    stroke-dasharray: none;
  }

  /* Keyboard focus: its own, wider ring, so "focused" and "picked" never look alike. */
  .atom:focus-visible .focus-ring {
    stroke: var(--focus);
    stroke-width: 3;
  }

  .hand line {
    stroke: var(--d-ink);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .hand circle {
    fill: var(--d-electron);
    stroke: var(--d-fill);
    stroke-width: 1.5;
    transform-box: fill-box;
    transform-origin: center;
  }

  .disc {
    stroke: var(--d-ink);
    stroke-width: 1.5;
  }

  .shine {
    pointer-events: none;
  }

  .body {
    transform-box: fill-box;
    transform-origin: center;
  }

  .symbol {
    fill: var(--d-el-ink-light);
    font-family: var(--font-display-stack);
    font-size: 17px;
    font-weight: 800;
    pointer-events: none;
  }

  .ink-dark .symbol {
    fill: var(--d-el-ink-dark);
  }

  .two .symbol,
  .atom[data-el='H'] .symbol {
    font-size: 15px;
  }

  .charge circle {
    fill: var(--d-el-plus);
    stroke: var(--d-fill);
    stroke-width: 1.5;
  }

  .charge.minus circle {
    fill: var(--d-el-minus);
  }

  .charge text {
    fill: var(--d-fill);
    font-size: 12px;
    font-weight: 800;
  }

  .delta {
    fill: var(--d-el-plus);
    font-size: 14px;
    font-weight: 800;
    paint-order: stroke;
    stroke: var(--d-fill);
    stroke-width: 3.5px;
    stroke-linejoin: round;
  }

  .delta.minus {
    fill: var(--d-el-minus);
  }

  .bond-hit {
    stroke: transparent;
    stroke-width: 28;
    stroke-linecap: round;
  }

  .bond-hit[role='button'] {
    cursor: pointer;
  }

  .bond-hit:focus-visible {
    stroke: var(--focus);
    stroke-opacity: 0.45;
    stroke-width: 14;
  }

  .name {
    font-family: var(--font-display-stack);
    font-size: 16px;
    font-weight: 800;
    paint-order: stroke;
    stroke: var(--d-fill);
    stroke-width: 4px;
    stroke-linejoin: round;
    pointer-events: none;
  }

  .flying {
    fill: var(--d-electron);
    stroke: var(--d-fill);
    stroke-width: 1.5;
    pointer-events: none;
  }

  .sparkles {
    pointer-events: none;
  }

  .spark {
    fill: var(--d-glow);
    stroke: var(--d-ink);
    stroke-width: 0.8;
    transform-box: fill-box;
    transform-origin: center;
    opacity: 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    .halo {
      animation: glow-in 0.6s ease-out both;
    }

    .body.pop-a {
      animation: pop-a 0.35s ease-out;
    }

    .body.pop-b {
      animation: pop-b 0.35s ease-out;
    }

    .atom.picked .hand circle {
      animation: reach 0.8s ease-in-out 3;
    }

    .spark {
      animation: spark 0.9s ease-out both;
    }

    li.fresh .tick {
      animation: tick-pop 0.45s ease-out;
    }
  }

  @keyframes tick-pop {
    40% {
      transform: translateY(0.2em) scale(1.35);
    }
  }

  @keyframes glow-in {
    from {
      opacity: 0;
    }
  }

  @keyframes pop-a {
    40% {
      transform: scale(1.18);
    }
  }

  @keyframes pop-b {
    40% {
      transform: scale(1.18);
    }
  }

  @keyframes reach {
    50% {
      transform: scale(1.4);
    }
  }

  @keyframes spark {
    0% {
      opacity: 1;
      transform: translateY(calc(var(--reach) * -0.55)) scale(0.2);
    }

    45% {
      opacity: 1;
      transform: translateY(calc(var(--reach) * -0.95)) scale(1.3);
    }

    100% {
      opacity: 0;
      transform: translateY(calc(var(--reach) * -1.2)) scale(0.4);
    }
  }

  /* Under the board --------------------------------------------------------- */
  .status {
    min-height: 3em;
    margin: var(--space-2) auto 0;
    max-width: 34rem;
    font-size: var(--text-sm);
    font-weight: 700;
    text-align: center;
  }

  .card {
    display: grid;
    gap: var(--space-1);
    max-width: 34rem;
    margin: var(--space-2) auto 0;
    padding: var(--space-3) var(--space-4);
    background: var(--surface);
    border: 1.5px solid var(--line-strong);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .card p {
    margin: 0;
  }

  .card-title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2);
  }

  .card-name {
    font-family: var(--font-display-stack);
    font-size: 1.2rem;
    font-weight: 800;
  }

  .formula {
    padding: 0 var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
    font-weight: 700;
  }

  .fact {
    color: var(--ink-soft);
  }

  /* Controls ---------------------------------------------------------------- */
  .palette {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3) var(--space-4);
  }

  .palette-group,
  .actions,
  .finds {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .palette-label {
    font-weight: 700;
    font-size: var(--text-sm);
    margin-right: var(--space-1);
  }

  .chip {
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 1.5px solid var(--d-ink);
    border-radius: 50%;
    color: var(--d-el-ink-light);
    font-family: var(--font-display-stack);
    font-size: 0.85rem;
    font-weight: 800;
    line-height: 1;
  }

  .chip.ink-dark {
    color: var(--d-el-ink-dark);
  }

  .panel {
    grid-column: 1 / -1;
    align-self: start;
    display: grid;
    gap: var(--space-2);
  }

  .panel-title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2);
    margin: 0;
    font-weight: 700;
  }

  .count {
    font-size: var(--text-sm);
    color: var(--ink-soft);
  }

  .quests ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
    gap: var(--space-1) var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-sm);
  }

  .quests li {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .tick {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 1.3em;
    height: 1.3em;
    border: 1.5px solid var(--line-strong);
    border-radius: 50%;
    font-size: 0.85em;
    font-weight: 800;
    transform: translateY(0.2em);
  }

  li.done .tick {
    background: var(--safe);
    border-color: var(--safe);
    color: var(--surface);
  }

  .help {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-soft);
  }
</style>
