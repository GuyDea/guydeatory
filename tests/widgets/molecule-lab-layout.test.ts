import { describe, expect, it } from 'vitest';
import { BOARD, BOND, BOND_HIT, HIT, layout, PHONE_SCALE, RADIUS, viewBox } from '../../src/widgets/molecule-lab/layout.ts';
import type { Placed } from '../../src/widgets/molecule-lab/layout.ts';
import { addAtom, bond, buildBoard, clusters, elementOf, freeValence, loosen, removeAtom } from '../../src/widgets/molecule-lab/model.ts';
import type { Board, El } from '../../src/widgets/molecule-lab/model.ts';
import { INITIAL } from '../../src/widgets/molecule-lab/molecules.ts';

/** The angle a–centre–b in degrees. */
function angle(placed: Record<number, Placed>, centre: number, a: number, b: number): number {
  const c = placed[centre]!;
  const u = { x: placed[a]!.x - c.x, y: placed[a]!.y - c.y };
  const v = { x: placed[b]!.x - c.x, y: placed[b]!.y - c.y };
  const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

const distance = (p: Placed, q: Placed) => Math.hypot(p.x - q.x, p.y - q.y);

/** Every atom lies inside the board, and no two atoms overlap. */
function expectTidy(board: Board, placed: Record<number, Placed>) {
  for (const atom of board.atoms) {
    const p = placed[atom.id]!;
    const r = RADIUS[atom.el];
    expect(p.x - r, `atom ${atom.id} left`).toBeGreaterThanOrEqual(0);
    expect(p.y - r, `atom ${atom.id} top`).toBeGreaterThanOrEqual(0);
    expect(p.x + r, `atom ${atom.id} right`).toBeLessThanOrEqual(BOARD.width);
    expect(p.y + r, `atom ${atom.id} bottom`).toBeLessThanOrEqual(BOARD.height);
  }
  for (const a of board.atoms) {
    for (const b of board.atoms) {
      if (a.id < b.id) {
        expect(distance(placed[a.id]!, placed[b.id]!), `atoms ${a.id} and ${b.id}`).toBeGreaterThan(RADIUS[a.el] + RADIUS[b.el]);
      }
    }
  }
}

describe('MoleculeLab layout', () => {
  it('draws water bent at 104.5°, carbon dioxide straight and methane as a cross', () => {
    const water = layout(buildBoard('O H H', '0-1 0-2'), {});
    expect(angle(water, 0, 1, 2)).toBeCloseTo(104.5, 1);
    // Hydrogen sulfide is bent much more tightly than water (about 92°).
    const sulfide = layout(buildBoard('S H H', '0-1 0-2'), {});
    expect(angle(sulfide, 0, 1, 2)).toBeCloseTo(92, 1);
    const co2 = layout(buildBoard('C O O', '0=1 0=2'), {});
    expect(angle(co2, 0, 1, 2)).toBeCloseTo(180, 1);
    const methane = layout(buildBoard('C H H H H', '0-1 0-2 0-3 0-4'), {});
    expect([2, 3, 4].map((h) => Math.round(angle(methane, 0, 1, h))).sort()).toEqual([180, 90, 90].sort());
  });

  it('spreads a flat carbon at 120°, as in ethene', () => {
    const ethene = layout(buildBoard('C C H H H H', '0=1 0-2 0-3 1-4 1-5'), {});
    expect(angle(ethene, 0, 1, 2)).toBeCloseTo(120, 1);
    expect(angle(ethene, 0, 2, 3)).toBeCloseTo(120, 1);
    expect(angle(ethene, 1, 0, 4)).toBeCloseTo(120, 1);
  });

  it('makes every bond the same length', () => {
    const board = buildBoard('C C O H H H H H H', '0-1 1-2 0-3 0-4 0-5 1-6 1-7 2-8');
    const placed = layout(board, {});
    for (const link of board.links) expect(distance(placed[link.a]!, placed[link.b]!)).toBeCloseTo(BOND, 5);
  });

  it('shows one hand for every free bond', () => {
    const board = buildBoard('C O H Mg', '0-1 0-2');
    const placed = layout(board, {});
    for (const atom of board.atoms) expect(placed[atom.id]!.hands, atom.el).toHaveLength(freeValence(board, atom.id));
  });

  it('points free hands away from the partners an atom already has', () => {
    // H–C with three free hands: none of them may point at the hydrogen.
    const board = buildBoard('C H', '0-1');
    const placed = layout(board, {});
    const toH = Math.atan2(placed[1]!.y - placed[0]!.y, placed[1]!.x - placed[0]!.x);
    for (const hand of placed[0]!.hands) {
      const gap = Math.abs(Math.atan2(Math.sin(hand - toH), Math.cos(hand - toH)));
      expect(gap).toBeGreaterThan(Math.PI / 3);
    }
  });

  it('lays out the first frame on the board, with no atoms overlapping', () => {
    expectTidy(INITIAL.board, layout(INITIAL.board, INITIAL.seeds));
  });

  it('points each waiting hydrogen’s hand at the carbon it could join', () => {
    const placed = layout(INITIAL.board, INITIAL.seeds);
    const carbon = INITIAL.board.atoms.find((atom) => atom.el === 'C')!;
    const waiting = INITIAL.board.atoms.filter((atom) => atom.el === 'H' && freeValence(INITIAL.board, atom.id) === 1);
    expect(waiting).toHaveLength(4);
    for (const h of waiting) {
      const p = placed[h.id]!;
      const towards = Math.atan2(placed[carbon.id]!.y - p.y, placed[carbon.id]!.x - p.x);
      expect(p.hands).toHaveLength(1);
      expect(Math.cos(p.hands[0]! - towards)).toBeCloseTo(1, 5);
    }
  });

  it('gives the same picture every time', () => {
    expect(layout(INITIAL.board, INITIAL.seeds)).toEqual(layout(INITIAL.board, INITIAL.seeds));
  });

  it('leaves a molecule where it is while atoms elsewhere are joined', () => {
    const before = layout(INITIAL.board, INITIAL.seeds);
    const carbon = INITIAL.board.atoms.find((atom) => atom.el === 'C')!.id;
    const hydrogen = INITIAL.board.atoms.find((atom) => atom.el === 'H' && freeValence(INITIAL.board, atom.id) === 1)!.id;
    const outcome = bond(INITIAL.board, carbon, hydrogen);
    if (!outcome.ok) throw new Error(outcome.reason);
    const after = layout(outcome.board, before);
    for (const id of [0, 1, 2]) {
      expect(after[id]!.x).toBeCloseTo(before[id]!.x, 5);
      expect(after[id]!.y).toBeCloseTo(before[id]!.y, 5);
    }
    expect(distance(after[carbon]!, after[hydrogen]!)).toBeCloseTo(BOND, 5);
  });

  it('grows a molecule in place: a new partner snaps into the nearest free slot and nothing else moves', () => {
    // Methane built from the first frame, one hydrogen at a time, in an awkward order.
    let board = INITIAL.board;
    let placed = layout(board, INITIAL.seeds);
    for (const h of [4, 7, 5, 6]) {
      const outcome = bond(board, 3, h);
      if (!outcome.ok) throw new Error(outcome.reason);
      const next = layout(outcome.board, placed);
      const moved = (id: number) => distance(next[id]!, placed[id]!);
      // Carbon and the hydrogens already joined stay put (within a hair).
      for (const id of [3, ...board.links.filter((l) => l.a === 3).map((l) => l.b)]) expect(moved(id), `atom ${id}`).toBeLessThan(1);
      // The new hydrogen travels only the short way to its slot.
      expect(moved(h), `hydrogen ${h}`).toBeLessThan(20);
      board = outcome.board;
      placed = next;
    }
    const angles = [5, 6, 7].map((h) => Math.round(angle(placed, 3, 4, h))).sort((x, y) => x - y);
    expect(angles).toEqual([90, 90, 180]);
  });

  /** Play a session the way the widget does (a new layout after every step), then check that molecules keep apart. */
  function session(steps: (['add', El] | ['join', number, number])[]) {
    let board = INITIAL.board;
    let placed = layout(board, INITIAL.seeds);
    for (const step of steps) {
      if (step[0] === 'add') {
        board = addAtom(board, step[1])!;
      } else {
        const outcome = bond(board, step[1], step[2]);
        if (!outcome.ok) throw new Error(`${step[1]}–${step[2]}: ${outcome.reason}`);
        board = outcome.board;
      }
      placed = layout(board, placed);
    }
    const groups = clusters(board);
    for (const [i, g] of groups.entries()) {
      for (const h of groups.slice(i + 1)) {
        for (const a of g) {
          for (const b of h) {
            const room = RADIUS[elementOf(board, a)] + RADIUS[elementOf(board, b)] + 22;
            expect(distance(placed[a]!, placed[b]!), `atoms ${a} and ${b}`).toBeGreaterThan(room);
          }
        }
      }
    }
  }

  it('keeps finished molecules apart, glow and all, even on a crowded board', () => {
    // Water, then methane, then carbon dioxide from three new atoms: eleven atoms in three molecules.
    session([
      ['join', 3, 4],
      ['join', 3, 7],
      ['join', 3, 5],
      ['join', 3, 6],
      ['add', 'C'],
      ['add', 'O'],
      ['add', 'O'],
      ['join', 8, 9],
      ['join', 8, 9],
      ['join', 8, 10],
      ['join', 8, 10],
    ]);
    // Magnesium chloride next to the water and the waiting methane atoms.
    session([['add', 'Mg'], ['add', 'Cl'], ['add', 'Cl'], ['join', 8, 9], ['join', 8, 10]]);
  });

  it('survives hundreds of random sessions: finite positions, true bond lengths, no overlaps', () => {
    // A small seeded random generator (mulberry32), so a failure can be replayed.
    let seed = 20260930;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;
    const elements = ['H', 'H', 'H', 'C', 'N', 'O', 'O', 'F', 'S', 'Cl', 'Na', 'Mg'] as const;
    let widest = 0;
    for (let run = 0; run < 150; run++) {
      let board = INITIAL.board;
      let placed = layout(board, INITIAL.seeds);
      for (let step = 0; step < 30; step++) {
        const roll = random();
        const ids = board.atoms.map((atom) => atom.id);
        if (roll < 0.3 || ids.length < 2) {
          board = addAtom(board, pick(elements)) ?? board;
        } else if (roll < 0.85) {
          const a = pick(ids);
          const outcome = bond(board, a, pick(ids.filter((id) => id !== a)));
          if (outcome.ok) board = outcome.board;
        } else if (roll < 0.93 && board.links.length) {
          const link = pick(board.links);
          board = loosen(board, link.a, link.b);
        } else {
          board = removeAtom(board, pick(ids));
        }
        placed = layout(board, placed);
        const where = `run ${run}, step ${step}`;
        for (const atom of board.atoms) expect(Number.isFinite(placed[atom.id]!.x) && Number.isFinite(placed[atom.id]!.y), where).toBe(true);
        // Crowding may zoom the view out a little, never so far that atoms get tiny.
        widest = Math.max(widest, viewBox(placed)[2]);
        const groups = clusters(board);
        for (const g of groups) {
          const links = board.links.filter((l) => g.includes(l.a));
          const ring = links.length >= g.length;
          if (ring) continue;
          for (const l of links) expect(distance(placed[l.a]!, placed[l.b]!), where).toBeCloseTo(BOND, 3);
          // A molecule never folds over itself: no bond runs across one of its other atoms.
          for (const l of links) {
            for (const id of g) {
              if (id === l.a || id === l.b) continue;
              const [p, q, c] = [placed[l.a]!, placed[l.b]!, placed[id]!];
              const t = Math.max(0, Math.min(1, ((c.x - p.x) * (q.x - p.x) + (c.y - p.y) * (q.y - p.y)) / BOND ** 2));
              const gap = Math.hypot(c.x - p.x - t * (q.x - p.x), c.y - p.y - t * (q.y - p.y));
              expect(gap, `${where}: bond ${l.a}–${l.b} runs over atom ${id}`).toBeGreaterThan(RADIUS[elementOf(board, id)] + 8);
            }
          }
        }
        for (const [i, g] of groups.entries()) {
          for (const h of groups.slice(i + 1)) {
            for (const a of g) {
              for (const b of h) {
                const room = RADIUS[elementOf(board, a)] + RADIUS[elementOf(board, b)] + 20;
                expect(distance(placed[a]!, placed[b]!), `${where}: atoms ${a} and ${b}`).toBeGreaterThan(room);
              }
            }
          }
        }
      }
    }
    expect(widest).toBeLessThan(BOARD.width * 1.6);
  });

  it('places a new atom in free space, and keeps every molecule on the board', () => {
    let board = INITIAL.board;
    let placed = layout(board, INITIAL.seeds);
    for (const el of ['O', 'N', 'Cl', 'Na'] as const) {
      board = addAtom(board, el)!;
      placed = layout(board, placed);
      expectTidy(board, placed);
    }
  });

  it('does not curl a long chain over itself when its atoms come from all over the board', () => {
    // Twelve atoms scattered by the palette, then joined end to end: H–O–O–…–O–H.
    let board = INITIAL.board;
    let placed = layout(board, INITIAL.seeds);
    board = { atoms: [], links: [], next: board.next };
    placed = layout(board, placed);
    for (const el of ['H', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'H'] as const) {
      board = addAtom(board, el)!;
      placed = layout(board, placed);
    }
    const ids = board.atoms.map((atom) => atom.id);
    for (let i = 0; i + 1 < ids.length; i++) {
      const outcome = bond(board, ids[i]!, ids[i + 1]!);
      if (!outcome.ok) throw new Error(outcome.reason);
      board = outcome.board;
      placed = layout(board, placed);
    }
    for (const a of ids) {
      for (const b of ids) {
        if (a < b && !board.links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))) {
          expect(distance(placed[a]!, placed[b]!), `atoms ${a} and ${b}`).toBeGreaterThan(RADIUS[elementOf(board, a)] + RADIUS[elementOf(board, b)] + 8);
        }
      }
    }
  });

  it('gives every atom a tap circle at least 44 px across on a 360 px phone', () => {
    // There the 360-unit board is drawn 264 px wide: 360 px, minus the page, figure, frame and stage padding.
    expect(PHONE_SCALE).toBeCloseTo(264 / 360, 5);
    expect(2 * HIT * PHONE_SCALE).toBeGreaterThanOrEqual(44);
  });

  it('gives each bond a tap band 44 px wide whose ends hide under the atoms’ tap circles', () => {
    expect(BOND_HIT * PHONE_SCALE).toBeGreaterThanOrEqual(44);
    expect(BOND_HIT / 2).toBeLessThan(HIT);
    // Between two joined atoms' tap circles there is still a stretch of bond to tap.
    expect(BOND - 2 * HIT).toBeGreaterThanOrEqual(24);
  });

  it('zooms out only when a molecule is too big for the board', () => {
    expect(viewBox(layout(INITIAL.board, INITIAL.seeds))).toEqual([0, 0, BOARD.width, BOARD.height]);
    // A chain of eleven bonds is much wider than the board.
    const chain = buildBoard('H O O O O O O O O O O H', '0-1 1-2 2-3 3-4 4-5 5-6 6-7 7-8 8-9 9-10 10-11');
    const [, , width, height] = viewBox(layout(chain, {}));
    expect(width).toBeGreaterThan(BOARD.width);
    expect(width / height).toBeCloseTo(BOARD.width / BOARD.height, 5);
  });
});
