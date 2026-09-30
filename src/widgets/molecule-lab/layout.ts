/**
 * Where the atoms sit on the board: pure and deterministic, so the server render and the browser
 * agree.
 *
 * Each molecule gets a textbook drawing from VSEPR-like angles around every atom: straight for
 * two electron groups, 120° for three, and for four groups a cross (4 neighbours), a tripod
 * (3 neighbours, as a pyramid seen from the side) or the real 104.5° of water (2 neighbours).
 * Free bonds are drawn as "hands" in the directions where new partners would go. The drawing is
 * then turned (or mirrored) to match where the atoms already were, so a growing molecule moves as
 * little as possible, and molecules are nudged apart so they never overlap.
 */
import { bond, clusters, elementOf, freeValence, isMetal, linksOf, LONE_PAIRS } from './model.ts';
import type { Board, El } from './model.ts';

export const BOARD = { width: 360, height: 280 } as const;
/** Bond length, centre to centre. */
export const BOND = 86;
export const RADIUS: Record<El, number> = { H: 15, C: 20, N: 20, O: 20, F: 19, S: 22, Cl: 22, Na: 23, Mg: 23 };
/** Atoms drawn in a light colour, so their symbol is written in dark ink. */
export const DARK_INK: ReadonlySet<El> = new Set<El>(['H', 'F', 'S', 'Cl']);

/** How far free hands reach out from an atom's edge. */
export const REACH = 17;

/**
 * How much a 360 px phone shrinks the board: the page, figure, widget frame and stage padding leave
 * 264 px for its 360 units (measured in the chemical-bond article).
 */
export const PHONE_SCALE = 264 / 360;
/** Tap radius around each atom: 62 units, about 45 px across on a 360 px phone (at least 44). */
export const HIT = 31;
/**
 * The width of a bond's tap band, from atom centre to atom centre. The atoms are drawn on top, so
 * the band never takes a tap from an atom, and just under 2 × HIT hides its ends under the atoms'
 * tap circles. That leaves 24 units of bond (about 18 px) between two joined atoms.
 */
export const BOND_HIT = 2 * HIT - 2;
/** Space kept between an atom and the edge of the board. */
const EDGE = 6;
/** Half-angle of the tripod that draws a trigonal pyramid (ammonia) seen from the side. */
const TRIPOD = 62;
/** The angle at an atom with two neighbours and two lone pairs: 104.5° in water, about 92° in H₂S. */
const bent = (el: El) => (el === 'S' ? 92 : 104.5);

export interface Point {
  x: number;
  y: number;
}

export interface Placed extends Point {
  r: number;
  /** Directions of the free hands, in radians (0 = right, clockwise because y points down). */
  hands: number[];
  /** Atoms in this atom's molecule: when molecules merge, the bigger one moves less. */
  size: number;
}

/** A previous position; `size` (from an earlier layout) says how big the atom's molecule was. */
export type Before = Point & { size?: number };

const RAD = Math.PI / 180;
/** Metals first, hydrogen last: the order in which partners get the main directions. */
const RANK: El[] = ['Na', 'Mg', 'C', 'N', 'O', 'F', 'S', 'Cl', 'H'];
const EVEN: Record<number, number[]> = { 0: [], 1: [0], 2: [0, 180], 3: [0, 120, 240], 4: [0, 180, 90, 270] };

const armsOf = (board: Board, id: number) => linksOf(board, id).length + freeValence(board, id);
const isIon = (board: Board, id: number) => isMetal(elementOf(board, id)) || linksOf(board, id).some(({ link }) => link.ionic);

/** Arm directions (degrees) of the molecule's central atom, main direction first. */
function centreSlots(board: Board, id: number, arms: number): number[] {
  const el = elementOf(board, id);
  const groups = arms + LONE_PAIRS[el];
  if (isIon(board, id) || arms === 1 || arms === 4) return EVEN[arms]!;
  if (arms === 2) return groups === 2 ? [0, 180] : groups === 3 ? [30, 150] : [90 - bent(el) / 2, 90 + bent(el) / 2];
  return groups === 3 ? [0, 120, 240] : [90, 90 - TRIPOD, 90 + TRIPOD];
}

