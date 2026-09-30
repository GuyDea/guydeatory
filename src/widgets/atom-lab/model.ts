/**
 * AtomLab: what a handful of protons, neutrons and electrons makes. Pure functions, no DOM.
 * The element and nuclide data, and where it comes from, are in data.ts.
 */
import { ELEMENTS, RADIOACTIVE, STABLE } from './data.ts';
import type { ElementData, HalfLife } from './data.ts';

export type Particle = 'protons' | 'neutrons' | 'electrons';
export type Atom = Record<Particle, number>;
export type QuestSet = 'atoms' | 'isotopes' | 'ions';

export const PARTICLES: readonly Particle[] = ['protons', 'neutrons', 'electrons'];
export const LIMITS: Readonly<Atom> = { protons: 20, neutrons: 30, electrons: 20 };

/** The neutral atom of an element's most common isotope: what tapping it in the table builds. */
export function mostCommon(z: number): Atom {
  const element = ELEMENTS[z - 1];
  if (!element) throw new RangeError(`No element ${z}`);
  return { protons: z, neutrons: element.common - z, electrons: z };
}

/** The atom each quest set starts from. */
export const START: Record<QuestSet, Atom> = { atoms: mostCommon(6), isotopes: mostCommon(6), ions: mostCommon(11) };

// ── The nucleus ──────────────────────────────────────────────────────────────────────────────────

export type Nucleus =
  | { kind: 'none' }
  /** A single neutron and no protons: it decays in about 10 minutes. */
  | { kind: 'neutron' }
  /** Two or more neutrons and no protons: they don't stick together. */
  | { kind: 'neutrons' }
  | { kind: 'stable' }
  | { kind: 'radioactive'; halfLife: HalfLife }
  /** Falls apart within a day, usually in a fraction of a second, and why. */
  | { kind: 'unbound'; why: 'few-neutrons' | 'many-neutrons' | 'gap' };

/** Mass numbers of the nuclei of element z that last at least a day. */
function lasting(z: number): number[] {
  return [...(STABLE[z] ?? []), ...Object.keys(RADIOACTIVE[z] ?? {}).map(Number)];
}

export function nucleus(protons: number, neutrons: number): Nucleus {
  if (protons === 0) return { kind: neutrons === 0 ? 'none' : neutrons === 1 ? 'neutron' : 'neutrons' };
  const a = protons + neutrons;
  if (STABLE[protons]?.includes(a)) return { kind: 'stable' };
  const halfLife = RADIOACTIVE[protons]?.[a];
  if (halfLife) return { kind: 'radioactive', halfLife };
  const known = lasting(protons).map((m) => m - protons);
  const why = neutrons < Math.min(...known) ? 'few-neutrons' : neutrons > Math.max(...known) ? 'many-neutrons' : 'gap';
  return { kind: 'unbound', why };
}

/** A nucleus that lasts at least a day: a real atom's nucleus, stable or radioactive. */
export function lasts(atom: Atom): boolean {
  const kind = nucleus(atom.protons, atom.neutrons).kind;
  return kind === 'stable' || kind === 'radioactive';
}

export type Scale = 'day' | 'year' | 'million' | 'billion' | 'billion-billion';

const YEAR_SCALES: [Scale, number][] = [
  ['billion-billion', 1e18],
  ['billion', 1e9],
  ['million', 1e6],
];

/** The universe is about 13.8 billion years old; a half-life over 100 billion years outlasts it by far. */
export const outlivesUniverse = (halfLife: HalfLife) => halfLife.unit === 'y' && halfLife.value > 1e11;

/** A half-life rounded to two significant figures, with a word for big numbers: 1.387 My → 1.4 million. */
export function halfLifeParts(halfLife: HalfLife): { amount: number; scale: Scale } {
  const rounded = Number(halfLife.value.toPrecision(2));
  if (halfLife.unit === 'd') return { amount: rounded, scale: 'day' };
  const [scale, size] = YEAR_SCALES.find(([, s]) => rounded >= s) ?? ['year', 1];
  return { amount: Number((rounded / size).toPrecision(2)), scale };
}

// ── The electrons ────────────────────────────────────────────────────────────────────────────────

/** How many electrons each shell takes, in filling order. Right for up to 20 electrons (calcium). */
const FILLING = [2, 8, 8, 2];

