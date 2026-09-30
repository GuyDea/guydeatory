import { describe, expect, it } from 'vitest';
import { buildBoard, countAtoms, isComplete, clusters } from '../../src/widgets/molecule-lab/model.ts';
import type { Board, El } from '../../src/widgets/molecule-lab/model.ts';
import { displayFormula, INITIAL, MOLECULES, QUESTS, recognise, report } from '../../src/widgets/molecule-lab/molecules.ts';

const all = (board: Board) => board.atoms.map((atom) => atom.id);
const named = (atoms: string, bonds: string) => {
  const board = buildBoard(atoms, bonds);
  return recognise(board, all(board))?.id ?? null;
};

/** Atom counts of a formula written with Unicode subscripts: "CH₃COOH" → { C: 2, H: 4, O: 2 }. */
function parseFormula(formula: string): Partial<Record<El, number>> {
  const counts: Partial<Record<El, number>> = {};
  for (const [, symbol, digits] of formula.matchAll(/([A-Z][a-z]?)([₀-₉]*)/g)) {
    const n = digits ? Number([...digits!].map((d) => d.charCodeAt(0) - 0x2080).join('')) : 1;
    counts[symbol as El] = (counts[symbol as El] ?? 0) + n;
  }
  return counts;
}

describe('MoleculeLab: recognising molecules', () => {
  it('recognises water however its atoms were added', () => {
    expect(named('O H H', '0-1 0-2')).toBe('water');
    expect(named('H H O', '2-0 1-2')).toBe('water');
  });

  it('recognises carbon dioxide only with both double bonds', () => {
    expect(named('O C O', '1=0 1=2')).toBe('co2');
    expect(named('O C O', '1-0 1-2')).toBeNull();
    expect(named('O C O', '1=0 1-2')).toBeNull();
  });

  it('tells ethanol from dimethyl ether: the same atoms (C₂H₆O), joined differently', () => {
    const ethanol = buildBoard('C C O H H H H H H', '0-1 1-2 0-3 0-4 0-5 1-6 1-7 2-8');
    const ether = buildBoard('C O C H H H H H H', '0-1 1-2 0-3 0-4 0-5 2-6 2-7 2-8');
    expect(countAtoms(ethanol, all(ethanol))).toEqual(countAtoms(ether, all(ether)));
    expect(recognise(ethanol, all(ethanol))?.id).toBe('ethanol');
    expect(recognise(ether, all(ether))?.id).toBe('dme');
  });

  it('recognises ionic compounds', () => {
    expect(named('Na Cl', '0>1')).toBe('nacl');
    expect(named('Cl Mg Cl', '1>0 1>2')).toBe('mgcl2');
    expect(named('Mg O', '0>1')).toBe('mgo');
    expect(named('H O Na', '0-1 2>1')).toBe('naoh');
  });

  it('leaves real molecules that are not in the list unnamed', () => {
    expect(named('N N H H H H', '0-1 0-2 0-3 1-4 1-5')).toBeNull(); // hydrazine
    expect(named('Na H', '0>1')).toBeNull(); // sodium hydride
  });

  it('shows the usual formula for a named molecule, and the Hill formula otherwise', () => {
    const ammonia = buildBoard('N H H H', '0-1 0-2 0-3');
    expect(displayFormula(ammonia, all(ammonia))).toBe('NH₃');
    const salt = buildBoard('Cl Na', '1>0');
    expect(displayFormula(salt, all(salt))).toBe('NaCl');
    const unfinished = buildBoard('C H H', '0-1 0-2');
    expect(displayFormula(unfinished, all(unfinished))).toBe('CH₂');
    // An unnamed ionic compound puts its metal first, as chemists write NaH, not HNa.
    const hydride = buildBoard('H Na', '1>0');
    expect(displayFormula(hydride, all(hydride))).toBe('NaH');
  });
});

describe('MoleculeLab: the molecule dictionary', () => {
  it('has 25 to 35 molecules with unique ids', () => {
    expect(MOLECULES.length).toBeGreaterThanOrEqual(25);
    expect(MOLECULES.length).toBeLessThanOrEqual(35);
    expect(new Set(MOLECULES.map((m) => m.id)).size).toBe(MOLECULES.length);
  });

  it('builds every entry as one complete molecule of at most 12 atoms that is recognised as itself', () => {
    for (const molecule of MOLECULES) {
      const board = buildBoard(molecule.atoms, molecule.bonds);
      expect(board.atoms.length, molecule.id).toBeLessThanOrEqual(12);
      expect(clusters(board), molecule.id).toHaveLength(1);
      expect(isComplete(board, all(board)), molecule.id).toBe(true);
      expect(recognise(board, all(board))?.id, molecule.id).toBe(molecule.id);
    }
  });

  it('writes each formula with exactly the atoms its structure has', () => {
    for (const molecule of MOLECULES) {
      const board = buildBoard(molecule.atoms, molecule.bonds);
      expect(parseFormula(molecule.formula), molecule.id).toEqual(countAtoms(board, all(board)));
    }
  });

  it('calls a compound ionic exactly when it contains a metal', () => {
    for (const molecule of MOLECULES) {
      const metal = /\b(Na|Mg)\b/.test(molecule.atoms);
      expect(molecule.polarity === 'ionic', molecule.id).toBe(metal);
    }
  });

  it('has every molecule the plan asks for', () => {
    const ids = MOLECULES.map((m) => m.id);
    for (const id of ['h2', 'o2', 'n2', 'f2', 'cl2', 'hf', 'hcl', 'water', 'h2o2', 'h2s', 'ammonia', 'methane', 'co2', 'hcn']) {
      expect(ids).toContain(id);
    }
    for (const id of ['ethane', 'ethene', 'ethyne', 'methanol', 'ethanol', 'dme', 'formaldehyde', 'ccl4', 'chloroform', 'chloromethane']) {
      expect(ids).toContain(id);
    }
    for (const id of ['nacl', 'naf', 'naoh', 'mgo', 'mgcl2', 'mgf2', 'na2o', 'na2s', 'mgs']) expect(ids).toContain(id);
  });

  it('has eight quests, in order, each a molecule in the dictionary', () => {
    expect(QUESTS).toEqual(['h2', 'water', 'co2', 'methane', 'ammonia', 'n2', 'nacl', 'naoh']);
    for (const quest of QUESTS) expect(MOLECULES.some((m) => m.id === quest)).toBe(true);
  });
});

describe('MoleculeLab: the board report', () => {
  it('starts with finished water, and a carbon and four hydrogens ready to become methane', () => {
    const { items, free } = report(INITIAL.board);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ formula: 'H₂O', complete: true, hint: null });
    expect(items[0]!.molecule?.id).toBe('water');
    expect(free).toEqual([
      ['C', 1],
      ['H', 4],
    ]);
  });

  it('reports unfinished clusters with their hint, and lists free atoms in Hill order', () => {
    const { items, free } = report(buildBoard('C H H N O O Cl', '0-1 0-2'));
    expect(items).toEqual([{ ids: [0, 1, 2], molecule: null, formula: 'CH₂', complete: false, hint: { kind: 'free', el: 'C', free: 2, metal: false } }]);
    expect(free).toEqual([
      ['Cl', 1],
      ['N', 1],
      ['O', 2],
    ]);
  });
});