/** Directions (degrees, relative to the way back to the parent) of an atom's other arms. */
function branchOffsets(board: Board, id: number, arms: number, side: 1 | -1): number[] {
  const el = elementOf(board, id);
  const groups = arms + LONE_PAIRS[el];
  if (isIon(board, id)) return EVEN[arms]!.slice(1);
  if (arms === 2) return [groups === 2 ? 180 : side * (groups === 3 ? 120 : bent(el))];
  if (arms === 3) return groups === 3 ? [120, -120] : [125, -125];
  return arms === 4 ? [180, 90, 270] : [];
}

function eccentricity(board: Board, from: number): number {
  const depth = new Map([[from, 0]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    for (const { other } of linksOf(board, queue[i]!)) {
      if (!depth.has(other)) {
        depth.set(other, depth.get(queue[i]!)! + 1);
        queue.push(other);
      }
    }
  }
  return Math.max(...depth.values());
}

/** The most central atom: least far from every other, then most partners, then metals first, H last. */
function centreOf(board: Board, ids: number[]): number {
  const score = (id: number) => [eccentricity(board, id), -linksOf(board, id).length, RANK.indexOf(elementOf(board, id)), id];
  return ids.reduce((best, id) => {
    const [a, b] = [score(id), score(best)];
    const i = a.findIndex((v, k) => v !== b[k]);
    return i >= 0 && a[i]! < b[i]! ? id : best;
  });
}

const dir = (deg: number): Point => ({ x: Math.cos(deg * RAD), y: Math.sin(deg * RAD) });

/** Every way to give `n` partners different slots out of `m` (at most 4 · 3 · 2 · 1 = 24 ways). */
function assignments(n: number, m: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const rest of assignments(n - 1, m)) for (let slot = 0; slot < m; slot++) if (!rest.includes(slot)) out.push([...rest, slot]);
  return out;
}

interface Arrangement {
  /** How badly the partners' old directions fit their slots (0 = perfectly). */
  error: number;
  /** The direction (degrees) of each partner, in the order given. */
  kids: number[];
  /** The slots left over for free hands. */
  hands: number[];
}

/**
 * Which slot each partner of an atom takes. Partners that already had a place keep the slots
 * nearest to where they were (the centre atom may also turn its whole pattern), so a growing
 * molecule keeps its shape and a new partner snaps into the nearest free slot.
 */
function arrange(pattern: number[], kids: number[], here: Point | undefined, before: Record<number, Before>, turnable: boolean): Arrangement {
  const known = here ? kids.filter((kid) => before[kid]) : [];
  const want = known.map((kid) => Math.atan2(before[kid]!.y - here!.y, before[kid]!.x - here!.x));
  let best = { error: 0, slots: [] as number[], turn: 0 };
  if (known.length) {
    best.error = Infinity;
    for (const slots of assignments(known.length, pattern.length)) {
      const diffs = slots.map((slot, i) => want[i]! - pattern[slot]! * RAD);
      const turn = turnable ? Math.atan2(diffs.reduce((s, d) => s + Math.sin(d), 0), diffs.reduce((s, d) => s + Math.cos(d), 0)) : 0;
      const error = diffs.reduce((s, d) => s + 1 - Math.cos(d - turn), 0);
      if (error < best.error - 1e-9) best = { error, slots, turn: turn / RAD };
    }
  }
  const angles = pattern.map((angle) => angle + best.turn);
  const free = angles.map((_, i) => i).filter((i) => !best.slots.includes(i));
  const kidAngles = kids.map((kid) => {
    const k = known.indexOf(kid);
    return angles[k >= 0 ? best.slots[k]! : free.shift()!] ?? 0;
  });
  return { error: best.error, kids: kidAngles, hands: free.map((i) => angles[i]!) };
}

