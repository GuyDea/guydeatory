import { describe, expect, it } from 'vitest';
import {
  addAtom,
  atomShape,
  bond,
  buildBoard,
  charge,
  clusters,
  countAtoms,
  emptyBoard,
  freeValence,
  hillFormula,
  hint,
  ionNotation,
  isComplete,
  loosen,
  MAX_ATOMS,
  moleculeShape,
  partialCharges,
  removeAtom,
  transfer,
} from '../../src/widgets/molecule-lab/model.ts';
import type { Board, BondOutcome, El } from '../../src/widgets/molecule-lab/model.ts';

const all = (board: Board) => board.atoms.map((atom) => atom.id);

/** The board after a bond that must succeed. */
function must(outcome: BondOutcome): Board {
  if (!outcome.ok) throw new Error(`bond refused: ${outcome.reason}`);
  return outcome.board;
}

describe('MoleculeLab model: covalent bonds', () => {
  it('gives each element its textbook number of free bonds (metals: electrons to give)', () => {
    const expected: Record<El, number> = { H: 1, C: 4, N: 3, O: 2, F: 1, S: 2, Cl: 1, Na: 1, Mg: 2 };
    for (const [el, free] of Object.entries(expected)) {
      const board = addAtom(emptyBoard(), el as El)!;
      expect(freeValence(board, board.atoms[0]!.id), el).toBe(free);
    }
  });

  it('lets carbon make four single bonds and refuses a fifth', () => {
    const board = buildBoard('C H H H H H', '0-1 0-2 0-3 0-4');
    expect(freeValence(board, 0)).toBe(0);
    expect(bond(board, 0, 5)).toEqual({ ok: false, reason: 'full', atom: 0 });
  });

  it('raises the bond order when a joined pair is joined again', () => {
    let board = buildBoard('C N', '');
    board = must(bond(board, 0, 1));
    board = must(bond(board, 1, 0));
    expect(board.links).toEqual([{ a: 0, b: 1, order: 2, ionic: false }]);
    board = must(bond(board, 0, 1));
    expect(board.links).toEqual([{ a: 0, b: 1, order: 3, ionic: false }]);
  });

  it('stops at the bond order the weaker partner allows: 3 for C and N, 2 for O and S, 1 for H, F and Cl', () => {
    expect(bond(buildBoard('C N', '0#1'), 0, 1)).toEqual({ ok: false, reason: 'max-order', atom: 0 });
    expect(bond(buildBoard('O O', '0=1'), 0, 1)).toEqual({ ok: false, reason: 'max-order', atom: 0 });
    expect(bond(buildBoard('S S', '0=1'), 0, 1)).toEqual({ ok: false, reason: 'max-order', atom: 0 });
    // Carbon could make a triple bond, but oxygen allows only a double one.
    expect(bond(buildBoard('C O', '0=1'), 0, 1)).toEqual({ ok: false, reason: 'max-order', atom: 1 });
    expect(bond(buildBoard('H H', '0-1'), 0, 1)).toEqual({ ok: false, reason: 'max-order', atom: 0 });
    expect(bond(buildBoard('C Cl', '0-1'), 0, 1)).toEqual({ ok: false, reason: 'max-order', atom: 1 });
  });

  it('refuses a bond when an atom has no free bonds left', () => {
    // H₃C–O: carbon is full, so the C–O bond cannot become double.
    const board = buildBoard('C O H H H', '0-1 0-2 0-3 0-4');
    expect(bond(board, 0, 1)).toEqual({ ok: false, reason: 'full', atom: 0 });
    expect(bond(buildBoard('H H H', '0-1'), 2, 1)).toEqual({ ok: false, reason: 'full', atom: 1 });
  });

  it('loosens a bond one pair at a time, from either end', () => {
    let board = buildBoard('C O O', '0=1 0=2');
    board = loosen(board, 0, 1);
    expect(board.links).toEqual([
      { a: 0, b: 1, order: 1, ionic: false },
      { a: 0, b: 2, order: 2, ionic: false },
    ]);
    board = loosen(board, 1, 0);
    expect(board.links).toEqual([{ a: 0, b: 2, order: 2, ionic: false }]);
    expect(freeValence(board, 1)).toBe(2);
  });

  it('refuses to join an atom to itself', () => {
    expect(bond(buildBoard('C', ''), 0, 0)).toEqual({ ok: false, reason: 'same' });
    expect(bond(buildBoard('Na', ''), 0, 0)).toEqual({ ok: false, reason: 'same' });
  });

  it('keeps at most 12 atoms on the board', () => {
    let board = emptyBoard();
    for (let i = 0; i < MAX_ATOMS; i++) board = addAtom(board, 'H')!;
    expect(board.atoms).toHaveLength(12);
    expect(addAtom(board, 'H')).toBeNull();
  });

  it('removes an atom with its bonds, which frees its partners', () => {
    const board = removeAtom(buildBoard('O H H', '0-1 0-2'), 2);
    expect(board.atoms.map((atom) => atom.el)).toEqual(['O', 'H']);
    expect(board.links).toEqual([{ a: 0, b: 1, order: 1, ionic: false }]);
    expect(freeValence(board, 0)).toBe(1);
  });

  it('gives new atoms ids that are never reused', () => {
    let board = buildBoard('O H', '');
    board = removeAtom(board, 1);
    board = addAtom(board, 'H')!;
    expect(all(board)).toEqual([0, 2]);
  });
});

