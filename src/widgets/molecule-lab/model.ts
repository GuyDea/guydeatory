/**
 * The chemistry of the molecule lab: pure functions over an immutable board of atoms.
 *
 * The rules are the school model of bonding, simplified but not wrong:
 * - Nonmetals (H, C, N, O, F, S, Cl) share pairs of electrons, a covalent bond. Each makes as many
 *   bonds as it has unpaired outer electrons, its valence: H 1, C 4, N 3, O 2, F 1, S 2, Cl 1.
 *   Joining a joined pair again shares one more pair, up to a triple bond for C and N, a double
 *   bond for O and S, and a single bond for H, F and Cl.
 * - Metals (Na, Mg) give their outer electrons (Na 1, Mg 2) to a nonmetal that still has room: an
 *   ionic bond. The metal becomes a positive ion, the nonmetal a negative one.
 * - Two metals make no molecule. In this lab carbon only shares: it takes no electrons from metals
 *   (real metal carbides and cyanides exist, but they are special cases).
 * - Sulfur keeps its valence of 2, as in H₂S. Its larger valences (SO₂, H₂SO₄) are left out.
 */

export const ELEMENTS = ['H', 'C', 'N', 'O', 'F', 'S', 'Cl', 'Na', 'Mg'] as const;
export type El = (typeof ELEMENTS)[number];

export const isMetal = (el: El): boolean => el === 'Na' || el === 'Mg';

/** Free bonds of a lone nonmetal (its unpaired outer electrons), or the electrons a lone metal gives away. */
export const VALENCE: Record<El, number> = { H: 1, C: 4, N: 3, O: 2, F: 1, S: 2, Cl: 1, Na: 1, Mg: 2 };

/** The strongest bond an element makes with one partner: triple for C and N, double for O and S. */
export const MAX_ORDER: Record<El, number> = { H: 1, C: 3, N: 3, O: 2, F: 1, S: 2, Cl: 1, Na: 0, Mg: 0 };

/** Pairs of outer electrons a neutral atom keeps for itself (outer electrons minus valence, halved). */
export const LONE_PAIRS: Record<El, number> = { H: 0, C: 0, N: 1, O: 2, F: 3, S: 2, Cl: 3, Na: 0, Mg: 0 };

/** Pauling electronegativity × 100: how hard an atom pulls on shared electrons. */
const ELECTRONEGATIVITY: Record<El, number> = { H: 220, C: 255, N: 304, O: 344, F: 398, S: 258, Cl: 316, Na: 93, Mg: 131 };

export const MAX_ATOMS = 12;

export interface Atom {
  id: number;
  el: El;
}

/** A covalent bond (order = shared pairs), or an ionic bond from metal `a` to nonmetal `b` (order = electrons given). */
export interface Link {
  a: number;
  b: number;
  order: number;
  ionic: boolean;
}

export interface Board {
  atoms: Atom[];
  links: Link[];
  /** The id the next atom gets. Ids are never reused, so a removed atom's id cannot come back. */
  next: number;
}

export type Refusal = 'metals' | 'metal-carbon' | 'full' | 'max-order';

export type BondOutcome = { ok: true; board: Board; link: Link } | { ok: false; reason: Refusal; atom?: number };

/** What an unfinished molecule needs next: a stronger bond between two joined atoms, or partners for an atom. */
export type Hint = { kind: 'raise'; a: El; b: El; order: number } | { kind: 'free'; el: El; free: number; metal: boolean };

export type Shape = 'linear' | 'bent' | 'trigonal-planar' | 'trigonal-pyramidal' | 'tetrahedral';

export type MoleculeShape = { kind: 'ionic' } | { kind: 'pair' } | { kind: 'centres'; centres: { el: El; shape: Shape }[] };

export const emptyBoard = (): Board => ({ atoms: [], links: [], next: 0 });

export function addAtom(board: Board, el: El): Board | null {
  if (!ELEMENTS.includes(el)) throw new Error(`Unknown element ${el}`);
  if (board.atoms.length >= MAX_ATOMS) return null;
  return { atoms: [...board.atoms, { id: board.next, el }], links: board.links, next: board.next + 1 };
}