/** Whether a drawing folds over itself: two atoms too close, or a bond running across another atom. */
function foldsOver(board: Board, ids: number[], placed: Map<number, Placed>): boolean {
  const links = board.links.filter((link) => placed.has(link.a) && placed.has(link.b));
  const bonded = (a: number, b: number) => links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
  for (const a of ids) {
    for (const b of ids) {
      const [p, q] = [placed.get(a)!, placed.get(b)!];
      if (a < b && !bonded(a, b) && Math.hypot(p.x - q.x, p.y - q.y) < p.r + q.r + 8) return true;
    }
  }
  for (const link of links) {
    const [p, q] = [placed.get(link.a)!, placed.get(link.b)!];
    const length2 = (q.x - p.x) ** 2 + (q.y - p.y) ** 2 || 1;
    for (const id of ids) {
      if (id === link.a || id === link.b) continue;
      const c = placed.get(id)!;
      const t = Math.max(0, Math.min(1, ((c.x - p.x) * (q.x - p.x) + (c.y - p.y) * (q.y - p.y)) / length2));
      if (Math.hypot(c.x - p.x - t * (q.x - p.x), c.y - p.y - t * (q.y - p.y)) < c.r + 8) return true;
    }
  }
  return false;
}

/**
 * A molecule drawn around its centre at (0, 0), before it is turned and moved into place. Following
 * where the atoms were can curl a long chain over itself; then it is drawn afresh as a zigzag.
 */
function drawMolecule(board: Board, ids: number[], before: Record<number, Before>): Map<number, Placed> {
  const drawing = drawFrom(board, ids, before);
  const ring = board.links.filter((link) => drawing.has(link.a)).length >= ids.length;
  return !ring && foldsOver(board, ids, drawing) ? drawFrom(board, ids, {}) : drawing;
}

function drawFrom(board: Board, ids: number[], before: Record<number, Before>): Map<number, Placed> {
  const centre = centreOf(board, ids);
  const parent = new Map<number, number>([[centre, -1]]);
  const order = [centre];
  for (let i = 0; i < order.length; i++) {
    for (const { other } of linksOf(board, order[i]!)) {
      if (!parent.has(other)) {
        parent.set(other, order[i]!);
        order.push(other);
      }
    }
  }
  const size = new Map(order.map((id) => [id, 1]));
  for (const id of [...order].reverse()) if (parent.get(id)! >= 0) size.set(parent.get(id)!, size.get(parent.get(id)!)! + size.get(id)!);
  const children = (id: number) =>
    order
      .filter((c) => parent.get(c) === id)
      .sort((a, b) => size.get(b)! - size.get(a)! || RANK.indexOf(elementOf(board, a)) - RANK.indexOf(elementOf(board, b)) || a - b);

  const placed = new Map<number, Placed>();
  const heading = new Map<number, number>(); // direction from the parent to each atom, degrees
  const count = ids.length;
  for (const id of order) {
    const el = elementOf(board, id);
    const up = parent.get(id)!;
    const arms = armsOf(board, id);
    const kids = children(id);
    let arrangement: Arrangement;
    if (up < 0) {
      placed.set(id, { x: 0, y: 0, r: RADIUS[el], hands: [], size: count });
      arrangement = arrange(centreSlots(board, id, arms), kids, before[id], before, true);
    } else {
      const back = heading.get(id)! + 180;
      const here = placed.get(id)!;
      // A bent atom can turn either way. Partners it already had decide the side; otherwise the
      // side that keeps its next partner farthest from the rest of the molecule.
      const room = (side: 1 | -1) => {
        const first = branchOffsets(board, id, arms, side)[0];
        if (first === undefined) return 0;
        const d = dir(back + first);
        const probe = { x: here.x + BOND * d.x, y: here.y + BOND * d.y };
        return Math.min(...[...placed.values()].map((p) => Math.hypot(p.x - probe.x, p.y - probe.y)));
      };
      const [plus, minus] = ([1, -1] as const).map((side) => arrange(branchOffsets(board, id, arms, side).map((offset) => back + offset), kids, before[id], before, false));
      const fits = minus!.error < plus!.error - 1e-6 ? -1 : plus!.error < minus!.error - 1e-6 ? 1 : room(-1) > room(1) + 1e-6 ? -1 : 1;
      arrangement = fits < 0 ? minus! : plus!;
    }
    kids.forEach((kid, i) => {
      const angle = arrangement.kids[i]!;
      const here = placed.get(id)!;
      const d = dir(angle);
      heading.set(kid, angle);
      placed.set(kid, { x: here.x + BOND * d.x, y: here.y + BOND * d.y, r: RADIUS[elementOf(board, kid)], hands: [], size: count });
    });
    placed.get(id)!.hands = arrangement.hands.slice(0, freeValence(board, id)).map((deg) => deg * RAD);
  }
  const bonds = ids.reduce((n, id) => n + linksOf(board, id).length, 0) / 2;
  if (bonds >= ids.length) relaxRing(board, ids, placed);
  return placed;
}