describe('MoleculeLab model: ionic bonds', () => {
  it('MgCl₂: magnesium gives one electron to each chlorine and ends up as Mg²⁺', () => {
    let board = buildBoard('Mg Cl Cl', '');
    const first = bond(board, 0, 1);
    expect(first).toMatchObject({ ok: true, link: { a: 0, b: 1, order: 1, ionic: true } });
    board = must(first);
    expect([charge(board, 0), charge(board, 1)]).toEqual([1, -1]);
    expect(freeValence(board, 0)).toBe(1);
    board = must(bond(board, 0, 2));
    expect([0, 1, 2].map((id) => charge(board, id))).toEqual([2, -1, -1]);
    expect(isComplete(board, all(board))).toBe(true);
  });

  it('MgO: magnesium hands both electrons to one oxygen', () => {
    const board = must(bond(buildBoard('Mg O', ''), 0, 1));
    expect(board.links).toEqual([{ a: 0, b: 1, order: 2, ionic: true }]);
    expect([charge(board, 0), charge(board, 1)]).toEqual([2, -2]);
    expect(isComplete(board, all(board))).toBe(true);
  });

  it('Na₂O: each sodium gives the oxygen one electron', () => {
    const board = buildBoard('Na Na O', '0>2 1>2');
    expect([0, 1, 2].map((id) => charge(board, id))).toEqual([1, 1, -2]);
    expect(isComplete(board, all(board))).toBe(true);
  });

  it('the metal always gives, whichever atom is picked first', () => {
    const board = must(bond(buildBoard('Cl Na', ''), 0, 1));
    expect(board.links).toEqual([{ a: 1, b: 0, order: 1, ionic: true }]);
  });

  it('refuses to join two metals', () => {
    expect(bond(buildBoard('Na Na', ''), 0, 1)).toEqual({ ok: false, reason: 'metals' });
    expect(bond(buildBoard('Mg Na', ''), 0, 1)).toEqual({ ok: false, reason: 'metals' });
  });

  it('refuses to join a metal and carbon', () => {
    expect(bond(buildBoard('Na C', ''), 0, 1)).toEqual({ ok: false, reason: 'metal-carbon' });
    expect(bond(buildBoard('C Mg', ''), 0, 1)).toEqual({ ok: false, reason: 'metal-carbon' });
  });

  it('refuses when the metal has given everything, or the nonmetal has no room', () => {
    expect(bond(buildBoard('Na Cl F', '0>1'), 0, 2)).toEqual({ ok: false, reason: 'full', atom: 0 });
    expect(bond(buildBoard('H Cl Na', '0-1'), 2, 1)).toEqual({ ok: false, reason: 'full', atom: 1 });
  });

  it('NaOH: an ionic bond and a covalent bond at once', () => {
    const board = buildBoard('Na O H', '1-2 0>1');
    expect([0, 1, 2].map((id) => charge(board, id))).toEqual([1, -1, 0]);
    expect(isComplete(board, all(board))).toBe(true);
  });

  it('writes ions with their charge: Na⁺, Mg²⁺, Cl⁻, O²⁻', () => {
    expect([ionNotation('Na', 1), ionNotation('Mg', 2), ionNotation('Cl', -1), ionNotation('O', -2), ionNotation('C', 0)]).toEqual([
      'Na⁺',
      'Mg²⁺',
      'Cl⁻',
      'O²⁻',
      '',
    ]);
  });

  it('describes an electron transfer: what jumped, and how far the metal and the nonmetal have got', () => {
    const half = buildBoard('Mg Cl Cl', '0>1');
    expect(transfer(half, half.links[0]!, 1)).toEqual({ metal: 'Mg', nonmetal: 'Cl', electrons: 1, given: 1, left: 1, taken: 1, room: 0 });
    const oxide = buildBoard('Na Na O', '0>2');
    expect(transfer(oxide, oxide.links[0]!, 1)).toEqual({ metal: 'Na', nonmetal: 'O', electrons: 1, given: 1, left: 0, taken: 1, room: 1 });
    const mgo = buildBoard('Mg O', '0>1');
    expect(transfer(mgo, mgo.links[0]!, 2)).toEqual({ metal: 'Mg', nonmetal: 'O', electrons: 2, given: 2, left: 0, taken: 2, room: 0 });
  });

  it('loosening an ionic bond gives one electron back', () => {
    const board = loosen(buildBoard('Mg O', '0>1'), 1, 0);
    expect(board.links).toEqual([{ a: 0, b: 1, order: 1, ionic: true }]);
    expect([charge(board, 0), charge(board, 1)]).toEqual([1, -1]);
  });
});