export function shells(electrons: number): number[] {
  const filled: number[] = [];
  let rest = electrons;
  for (const size of FILLING) {
    if (rest <= 0) break;
    filled.push(Math.min(size, rest));
    rest -= size;
  }
  return filled;
}

/** Places in a shell when it is the outer one: 2 in the first shell, 8 in the others. */
export const capacity = (shell: number) => (shell === 0 ? 2 : 8);

export function outerShell(electrons: number): { count: number; capacity: number; full: boolean } | null {
  const filled = shells(electrons);
  if (filled.length === 0) return null;
  const count = filled.at(-1)!;
  const places = capacity(filled.length - 1);
  return { count, capacity: places, full: count === places };
}

/** The order electrons take the places of a shell, spread out: one on each side first, then pairs. */
export function seatOrder(places: number): number[] {
  return places === 8 ? [0, 4, 2, 6, 1, 5, 3, 7] : Array.from({ length: places }, (_, i) => i);
}

/** Electrons in a full shell of a noble gas: helium, neon, argon (their atomic numbers too). */
const NOBLE = [2, 10, 18];

// ── Charge ───────────────────────────────────────────────────────────────────────────────────────

export const chargeOf = (atom: Atom) => atom.protons - atom.electrons;

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** Na⁺, O²⁻, Ca¹⁰⁺ (and just the symbol with no charge). */
export function ionNotation(symbol: string, charge: number): string {
  if (charge === 0) return symbol;
  const size = Math.abs(charge);
  const digits = size === 1 ? '' : [...String(size)].map((d) => SUPERSCRIPT[Number(d)]).join('');
  return `${symbol}${digits}${charge > 0 ? '⁺' : '⁻'}`;
}

export type ChargeKind =
  /** No protons and no electrons. */
  | 'none'
  /** Electrons with no protons to hold them. */
  | 'loose'
  | 'neutral'
  | 'common'
  | 'uncommon'
  /** A helium-4 nucleus with no electrons: an alpha particle. */
  | 'alpha'
  /** Every electron gone: only in very hot places, like inside the Sun. */
  | 'bare'
  /** More extra electrons than any atom holds. */
  | 'overloaded';

export function chargeKind(atom: Atom): ChargeKind {
  if (atom.protons === 0) return atom.electrons === 0 ? 'none' : 'loose';
  const charge = chargeOf(atom);
  if (charge === 0) return 'neutral';
  if (atom.electrons === 0 && atom.protons >= 2) return atom.protons === 2 && atom.neutrons === 2 ? 'alpha' : 'bare';
  // C⁴⁻ exists in a few crystals (carbides); nothing holds five extra electrons.
  if (charge < -4) return 'overloaded';
  return ELEMENTS[atom.protons - 1]!.ions.includes(charge) ? 'common' : 'uncommon';
}

// ── Everything at once ───────────────────────────────────────────────────────────────────────────

export interface View {
  z: number;
  n: number;
  e: number;
  /** Mass number: protons + neutrons. */
  a: number;
  element?: ElementData;
  nucleus: Nucleus;
  charge: number;
  chargeKind: ChargeKind;
  /** The symbol with its charge, e.g. Na⁺ (empty with no protons). */
  notation: string;
  shells: number[];
  outer: { count: number; capacity: number; full: boolean } | null;
  /** An ion with a noble gas's electrons: that gas's atomic number. */
  like?: number;
}

export function view(atom: Atom): View {
  const { protons: z, neutrons: n, electrons: e } = atom;
  const element = ELEMENTS[z - 1];
  const charge = chargeOf(atom);
  const outer = outerShell(e);
  return {
    z,
    n,
    e,
    a: z + n,
    element,
    nucleus: nucleus(z, n),
    charge,
    chargeKind: chargeKind(atom),
    notation: element ? ionNotation(element.symbol, charge) : '',
    shells: shells(e),
    outer,
    like: element && charge !== 0 && outer?.full && NOBLE.includes(e) ? e : undefined,
  };
}

// ── Quests ───────────────────────────────────────────────────────────────────────────────────────