/** Rings: pull every bond to its length and push crowded atoms apart, then put the hands in the widest gaps. */
function relaxRing(board: Board, ids: number[], placed: Map<number, Placed>) {
  const links = board.links.filter((link) => placed.has(link.a));
  for (let step = 0; step < 300; step++) {
    for (const a of ids) {
      for (const b of ids) {
        if (a >= b) continue;
        const [p, q] = [placed.get(a)!, placed.get(b)!];
        const d = Math.hypot(q.x - p.x, q.y - p.y) || 1;
        const bonded = links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
        const push = bonded ? (d - BOND) * 0.25 : d < 1.6 * BOND ? (d - 1.6 * BOND) * 0.05 : 0;
        const [ux, uy] = [((q.x - p.x) / d) * push, ((q.y - p.y) / d) * push];
        p.x += ux;
        p.y += uy;
        q.x -= ux;
        q.y -= uy;
      }
    }
  }
  for (const id of ids) {
    const p = placed.get(id)!;
    const taken = linksOf(board, id).map(({ other }) => Math.atan2(placed.get(other)!.y - p.y, placed.get(other)!.x - p.x));
    p.hands = [];
    for (let i = 0; i < freeValence(board, id); i++) {
      const all = [...taken, ...p.hands].sort((x, y) => x - y);
      let [widest, at] = [-1, 0];
      all.forEach((angle, k) => {
        const gap = (k + 1 < all.length ? all[k + 1]! : all[0]! + 2 * Math.PI) - angle;
        if (gap > widest) [widest, at] = [gap, angle + gap / 2];
      });
      p.hands.push(all.length ? at : 0);
    }
  }
}

interface Group {
  ids: number[];
  atoms: Map<number, Placed>;
}