describe('MoleculeLab model: clusters and Hill formulas', () => {
  const formula = (atoms: string, bonds: string) => {
    const board = buildBoard(atoms, bonds);
    return hillFormula(countAtoms(board, all(board)));
  };

  it('groups joined atoms into clusters, in the order their first atoms were added', () => {
    const board = buildBoard('O H H C H', '0-1 0-2 3-4');
    expect(clusters(board)).toEqual([[0, 1, 2], [3, 4]]);
    expect(clusters(buildBoard('Na Cl H', '0>1'))).toEqual([[0, 1], [2]]);
  });

  it('puts carbon first, then hydrogen, then the other symbols alphabetically', () => {
    expect(formula('C H H H H', '0-1 0-2 0-3 0-4')).toBe('CH₄');
    expect(formula('C C O H H H H H H', '0-1 1-2 0-3 0-4 0-5 1-6 1-7 2-8')).toBe('C₂H₆O');
    expect(formula('C H Cl Cl Cl', '0-1 0-2 0-3 0-4')).toBe('CHCl₃');
    expect(formula('H C N', '0-1 1#2')).toBe('CHN');
    expect(formula('C O O', '0=1 0=2')).toBe('CO₂');
  });

  it('without carbon, sorts every symbol alphabetically, hydrogen included', () => {
    expect(formula('O H H', '0-1 0-2')).toBe('H₂O');
    expect(formula('N H H H', '0-1 0-2 0-3')).toBe('H₃N');
    expect(formula('Na Cl', '0>1')).toBe('ClNa');
    expect(formula('Mg Cl Cl', '0>1 0>2')).toBe('Cl₂Mg');
    expect(formula('H H', '0-1')).toBe('H₂');
    expect(formula('C', '')).toBe('C');
  });

  it('writes counts of ten or more with two subscript digits', () => {
    expect(hillFormula({ H: 12 })).toBe('H₁₂');
  });
});

describe('MoleculeLab model: completeness hints', () => {
  it('water is complete and needs no hint', () => {
    const board = buildBoard('O H H', '0-1 0-2');
    expect(isComplete(board, all(board))).toBe(true);
    expect(hint(board, all(board))).toBeNull();
  });

  it('says how many free bonds carbon still has', () => {
    const board = buildBoard('C H H', '0-1 0-2');
    expect(isComplete(board, all(board))).toBe(false);
    expect(hint(board, all(board))).toEqual({ kind: 'free', el: 'C', free: 2, metal: false });
  });

  it('suggests a stronger bond when two joined atoms both have room', () => {
    const board = buildBoard('C O H H', '0-1 0-2 0-3');
    expect(hint(board, all(board))).toEqual({ kind: 'raise', a: 'C', b: 'O', order: 2 });
    const nitrogen = buildBoard('N N', '0=1');
    expect(hint(nitrogen, all(nitrogen))).toEqual({ kind: 'raise', a: 'N', b: 'N', order: 3 });
  });

  it('tells when a metal still has an electron to give', () => {
    const board = buildBoard('Mg Cl', '0>1');
    expect(hint(board, all(board))).toEqual({ kind: 'free', el: 'Mg', free: 1, metal: true });
  });

  it('a lone atom is not complete', () => {
    const board = buildBoard('O', '');
    expect(isComplete(board, all(board))).toBe(false);
    expect(hint(board, all(board))).toEqual({ kind: 'free', el: 'O', free: 2, metal: false });
  });
});

