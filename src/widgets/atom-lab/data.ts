/**
 * Elements 1–20 and every nuclide up to calcium that is stable or has a half-life of at least one day.
 *
 * Sources (checked 2026-09-30):
 * - Stability, half-lives and isotopic abundances: NUBASE2020. F. G. Kondev, M. Wang, W. J. Huang,
 *   S. Naimi and G. Audi, "The NUBASE2020 evaluation of nuclear physics properties", Chinese
 *   Physics C 45, 030001 (2021). Table nubase_4.mas20.txt from the IAEA Atomic Mass Data Center,
 *   https://www-nds.iaea.org/amdc/
 * - Cross-checked with the IAEA LiveChart of Nuclides (ENSDF ground states),
 *   https://nds.iaea.org/relnsd/vcharthtml/VChartHTML.html. It lists the same 64 nuclides, 45 of them
 *   stable. It differs only for Be-10 (older 1.51 My) and Ca-48 (2.9·10¹⁹ y); NUBASE2020 is used here.
 * - The longest-lived nuclides left out all last less than a day: K-43 (22.3 h), Mg-28 (20.9 h),
 *   Na-24 (15.0 h), K-42 (12.4 h). So every other combination "falls apart within a day".
 * - Ar-36, Ca-40 and Ca-46 are "observationally stable": a double decay is predicted but has never been
 *   seen. NUBASE2020 lists them as stable, and so do we.
 * - Common ion charges: OpenStax Chemistry 2e, section 2.6, figure 2.29 ("common ion charges"),
 *   https://openstax.org/books/chemistry-2e/pages/2-6-ionic-and-molecular-compounds. That figure also
 *   shows C⁴⁻ (in carbides such as Al₄C₃); it is left out, because carbon almost always shares its
 *   electrons instead. Hydrogen is added: H⁺ in acids and H⁻ (hydride) in compounds such as NaH.
 */

export interface HalfLife {
  value: number;
  /** Days or years, as NUBASE2020 gives it (ky, My, Gy and Ey are converted to years). */
  unit: 'd' | 'y';
}

/** What a neutral atom tends to do with its outer electrons, to fill its outer shell. */
export type Tendency = { kind: 'give' | 'share' | 'take'; count: number } | { kind: 'full' };

export interface ElementData {
  symbol: string;
  /** Mass number of the most common isotope (NUBASE2020 abundance). */
  common: number;
  /** Column in the compact table: groups 1 and 2, then 13–18 as columns 3–8. */
  column: number;
  period: number;
  tendency: Tendency;
  /** Charges of the ions it commonly forms. */
  ions: number[];
}

const give = (count: number): Tendency => ({ kind: 'give', count });
const share = (count: number): Tendency => ({ kind: 'share', count });
const take = (count: number): Tendency => ({ kind: 'take', count });
const full: Tendency = { kind: 'full' };

/** Elements 1–20: ELEMENTS[z − 1]. */
export const ELEMENTS: readonly ElementData[] = [
  { symbol: 'H', common: 1, column: 1, period: 1, tendency: share(1), ions: [1, -1] },
  { symbol: 'He', common: 4, column: 8, period: 1, tendency: full, ions: [] },
  { symbol: 'Li', common: 7, column: 1, period: 2, tendency: give(1), ions: [1] },
  { symbol: 'Be', common: 9, column: 2, period: 2, tendency: give(2), ions: [2] },
  { symbol: 'B', common: 11, column: 3, period: 2, tendency: share(3), ions: [] },
  { symbol: 'C', common: 12, column: 4, period: 2, tendency: share(4), ions: [] },
  { symbol: 'N', common: 14, column: 5, period: 2, tendency: take(3), ions: [-3] },
  { symbol: 'O', common: 16, column: 6, period: 2, tendency: take(2), ions: [-2] },
  { symbol: 'F', common: 19, column: 7, period: 2, tendency: take(1), ions: [-1] },
  { symbol: 'Ne', common: 20, column: 8, period: 2, tendency: full, ions: [] },
  { symbol: 'Na', common: 23, column: 1, period: 3, tendency: give(1), ions: [1] },
  { symbol: 'Mg', common: 24, column: 2, period: 3, tendency: give(2), ions: [2] },
  { symbol: 'Al', common: 27, column: 3, period: 3, tendency: give(3), ions: [3] },
  { symbol: 'Si', common: 28, column: 4, period: 3, tendency: share(4), ions: [] },
  { symbol: 'P', common: 31, column: 5, period: 3, tendency: take(3), ions: [-3] },
  { symbol: 'S', common: 32, column: 6, period: 3, tendency: take(2), ions: [-2] },
  { symbol: 'Cl', common: 35, column: 7, period: 3, tendency: take(1), ions: [-1] },
  { symbol: 'Ar', common: 40, column: 8, period: 3, tendency: full, ions: [] },
  { symbol: 'K', common: 39, column: 1, period: 4, tendency: give(1), ions: [1] },
  { symbol: 'Ca', common: 40, column: 2, period: 4, tendency: give(2), ions: [2] },
];

/** Mass numbers of the stable nuclides, by atomic number (NUBASE2020 "stbl"). */
export const STABLE: Record<number, number[]> = {
  1: [1, 2],
  2: [3, 4],
  3: [6, 7],
  4: [9],
  5: [10, 11],
  6: [12, 13],
  7: [14, 15],
  8: [16, 17, 18],
  9: [19],
  10: [20, 21, 22],
  11: [23],
  12: [24, 25, 26],
  13: [27],
  14: [28, 29, 30],
  15: [31],
  16: [32, 33, 34, 36],
  17: [35, 37],
  18: [36, 38, 40],
  19: [39, 41],
  20: [40, 42, 43, 44, 46],
};

const days = (value: number): HalfLife => ({ value, unit: 'd' });
const years = (value: number): HalfLife => ({ value, unit: 'y' });

/** Radioactive nuclides with a half-life of at least one day, by atomic number and mass number (NUBASE2020). */
export const RADIOACTIVE: Record<number, Record<number, HalfLife>> = {
  1: { 3: years(12.32) }, // 12.32 y
  4: { 7: days(53.22), 10: years(1.387e6) }, // 53.22 d; 1.387 My
  6: { 14: years(5700) }, // 5.70 ky
  11: { 22: years(2.6019) }, // 2.6019 y
  13: { 26: years(7.17e5) }, // 717 ky
  14: { 32: years(157) }, // 157 y
  15: { 32: days(14.269), 33: days(25.35) }, // 14.269 d; 25.35 d
  16: { 35: days(87.37) }, // 87.37 d
  17: { 36: years(3.013e5) }, // 301.3 ky
  18: { 37: days(35.011), 39: years(268), 42: years(32.9) }, // 35.011 d; 268 y; 32.9 y
  19: { 40: years(1.248e9) }, // 1.248 Gy
  20: { 41: years(9.94e4), 45: days(162.61), 47: days(4.536), 48: years(5.6e19) }, // 99.4 ky; 162.61 d; 4.536 d; 56 Ey (double beta decay)
};

/** A free neutron's half-life in seconds (NUBASE2020: 609.8 s, about 10 minutes). */
export const NEUTRON_HALF_LIFE_S = 609.8;