/** Turn (and if it fits better, mirror) a fresh drawing so it matches where its atoms were before. */
function fitTo(group: Group, before: Record<number, Before>) {
  const known = group.ids.filter((id) => before[id]);
  const local = known.map((id) => group.atoms.get(id)!);
  // Atoms that were part of a bigger molecule weigh more, so a newcomer moves, not the molecule.
  const weight = known.map((id) => before[id]!.size ?? 1);
  const total = weight.reduce((s, w) => s + w, 0);
  const mean = (points: Point[]) => ({
    x: points.reduce((s, p, i) => s + weight[i]! * p.x, 0) / total,
    y: points.reduce((s, p, i) => s + weight[i]! * p.y, 0) / total,
  });
  const [cl, cp] = [mean(local), mean(known.map((id) => before[id]!))];
  let best = { angle: 0, mirror: 1, error: Infinity };
  if (known.length > 1) {
    for (const mirror of [1, -1]) {
      let [dot, cross] = [0, 0];
      known.forEach((id, i) => {
        const [px, py] = [mirror * (local[i]!.x - cl.x), local[i]!.y - cl.y];
        const [qx, qy] = [before[id]!.x - cp.x, before[id]!.y - cp.y];
        dot += weight[i]! * (px * qx + py * qy);
        cross += weight[i]! * (px * qy - py * qx);
      });
      const angle = Math.atan2(cross, dot);
      let error = 0;
      known.forEach((id, i) => {
        const [px, py] = [mirror * (local[i]!.x - cl.x), local[i]!.y - cl.y];
        const [x, y] = [px * Math.cos(angle) - py * Math.sin(angle), px * Math.sin(angle) + py * Math.cos(angle)];
        error += weight[i]! * ((x + cp.x - before[id]!.x) ** 2 + (y + cp.y - before[id]!.y) ** 2);
      });
      if (error < best.error - 1e-6) best = { angle, mirror, error };
    }
  } else {
    best = { angle: 0, mirror: 1, error: 0 };
  }
  const [cos, sin] = [Math.cos(best.angle), Math.sin(best.angle)];
  for (const p of group.atoms.values()) {
    const [px, py] = [best.mirror * (p.x - cl.x), p.y - cl.y];
    p.x = cp.x + px * cos - py * sin;
    p.y = cp.y + px * sin + py * cos;
    p.hands = p.hands.map((h) => (best.mirror < 0 ? Math.PI - h : h) + best.angle);
  }
}

const shift = (group: Group, dx: number, dy: number) => {
  for (const p of group.atoms.values()) {
    p.x += dx;
    p.y += dy;
  }
};

/** Room an atom needs beyond its radius: its hands if it has any, else its glow and δ mark. */
const ROOM = 14;

/** Space two atoms of different molecules need: their radii, plus room for hands or glow. */
const gapNeeded = (p: Placed, q: Placed) => p.r + q.r + Math.max(p.hands.length ? REACH : ROOM, ROOM) + Math.max(q.hands.length ? REACH : ROOM, ROOM);

/** Move a molecule back onto the board (or centre it, if it is bigger than the board). */
function keepOnBoard(group: Group) {
  const ps = [...group.atoms.values()];
  const [x0, x1] = [Math.min(...ps.map((p) => p.x - p.r)), Math.max(...ps.map((p) => p.x + p.r))];
  const [y0, y1] = [Math.min(...ps.map((p) => p.y - p.r)), Math.max(...ps.map((p) => p.y + p.r))];
  const fix = (lo: number, hi: number, size: number) =>
    hi - lo > size - 2 * EDGE ? size / 2 - (lo + hi) / 2 : lo < EDGE ? EDGE - lo : hi > size - EDGE ? size - EDGE - hi : 0;
  shift(group, fix(x0, x1, BOARD.width), fix(y0, y1, BOARD.height));
}

const centroid = (group: Group): Point => {
  const ps = [...group.atoms.values()];
  return { x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length };
};

/**
 * Push overlapping molecules apart, the bigger one moving less. The edges of the board hold them in
 * at first; if they cannot all fit, the last rounds let them spill over and the view zooms out
 * (viewBox) rather than drawing molecules on top of each other.
 */
function separate(groups: Group[]) {
  for (let round = 0; round < 600; round++) {
    // The edges first, so that the check below sees where everything really is.
    if (round < 110) for (const group of groups) keepOnBoard(group);
    const push = groups.map(() => ({ x: 0, y: 0 }));
    let crowded = false;
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const [g, h] = [groups[i]!, groups[j]!];
        let most = 0;
        for (const p of g.atoms.values()) for (const q of h.atoms.values()) most = Math.max(most, gapNeeded(p, q) - Math.hypot(q.x - p.x, q.y - p.y));
        if (most <= 0.5) continue;
        crowded = true;
        // Apart along the line between their middles: steady, even when one sits inside the other's V.
        const [cg, ch] = [centroid(g), centroid(h)];
        const length = Math.hypot(ch.x - cg.x, ch.y - cg.y);
        const [ux, uy] = length > 1e-6 ? [(ch.x - cg.x) / length, (ch.y - cg.y) / length] : [1, 0];
        const share = h.ids.length / (g.ids.length + h.ids.length);
        push[i]!.x -= ux * most * share;
        push[i]!.y -= uy * most * share;
        push[j]!.x += ux * most * (1 - share);
        push[j]!.y += uy * most * (1 - share);
      }
    }
    if (!crowded) return;
    groups.forEach((group, i) => shift(group, push[i]!.x * 0.7, push[i]!.y * 0.7));
  }
}