export type QuestId =
  | 'hydrogen'
  | 'helium-4'
  | 'carbon-12'
  | 'nitrogen-14'
  | 'oxygen-16'
  | 'noble-gas'
  | 'calcium-40'
  | 'hydrogen-1'
  | 'deuterium'
  | 'tritium'
  | 'carbon-14'
  | 'falls-apart'
  | 'potassium-40'
  | 'sodium-ion'
  | 'chloride-ion'
  | 'magnesium-ion'
  | 'oxide-ion'
  | 'hydrogen-ion'
  | 'calcium-ion'
  | 'noble-shell';

export interface Quest {
  id: QuestId;
  met: (atom: Atom) => boolean;
}

const neutral = (atom: Atom) => atom.protons === atom.electrons;
/** This nucleus, with any electrons (isotope quests). */
const nuclide = (z: number, n: number) => (atom: Atom) => atom.protons === z && atom.neutrons === n;
/** This nucleus as a neutral atom (atom quests). */
const neutralAtom = (z: number, n: number) => (atom: Atom) => nuclide(z, n)(atom) && neutral(atom);
/** An ion of element z with this charge, on a nucleus that lasts (ion quests). */
const ion = (z: number, charge: number) => (atom: Atom) => atom.protons === z && chargeOf(atom) === charge && lasts(atom);

export const QUESTS: Record<QuestSet, readonly Quest[]> = {
  atoms: [
    { id: 'hydrogen', met: (atom) => atom.protons === 1 && neutral(atom) && lasts(atom) },
    { id: 'helium-4', met: neutralAtom(2, 2) },
    { id: 'carbon-12', met: neutralAtom(6, 6) },
    { id: 'nitrogen-14', met: neutralAtom(7, 7) },
    { id: 'oxygen-16', met: neutralAtom(8, 8) },
    { id: 'noble-gas', met: (atom) => NOBLE.includes(atom.protons) && neutral(atom) && lasts(atom) },
    { id: 'calcium-40', met: neutralAtom(20, 20) },
  ],
  isotopes: [
    { id: 'hydrogen-1', met: nuclide(1, 0) },
    { id: 'deuterium', met: nuclide(1, 1) },
    { id: 'tritium', met: nuclide(1, 2) },
    { id: 'carbon-12', met: nuclide(6, 6) },
    { id: 'carbon-14', met: nuclide(6, 8) },
    { id: 'falls-apart', met: (atom) => nucleus(atom.protons, atom.neutrons).kind === 'unbound' },
    { id: 'potassium-40', met: nuclide(19, 21) },
  ],
  ions: [
    { id: 'sodium-ion', met: ion(11, 1) },
    { id: 'chloride-ion', met: ion(17, -1) },
    { id: 'magnesium-ion', met: ion(12, 2) },
    { id: 'oxide-ion', met: ion(8, -2) },
    { id: 'hydrogen-ion', met: (atom) => nuclide(1, 0)(atom) && atom.electrons === 0 },
    { id: 'calcium-ion', met: ion(20, 2) },
    { id: 'noble-shell', met: (atom) => atom.protons > 0 && !neutral(atom) && NOBLE.includes(atom.electrons) && lasts(atom) },
  ],
};

export function questsMet(set: QuestSet, atom: Atom): QuestId[] {
  return QUESTS[set].filter((quest) => quest.met(atom)).map((quest) => quest.id);
}

// ── Drawing ──────────────────────────────────────────────────────────────────────────────────────

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Protons and neutrons packed into a round nucleus along a sunflower spiral, centred on (0, 0).
 * They alternate while both kinds last, and the extra ones of one kind go on the outside, so
 * adding a particle puts it at the edge and leaves the others where they were.
 */
export function nucleusLayout(protons: number, neutrons: number, spacing: number): { x: number; y: number; proton: boolean }[] {
  const total = protons + neutrons;
  const mixed = 2 * Math.min(protons, neutrons);
  const spiral = Array.from({ length: total }, (_, k) => {
    const r = spacing * Math.sqrt(k + 0.5);
    return { x: r * Math.cos(k * GOLDEN_ANGLE), y: r * Math.sin(k * GOLDEN_ANGLE), proton: k < mixed ? k % 2 === 0 : protons > neutrons };
  });
  const cx = spiral.reduce((sum, p) => sum + p.x, 0) / (total || 1);
  const cy = spiral.reduce((sum, p) => sum + p.y, 0) / (total || 1);
  return spiral.map((p) => ({ ...p, x: p.x - cx, y: p.y - cy }));
}
