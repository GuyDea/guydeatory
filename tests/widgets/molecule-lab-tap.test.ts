import { describe, expect, it } from 'vitest';
import { buildBoard, linkBetween } from '../../src/widgets/molecule-lab/model.ts';
import type { Board } from '../../src/widgets/molecule-lab/model.ts';
import { tap } from '../../src/widgets/molecule-lab/tap.ts';
import type { TapOutcome } from '../../src/widgets/molecule-lab/tap.ts';

/** Tap atoms one after another, as a reader would, starting with nothing picked. */
function play(board: Board, taps: number[]) {
  let picked: number | null = null;
  const outcomes: TapOutcome[] = [];
  for (const id of taps) {
    const outcome = tap(board, picked, id);
    if (outcome.kind === 'joined') board = outcome.board;
    picked = outcome.picked;
    outcomes.push(outcome);
  }
  return { board, picked, outcomes, last: outcomes.at(-1)! };
}

const order = (board: Board, a: number, b: number) => linkBetween(board, a, b)?.order ?? 0;

describe('MoleculeLab taps: picking', () => {
  it('picks the tapped atom when nothing is picked, and lets go when it is tapped again', () => {
    const board = buildBoard('C O', '');
    expect(tap(board, null, 0)).toEqual({ kind: 'picked', picked: 0 });
    expect(tap(board, 0, 0)).toEqual({ kind: 'unpicked', picked: null });
  });

  it('picks the tapped atom when the picked one is no longer on the board', () => {
    expect(tap(buildBoard('C O', ''), 7, 1)).toEqual({ kind: 'picked', picked: 1 });
  });
});

describe('MoleculeLab taps: joining', () => {
  it('C, O, O: picking the second atom again makes a double bond', () => {
    const { board, picked, outcomes } = play(buildBoard('C O O', ''), [0, 1, 1]);
    expect(order(board, 0, 1)).toBe(2);
    // After the first join the carbon is still picked, and a second tap on that oxygen would give a double bond.
    expect(outcomes[1]).toMatchObject({ kind: 'joined', a: 0, b: 1, picked: 0, raise: 2 });
    expect(outcomes[2]).toMatchObject({ kind: 'joined', a: 0, b: 1, picked: 0, raise: null });
    expect(picked).toBe(0);
  });

  it('C, O, O, O′, O′ makes carbon dioxide, and then nothing is picked', () => {
    const { board, picked } = play(buildBoard('C O O', ''), [0, 1, 1, 2, 2]);
    expect([order(board, 0, 1), order(board, 0, 2)]).toEqual([2, 2]);
    expect(picked).toBeNull();
  });

  it('keeps the first atom picked while it has free bonds: C, then H, H, H, H makes methane', () => {
    const { board, outcomes } = play(buildBoard('C H H H H', ''), [0, 1, 2, 3, 4]);
    expect(outcomes.slice(1).map((o) => o.picked)).toEqual([0, 0, 0, null]);
    // Hydrogen makes only single bonds, so picking it again would not raise the bond.
    expect(outcomes.slice(1).map((o) => (o.kind === 'joined' ? o.raise : 'not joined'))).toEqual([null, null, null, null]);
    expect(board.links).toHaveLength(4);
  });

  it('lets go of the first atom once it is full: H, then O', () => {
    expect(play(buildBoard('H O', ''), [0, 1]).last).toMatchObject({ kind: 'joined', a: 0, b: 1, picked: null, raise: null });
  });

  it('offers a triple bond after a double one: N, N′, N′', () => {
    const { outcomes } = play(buildBoard('N N', ''), [0, 1, 1, 1]);
    expect(outcomes.slice(1).map((o) => (o.kind === 'joined' ? [o.link.order, o.picked, o.raise] : o.kind))).toEqual([
      [1, 0, 2],
      [2, 0, 3],
      [3, null, null],
    ]);
  });

  it('keeps a metal picked while it has an electron left: Mg, Cl, Cl′ makes magnesium chloride', () => {
    const { board, outcomes } = play(buildBoard('Mg Cl Cl', ''), [0, 1, 2]);
    expect(outcomes[1]).toMatchObject({ kind: 'joined', picked: 0, raise: null, link: { a: 0, b: 1, order: 1, ionic: true } });
    expect(outcomes[2]).toMatchObject({ kind: 'joined', picked: null, link: { a: 0, b: 2, order: 1, ionic: true } });
    expect(board.links).toHaveLength(2);
  });
});

describe('MoleculeLab taps: refusals', () => {
  it('makes the tapped atom the new pick after a refusal', () => {
    const board = buildBoard('C Na Cl', '');
    expect(tap(board, 0, 1)).toEqual({ kind: 'refused', picked: 1, reason: 'metal-carbon' });
  });

  it('a refusal followed by another tap joins that atom, not the first one: C, Na, Cl makes salt', () => {
    const { board, picked } = play(buildBoard('C Na Cl', ''), [0, 1, 2]);
    expect(board.links).toEqual([{ a: 1, b: 2, order: 1, ionic: true }]);
    expect(picked).toBeNull();
  });

  it('never joins atoms nobody asked for: C, Na (refused), Na, Cl makes no bond', () => {
    const { board, picked, outcomes } = play(buildBoard('C Na Cl', ''), [0, 1, 1, 2]);
    expect(outcomes.map((o) => o.kind)).toEqual(['picked', 'refused', 'unpicked', 'picked']);
    expect(board.links).toEqual([]);
    expect(picked).toBe(2);
  });

  it('says which atom stopped the bond', () => {
    // Water's oxygen is full: picking it and then a hydrogen is refused, and the hydrogen is picked.
    expect(tap(buildBoard('O H H H', '0-1 0-2'), 0, 3)).toEqual({ kind: 'refused', picked: 3, reason: 'full', atom: 0 });
  });
});