/** The free spot for a new molecule: farthest from everything already there, then nearest the middle. */
function findSpot(group: Group, placed: Group[]) {
  const ps = [...group.atoms.values()];
  const c = { x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length };
  let best = { score: -Infinity, x: BOARD.width / 2, y: BOARD.height / 2 };
  for (let y = 30; y <= BOARD.height - 30; y += 10) {
    for (let x = 30; x <= BOARD.width - 30; x += 10) {
      let clearance = Infinity;
      for (const other of placed) {
        for (const q of other.atoms.values()) {
          for (const p of ps) clearance = Math.min(clearance, Math.hypot(p.x - c.x + x - q.x, p.y - c.y + y - q.y) - gapNeeded(p, q));
        }
      }
      const score = Math.min(clearance, 60) - Math.hypot(x - BOARD.width / 2, y - BOARD.height / 2) / 1000;
      if (score > best.score) best = { score, x, y };
    }
  }
  shift(group, best.x - c.x, best.y - c.y);
}

/**
 * Positions and hands for every atom. `before` holds where atoms were (the previous layout, or the
 * first frame's seeds); atoms without a place get a free spot.
 */
export function layout(board: Board, before: Record<number, Before>): Record<number, Placed> {
  const groups: Group[] = clusters(board).map((ids) => ({ ids, atoms: drawMolecule(board, ids, before) }));
  const settled = groups.filter((group) => group.ids.some((id) => before[id]));
  for (const group of settled) fitTo(group, before);
  separate(settled);
  for (const group of groups.filter((g) => !settled.includes(g))) {
    findSpot(group, settled);
    settled.push(group);
    separate(settled);
  }
  const out: Record<number, Placed> = {};
  for (const group of groups) for (const [id, p] of group.atoms) out[id] = p;
  // A lone atom reaches out to the nearest atom it could join.
  for (const group of groups) {
    if (group.ids.length !== 1) continue;
    const id = group.ids[0]!;
    const p = out[id]!;
    if (!p.hands.length) continue;
    let nearest: { d: number; angle: number } | null = null;
    for (const atom of board.atoms) {
      if (atom.id === id || !bond(board, id, atom.id).ok) continue;
      const q = out[atom.id]!;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (!nearest || d < nearest.d - 1e-9) nearest = { d, angle: Math.atan2(q.y - p.y, q.x - p.x) };
    }
    if (nearest) {
      const turn = nearest.angle - p.hands[0]!;
      p.hands = p.hands.map((h) => h + turn);
    }
  }
  return out;
}

/** The part of the drawing to show: the board, grown (keeping its shape) only if a molecule is bigger. */
export function viewBox(placed: Record<number, Placed>): [number, number, number, number] {
  let [x0, y0, x1, y1]: number[] = [0, 0, BOARD.width, BOARD.height];
  for (const p of Object.values(placed)) {
    x0 = Math.min(x0, p.x - p.r - EDGE);
    y0 = Math.min(y0, p.y - p.r - EDGE);
    x1 = Math.max(x1, p.x + p.r + EDGE);
    y1 = Math.max(y1, p.y + p.r + EDGE);
  }
  let [w, h] = [x1 - x0, y1 - y0];
  const aspect = BOARD.width / BOARD.height;
  if (w / h > aspect) {
    y0 -= (w / aspect - h) / 2;
    h = w / aspect;
  } else {
    x0 -= (h * aspect - w) / 2;
    w = h * aspect;
  }
  return [x0, y0, w, h];
}