export function removeAtom(board: Board, id: number): Board {
  return {
    atoms: board.atoms.filter((atom) => atom.id !== id),
    links: board.links.filter((link) => link.a !== id && link.b !== id),
    next: board.next,
  };
}

export const elementOf = (board: Board, id: number): El => board.atoms.find((atom) => atom.id === id)!.el;

export const linkBetween = (board: Board, a: number, b: number): Link | undefined =>
  board.links.find((link) => (link.a === a && link.b === b) || (link.a === b && link.b === a));

/** The links an atom takes part in, each with the atom at its other end. */
export const linksOf = (board: Board, id: number): { link: Link; other: number }[] =>
  board.links.filter((link) => link.a === id || link.b === id).map((link) => ({ link, other: link.a === id ? link.b : link.a }));

/** Free bonds a nonmetal still has, or electrons a metal can still give. */
export function freeValence(board: Board, id: number): number {
  return VALENCE[elementOf(board, id)] - linksOf(board, id).reduce((used, { link }) => used + link.order, 0);
}

/** The ion charge: + for each electron a metal gave, − for each a nonmetal took. */
export function charge(board: Board, id: number): number {
  let q = 0;
  for (const link of board.links) {
    if (!link.ionic) continue;
    if (link.a === id) q += link.order;
    if (link.b === id) q -= link.order;
  }
  return q;
}

const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** How an ion is written: Na⁺, Mg²⁺, Cl⁻, O²⁻; empty for a neutral atom. */
export function ionNotation(el: El, q: number): string {
  if (!q) return '';
  return `${el}${Math.abs(q) > 1 ? SUPERSCRIPTS[Math.abs(q)] : ''}${q > 0 ? '⁺' : '⁻'}`;
}

function withLink(board: Board, existing: Link | undefined, link: Link): Board {
  const links = existing ? board.links.map((l) => (l === existing ? link : l)) : [...board.links, link];
  return { ...board, links };
}

/** Join atoms `a` and `b`, or share one more pair if they are joined already. */
export function bond(board: Board, a: number, b: number): BondOutcome {
  const [ea, eb] = [elementOf(board, a), elementOf(board, b)];
  const [ma, mb] = [isMetal(ea), isMetal(eb)];
  if (ma && mb) return { ok: false, reason: 'metals' };
  if ((ma && eb === 'C') || (mb && ea === 'C')) return { ok: false, reason: 'metal-carbon' };
  const existing = linkBetween(board, a, b);
  if (!ma && !mb && existing && existing.order >= Math.min(MAX_ORDER[ea], MAX_ORDER[eb])) {
    return { ok: false, reason: 'max-order', atom: MAX_ORDER[ea] <= MAX_ORDER[eb] ? a : b };
  }
  for (const id of [a, b]) if (freeValence(board, id) === 0) return { ok: false, reason: 'full', atom: id };
  if (ma || mb) {
    // The metal gives as many electrons as it has left and the nonmetal has room for.
    const [metal, other] = ma ? [a, b] : [b, a];
    const given = Math.min(freeValence(board, metal), freeValence(board, other));
    const link = { a: metal, b: other, order: (existing?.order ?? 0) + given, ionic: true };
    return { ok: true, board: withLink(board, existing, link), link };
  }
  const link = existing ? { ...existing, order: existing.order + 1 } : { a, b, order: 1, ionic: false };
  return { ok: true, board: withLink(board, existing, link), link };
}

/** Take one pair back from a bond (or one electron back from an ionic bond); at zero the bond is gone. */
export function loosen(board: Board, a: number, b: number): Board {
  const existing = linkBetween(board, a, b);
  if (!existing) return board;
  const links =
    existing.order > 1
      ? board.links.map((link) => (link === existing ? { ...link, order: link.order - 1 } : link))
      : board.links.filter((link) => link !== existing);
  return { ...board, links };
}

/**
 * A board from a compact recipe, used by the molecule dictionary and the tests.
 * `atoms` lists symbols ("C O O"); the atoms get ids 0, 1, 2… in that order. `bonds` lists links:
 * "0-1" single, "0=1" double, "0#1" triple, "0>1" ionic (metal 0 gives to nonmetal 1).
 */
