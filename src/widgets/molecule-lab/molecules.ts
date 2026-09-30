/**
 * The molecules the lab knows by name, the quests, and what the board adds up to.
 *
 * Each entry is a recipe for `buildBoard` (atoms, then bonds: "-" single, "=" double, "#" triple,
 * ">" ionic from a metal), the usual way to write its formula, and whether it is polar, nonpolar or
 * ionic. Names and facts are in strings.ts, per language. Shapes are not stored: the model works
 * them out with VSEPR (model.ts, moleculeShape).
 *
 * Sources for the chemistry and for every one-line fact in strings.ts (checked 2026-09-30):
 * - Valence, bond orders, VSEPR and polarity: OpenStax Chemistry 2e, chapters 7.2–7.6,
 *   https://openstax.org/details/books/chemistry-2e ; https://en.wikipedia.org/wiki/VSEPR_theory
 * - Pauling electronegativities (model.ts):
 *   https://en.wikipedia.org/wiki/Electronegativities_of_the_elements_(data_page)
 * - Polar or not: measured dipole moments (NIST CCCBDB), https://cccbdb.nist.gov/diplistx.asp
 * - Angles: water 104.5°, https://en.wikipedia.org/wiki/Properties_of_water ; H₂S about 92°,
 *   https://cccbdb.nist.gov/expgeom2x.asp?casno=7783064&charge=0
 * - Air (78 % nitrogen, 21 % oxygen): https://en.wikipedia.org/wiki/Atmosphere_of_Earth ;
 *   N≡N bond strength: https://en.wikipedia.org/wiki/Nitrogen
 * - Hydrogen, fluorine, chlorine: https://en.wikipedia.org/wiki/Hydrogen ,
 *   https://en.wikipedia.org/wiki/Fluorine , https://en.wikipedia.org/wiki/Water_chlorination
 * - HF eats into glass: https://en.wikipedia.org/wiki/Hydrofluoric_acid
 * - Stomach acid (HCl): https://en.wikipedia.org/wiki/Gastric_acid
 * - Hydrogen peroxide (hair bleach, rocket propellant): https://en.wikipedia.org/wiki/Hydrogen_peroxide
 * - H₂S smell, and the loss of smell at high levels: https://www.osha.gov/hydrogen-sulfide/hazards
 * - Ammonia for fertiliser (about 70 %): https://en.wikipedia.org/wiki/Ammonia
 * - Methane in natural gas: https://en.wikipedia.org/wiki/Natural_gas
 * - Photosynthesis: https://en.wikipedia.org/wiki/Photosynthesis
 * - HCN boils at 26 °C; bitter almonds; many cannot smell it: https://en.wikipedia.org/wiki/Hydrogen_cyanide ,
 *   https://www.cdc.gov/niosh/npg/npgd0333.html
 * - Ethane cracked to ethene for plastics: https://en.wikipedia.org/wiki/Ethane
 * - Ethene ripens bananas and apples: https://en.wikipedia.org/wiki/Ethylene_as_a_plant_hormone
 * - Oxy-acetylene flame (3,300–3,500 °C): https://en.wikipedia.org/wiki/Oxy-fuel_welding_and_cutting
 * - Methanol and blindness: https://en.wikipedia.org/wiki/Methanol_toxicity
 * - Ethanol and dimethyl ether are isomers; DME as a spray propellant:
 *   https://en.wikipedia.org/wiki/Dimethyl_ether
 * - Formalin keeps specimens: https://www.nhm.ac.uk/discover/the-art-of-preserving-a-fish.html
 * - Carbon tetrachloride extinguishers, banned: https://en.wikipedia.org/wiki/Carbon_tetrachloride
 * - Chloroform anaesthesia (1847): https://en.wikipedia.org/wiki/Chloroform
 * - Chloromethane from tropical plants, fungi and fires: https://en.wikipedia.org/wiki/Chloromethane
 * - Salt's crystal, a 3D chessboard of ions: https://en.wikipedia.org/wiki/Sodium_chloride
 * - Sodium fluoride in toothpaste: https://en.wikipedia.org/wiki/Sodium_fluoride
 * - Sodium hydroxide (soap, drain cleaner, burns): https://en.wikipedia.org/wiki/Sodium_hydroxide
 * - Burning magnesium (a dazzling light, safety screens, and water that cannot put it out):
 *   https://edu.rsc.org/balanced-chemical-equations/the-change-in-mass-when-magnesium-burns/718.article ,
 *   https://en.wikipedia.org/wiki/Magnesium ("Source of light": it keeps burning in water, giving off hydrogen)
 * - Magnesium chloride (de-icing, tofu): https://en.wikipedia.org/wiki/Magnesium_chloride ,
 *   https://en.wikipedia.org/wiki/Nigari
 * - Magnesium fluoride anti-reflection coatings: https://en.wikipedia.org/wiki/Magnesium_fluoride
 * - Sodium oxide in window glass: https://en.wikipedia.org/wiki/Sodium_oxide
 * - Sodium sulfide removes hair from hides: https://en.wikipedia.org/wiki/Sodium_sulfide
 * - Magnesium pulls sulfur out of iron as MgS: https://en.wikipedia.org/wiki/Magnesium_sulfide
 * - Baking soda and vinegar: https://en.wikipedia.org/wiki/Sodium_bicarbonate
 * - Acetic acid in vinegar: https://en.wikipedia.org/wiki/Acetic_acid
 * - Slovak names: the glossary in docs/translation.md; R. Boča, Názvoslovie anorganických látok,
 *   https://anorganika.online/semester/boca_nazvoslovie.pdf ; https://sk.wikipedia.org/wiki/Chlórmetán
 */