describe('MoleculeLab model: shapes (VSEPR around the central atom)', () => {
  it('water is bent and carbon dioxide is linear', () => {
    expect(atomShape(buildBoard('O H H', '0-1 0-2'), 0)).toBe('bent');
    expect(atomShape(buildBoard('C O O', '0=1 0=2'), 0)).toBe('linear');
  });

  it('methane is tetrahedral and ammonia is a trigonal pyramid', () => {
    expect(atomShape(buildBoard('C H H H H', '0-1 0-2 0-3 0-4'), 0)).toBe('tetrahedral');
    expect(atomShape(buildBoard('N H H H', '0-1 0-2 0-3'), 0)).toBe('trigonal-pyramidal');
  });

  it('formaldehyde is a flat triangle, hydrogen cyanide a straight line, hydrogen sulfide bent', () => {
    expect(atomShape(buildBoard('C O H H', '0=1 0-2 0-3'), 0)).toBe('trigonal-planar');
    expect(atomShape(buildBoard('C H N', '0-1 0#2'), 0)).toBe('linear');
    expect(atomShape(buildBoard('S H H', '0-1 0-2'), 0)).toBe('bent');
  });

  it('gives no shape of its own to an end atom', () => {
    expect(atomShape(buildBoard('O H H', '0-1 0-2'), 1)).toBeNull();
  });

  it('describes whole molecules: pairs, centres and ionic compounds', () => {
    const shapeOf = (atoms: string, bonds: string) => {
      const board = buildBoard(atoms, bonds);
      return moleculeShape(board, all(board));
    };
    expect(shapeOf('H H', '0-1')).toEqual({ kind: 'pair' });
    expect(shapeOf('O H H', '0-1 0-2')).toEqual({ kind: 'centres', centres: [{ el: 'O', shape: 'bent' }] });
    // Ethanol: both carbons are tetrahedral, the oxygen is bent. Each kind of centre is listed once.
    expect(shapeOf('C C O H H H H H H', '0-1 1-2 0-3 0-4 0-5 1-6 1-7 2-8')).toEqual({
      kind: 'centres',
      centres: [
        { el: 'C', shape: 'tetrahedral' },
        { el: 'O', shape: 'bent' },
      ],
    });
    expect(shapeOf('Na Cl', '0>1')).toEqual({ kind: 'ionic' });
    expect(shapeOf('Na O H', '1-2 0>1')).toEqual({ kind: 'ionic' });
  });
});

describe('MoleculeLab model: partial charges (δ+ and δ−)', () => {
  it('water: δ− on the oxygen, δ+ on both hydrogens', () => {
    const board = buildBoard('O H H', '0-1 0-2');
    expect(partialCharges(board, all(board))).toEqual({ 0: -1, 1: 1, 2: 1 });
  });

  it('counts C–H bonds as nonpolar: hydrogen cyanide has δ+ carbon and δ− nitrogen', () => {
    const board = buildBoard('H C N', '0-1 1#2');
    expect(partialCharges(board, all(board))).toEqual({ 1: 1, 2: -1 });
  });

  it('chloromethane: δ+ carbon, δ− chlorine, nothing on the hydrogens', () => {
    const board = buildBoard('C Cl H H H', '0-1 0-2 0-3 0-4');
    expect(partialCharges(board, all(board))).toEqual({ 0: 1, 1: -1 });
  });

  it('hydrogen sulfide: δ− sulfur, δ+ hydrogens', () => {
    const board = buildBoard('S H H', '0-1 0-2');
    expect(partialCharges(board, all(board))).toEqual({ 0: -1, 1: 1, 2: 1 });
  });
});