export function buildBoard(atoms: string, bonds: string): Board {
  let board = emptyBoard();
  for (const el of atoms.split(/\s+/).filter(Boolean)) {
    const next = addAtom(board, el as El);
    if (!next) throw new Error(`More than ${MAX_ATOMS} atoms: ${atoms}`);
    board = next;
  }
  for (const token of bonds.split(/\s+/).filter(Boolean)) {
    const match = /^(\d+)([-=#>])(\d+)$/.exec(token);
    if (!match) throw new Error(`Bad bond "${token}"`);
    const [a, b] = [Number(match[1]), Number(match[3])];
    const ionic = match[2] === '>';
    if (ionic !== isMetal(elementOf(board, a)) || isMetal(elementOf(board, b))) throw new Error(`"${token}" does not match its atoms`);
    for (let i = 0; i < ({ '-': 1, '=': 2, '#': 3, '>': 1 } as const)[match[2] as '-']; i++) {
      const outcome = bond(board, a, b);
      if (!outcome.ok) throw new Error(`"${token}" refused: ${outcome.reason}`);
      board = outcome.board;
    }
  }
  return board;
}

/** Groups of joined atoms (by ids, ascending), in the order their first atoms were added. */
export function clusters(board: Board): number[][] {
  const seen = new Set<number>();
  const groups: number[][] = [];
  for (const atom of board.atoms) {
    if (seen.has(atom.id)) continue;
    const group: number[] = [];
    const stack = [atom.id];
    seen.add(atom.id);
    while (stack.length) {
      const id = stack.pop()!;
      group.push(id);
      for (const { other } of linksOf(board, id)) {
        if (!seen.has(other)) {
          seen.add(other);
          stack.push(other);
        }
      }
    }
    groups.push(group.sort((x, y) => x - y));
  }
  return groups;
}

export function countAtoms(board: Board, ids: number[]): Partial<Record<El, number>> {
  const counts: Partial<Record<El, number>> = {};
  for (const id of ids) {
    const el = elementOf(board, id);
    counts[el] = (counts[el] ?? 0) + 1;
  }
  return counts;
}

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';
const subscript = (n: number) => (n === 1 ? '' : [...String(n)].map((digit) => SUBSCRIPTS[Number(digit)]).join(''));

/** Elements in Hill order: carbon, then hydrogen, then the rest alphabetically; without carbon, all alphabetically. */
export function hillOrder(els: El[]): El[] {
  const sorted = [...new Set(els)].sort();
  if (!sorted.includes('C')) return sorted;
  return ['C', ...sorted.filter((el) => el === 'H'), ...sorted.filter((el) => el !== 'C' && el !== 'H')];
}

/** A formula in Hill order, the standard neutral way to write any formula: CH₄, C₂H₆O, H₂O, ClNa. */
export function hillFormula(counts: Partial<Record<El, number>>): string {
  const present = (Object.keys(counts) as El[]).filter((el) => (counts[el] ?? 0) > 0);
  return hillOrder(present)
    .map((el) => el + subscript(counts[el]!))
    .join('');
}

/** Every atom in the group has used all its bonds (and every metal has given all its electrons). */
export function isComplete(board: Board, ids: number[]): boolean {
  return ids.length > 1 && ids.every((id) => freeValence(board, id) === 0);
}

/** What the unfinished group needs next, or null when it is complete. */
export function hint(board: Board, ids: number[]): Hint | null {
  if (isComplete(board, ids)) return null;
  const inside = new Set(ids);
  for (const link of board.links) {
    if (link.ionic || !inside.has(link.a)) continue;
    const [ea, eb] = [elementOf(board, link.a), elementOf(board, link.b)];
    const room = freeValence(board, link.a) > 0 && freeValence(board, link.b) > 0;
    if (room && link.order < Math.min(MAX_ORDER[ea], MAX_ORDER[eb])) return { kind: 'raise', a: ea, b: eb, order: link.order + 1 };
  }
  let neediest = ids[0]!;
  for (const id of ids) if (freeValence(board, id) > freeValence(board, neediest)) neediest = id;
  const el = elementOf(board, neediest);
  return { kind: 'free', el, free: freeValence(board, neediest), metal: isMetal(el) };
}

const isIonic = (board: Board, id: number) => isMetal(elementOf(board, id)) || linksOf(board, id).some(({ link }) => link.ionic);

/**
 * The VSEPR shape around one atom, from its neighbours and its electron groups (neighbours, lone
 * pairs and any unpaired electrons). End atoms and ions have no shape of their own.
 */
export function atomShape(board: Board, id: number): Shape | null {
  if (isIonic(board, id)) return null;
  const neighbours = linksOf(board, id).length;
  if (neighbours < 2) return null;
  const groups = neighbours + LONE_PAIRS[elementOf(board, id)] + freeValence(board, id);
  if (neighbours === 2) return groups === 2 ? 'linear' : 'bent';
  if (neighbours === 3) return groups === 3 ? 'trigonal-planar' : 'trigonal-pyramidal';
  return 'tetrahedral';
}

/** The shape of a whole molecule: each kind of centre once (carbon first), a pair, or an ionic compound. */
export function moleculeShape(board: Board, ids: number[]): MoleculeShape {
  if (ids.some((id) => isIonic(board, id))) return { kind: 'ionic' };
  if (ids.length === 2) return { kind: 'pair' };
  const centres: { el: El; shape: Shape }[] = [];
  for (const id of ids) {
    const shape = atomShape(board, id);
    const el = elementOf(board, id);
    if (shape && !centres.some((c) => c.el === el && c.shape === shape)) centres.push({ el, shape });
  }
  const rank = hillOrder(centres.map((c) => c.el));
  centres.sort((x, y) => rank.indexOf(x.el) - rank.indexOf(y.el));
  return { kind: 'centres', centres };
}

/**
 * δ+ and δ− on a polar molecule: an atom is δ− when its partners pull on the shared electrons less
 * than it does (Pauling electronegativity), δ+ when they pull more. C–H bonds count as nonpolar, as
 * in school chemistry. Only atoms with a clear pull are marked.
 */
export function partialCharges(board: Board, ids: number[]): Record<number, 1 | -1> {
  const marks: Record<number, 1 | -1> = {};
  for (const id of ids) {
    const el = elementOf(board, id);
    let pull = 0;
    for (const { link, other } of linksOf(board, id)) {
      const partner = elementOf(board, other);
      if (link.ionic || (el === 'C' && partner === 'H') || (el === 'H' && partner === 'C')) continue;
      pull += ELECTRONEGATIVITY[partner] - ELECTRONEGATIVITY[el];
    }
    if (Math.abs(pull) >= 20) marks[id] = pull > 0 ? 1 : -1;
  }
  return marks;
}

/**
 * A fingerprint of how the group's atoms are joined, the same however the atoms were added or
 * numbered: colour refinement (Weisfeiler–Lehman) over elements and bond kinds. It tells isomers
 * apart (ethanol and dimethyl ether) and identifies every molecule without rings exactly.
 */
export function structureKey(board: Board, ids: number[]): string {
  const index = new Map(ids.map((id, i) => [id, i]));
  const near: [string, number][][] = ids.map(() => []);
  for (const link of board.links) {
    const [i, j] = [index.get(link.a), index.get(link.b)];
    if (i === undefined || j === undefined) continue;
    const kind = (link.ionic ? 'i' : 'c') + link.order;
    near[i]!.push([kind, j]);
    near[j]!.push([kind, i]);
  }
  let colour: string[] = ids.map((id) => elementOf(board, id));
  let classes = new Set(colour).size;
  let key = '';
  for (let round = 0; round < ids.length; round++) {
    const signature = colour.map((c, i) => `${c}(${near[i]!.map(([kind, j]) => kind + colour[j]).sort().join(',')})`);
    const palette = [...new Set(signature)].sort();
    key += palette.map((s) => `${s}*${signature.filter((t) => t === s).length}`).join(';') + '|';
    colour = signature.map((s) => String(palette.indexOf(s)));
    if (palette.length === classes) break;
    classes = palette.length;
  }
  return key;
}