import { buildBoard, clusters, countAtoms, elementOf, hillFormula, hillOrder, hint, isComplete, isMetal, structureKey } from './model.ts';
import type { Board, El, Hint } from './model.ts';
import type { Point } from './layout.ts';

export type Polarity = 'polar' | 'nonpolar' | 'ionic';

const LIST = [
  // Elements that come as pairs of atoms
  { id: 'h2', atoms: 'H H', bonds: '0-1', formula: 'H₂', polarity: 'nonpolar' },
  { id: 'o2', atoms: 'O O', bonds: '0=1', formula: 'O₂', polarity: 'nonpolar' },
  { id: 'n2', atoms: 'N N', bonds: '0#1', formula: 'N₂', polarity: 'nonpolar' },
  { id: 'f2', atoms: 'F F', bonds: '0-1', formula: 'F₂', polarity: 'nonpolar' },
  { id: 'cl2', atoms: 'Cl Cl', bonds: '0-1', formula: 'Cl₂', polarity: 'nonpolar' },
  // Small molecules with hydrogen
  { id: 'hf', atoms: 'H F', bonds: '0-1', formula: 'HF', polarity: 'polar' },
  { id: 'hcl', atoms: 'H Cl', bonds: '0-1', formula: 'HCl', polarity: 'polar' },
  { id: 'water', atoms: 'O H H', bonds: '0-1 0-2', formula: 'H₂O', polarity: 'polar' },
  { id: 'h2o2', atoms: 'O O H H', bonds: '0-1 0-2 1-3', formula: 'H₂O₂', polarity: 'polar' },
  { id: 'h2s', atoms: 'S H H', bonds: '0-1 0-2', formula: 'H₂S', polarity: 'polar' },
  { id: 'ammonia', atoms: 'N H H H', bonds: '0-1 0-2 0-3', formula: 'NH₃', polarity: 'polar' },
  { id: 'methane', atoms: 'C H H H H', bonds: '0-1 0-2 0-3 0-4', formula: 'CH₄', polarity: 'nonpolar' },
  { id: 'co2', atoms: 'C O O', bonds: '0=1 0=2', formula: 'CO₂', polarity: 'nonpolar' },
  { id: 'hcn', atoms: 'C H N', bonds: '0-1 0#2', formula: 'HCN', polarity: 'polar' },
  // Carbon compounds
  { id: 'ethane', atoms: 'C C H H H H H H', bonds: '0-1 0-2 0-3 0-4 1-5 1-6 1-7', formula: 'C₂H₆', polarity: 'nonpolar' },
  { id: 'ethene', atoms: 'C C H H H H', bonds: '0=1 0-2 0-3 1-4 1-5', formula: 'C₂H₄', polarity: 'nonpolar' },
  { id: 'ethyne', atoms: 'C C H H', bonds: '0#1 0-2 1-3', formula: 'C₂H₂', polarity: 'nonpolar' },
  { id: 'methanol', atoms: 'C O H H H H', bonds: '0-1 0-2 0-3 0-4 1-5', formula: 'CH₃OH', polarity: 'polar' },
  { id: 'ethanol', atoms: 'C C O H H H H H H', bonds: '0-1 1-2 0-3 0-4 0-5 1-6 1-7 2-8', formula: 'C₂H₅OH', polarity: 'polar' },
  { id: 'dme', atoms: 'C O C H H H H H H', bonds: '0-1 1-2 0-3 0-4 0-5 2-6 2-7 2-8', formula: 'CH₃OCH₃', polarity: 'polar' },
  { id: 'formaldehyde', atoms: 'C O H H', bonds: '0=1 0-2 0-3', formula: 'CH₂O', polarity: 'polar' },
  { id: 'aceticAcid', atoms: 'C C O O H H H H', bonds: '0-1 1=2 1-3 3-4 0-5 0-6 0-7', formula: 'CH₃COOH', polarity: 'polar' },
  { id: 'ccl4', atoms: 'C Cl Cl Cl Cl', bonds: '0-1 0-2 0-3 0-4', formula: 'CCl₄', polarity: 'nonpolar' },
  { id: 'chloroform', atoms: 'C H Cl Cl Cl', bonds: '0-1 0-2 0-3 0-4', formula: 'CHCl₃', polarity: 'polar' },
  { id: 'chloromethane', atoms: 'C Cl H H H', bonds: '0-1 0-2 0-3 0-4', formula: 'CH₃Cl', polarity: 'polar' },
  // Ionic compounds: a metal gives electrons away
  { id: 'nacl', atoms: 'Na Cl', bonds: '0>1', formula: 'NaCl', polarity: 'ionic' },
  { id: 'naf', atoms: 'Na F', bonds: '0>1', formula: 'NaF', polarity: 'ionic' },
  { id: 'naoh', atoms: 'Na O H', bonds: '1-2 0>1', formula: 'NaOH', polarity: 'ionic' },
  { id: 'bakingSoda', atoms: 'Na O C O O H', bonds: '2-1 2=3 2-4 4-5 0>1', formula: 'NaHCO₃', polarity: 'ionic' },
  { id: 'na2o', atoms: 'Na Na O', bonds: '0>2 1>2', formula: 'Na₂O', polarity: 'ionic' },
  { id: 'na2s', atoms: 'Na Na S', bonds: '0>2 1>2', formula: 'Na₂S', polarity: 'ionic' },
  { id: 'mgo', atoms: 'Mg O', bonds: '0>1', formula: 'MgO', polarity: 'ionic' },
  { id: 'mgs', atoms: 'Mg S', bonds: '0>1', formula: 'MgS', polarity: 'ionic' },
  { id: 'mgcl2', atoms: 'Mg Cl Cl', bonds: '0>1 0>2', formula: 'MgCl₂', polarity: 'ionic' },
  { id: 'mgf2', atoms: 'Mg F F', bonds: '0>1 0>2', formula: 'MgF₂', polarity: 'ionic' },
] as const;

export type MoleculeId = (typeof LIST)[number]['id'];

export interface Molecule {
  id: MoleculeId;
  atoms: string;
  bonds: string;
  formula: string;
  polarity: Polarity;
}

export const MOLECULES: readonly Molecule[] = LIST;

/** The quests, in order: each is done once its molecule has been completed on the board. */
export const QUESTS = ['h2', 'water', 'co2', 'methane', 'ammonia', 'n2', 'nacl', 'naoh'] as const satisfies readonly MoleculeId[];
export type QuestId = (typeof QUESTS)[number];

const BY_KEY = new Map(
  MOLECULES.map((molecule) => {
    const board = buildBoard(molecule.atoms, molecule.bonds);
    return [structureKey(board, board.atoms.map((atom) => atom.id)), molecule] as const;
  }),
);

/** The named molecule a finished group of atoms is, told apart by structure, not formula alone. */
export function recognise(board: Board, ids: number[]): Molecule | null {
  if (!isComplete(board, ids)) return null;
  return BY_KEY.get(structureKey(board, ids)) ?? null;
}

/** The formula to show: the usual one for a named molecule, else Hill order (metals first, as in NaH). */
export function displayFormula(board: Board, ids: number[]): string {
  const named = recognise(board, ids);
  if (named) return named.formula;
  const counts = countAtoms(board, ids);
  const metals = (Object.keys(counts) as El[]).filter(isMetal).sort();
  const rest = { ...counts };
  for (const metal of metals) delete rest[metal];
  return hillFormula(Object.fromEntries(metals.map((metal) => [metal, counts[metal]]))) + hillFormula(rest);
}

export interface ReportItem {
  ids: number[];
  molecule: Molecule | null;
  formula: string;
  complete: boolean;
  hint: Hint | null;
}

/** What is on the board: each group of joined atoms, and the lone atoms counted by element (Hill order). */
export interface Report {
  items: ReportItem[];
  free: [El, number][];
}

export function report(board: Board): Report {
  const items: ReportItem[] = [];
  const free: Partial<Record<El, number>> = {};
  for (const ids of clusters(board)) {
    if (ids.length === 1) {
      const el = elementOf(board, ids[0]!);
      free[el] = (free[el] ?? 0) + 1;
      continue;
    }
    items.push({ ids, molecule: recognise(board, ids), formula: displayFormula(board, ids), complete: isComplete(board, ids), hint: hint(board, ids) });
  }
  return { items, free: hillOrder(Object.keys(free) as El[]).map((el) => [el, free[el]!]) };
}

/**
 * The first frame: a finished water molecule on the left, and on the right a carbon with four
 * hydrogens waiting around it, ready to become methane.
 */
export const INITIAL: { board: Board; seeds: Record<number, Point> } = {
  board: buildBoard('O H H C H H H H', '0-1 0-2'),
  seeds: {
    0: { x: 92, y: 112 },
    1: { x: 160, y: 164.65 },
    2: { x: 24, y: 164.65 },
    3: { x: 272, y: 146 },
    4: { x: 210, y: 84 },
    5: { x: 334, y: 84 },
    6: { x: 210, y: 208 },
    7: { x: 334, y: 208 },
  },
};
