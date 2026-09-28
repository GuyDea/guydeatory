/**
 * Boiling temperature from pressure using the Antoine equation.
 * Water (mmHg, °C): two constant sets, below and above 100 °C.
 * Propane / R-290 (bar, K): fitted to NIST saturation data at −60, −40 and −20 °C;
 * good to a few tenths of a degree across the widget's 0.3–3 bar range.
 */
const MMHG_PER_BAR = 750.062;

export function boilingPointWater(bar: number): number {
  const mmHg = bar * MMHG_PER_BAR;
  const [a, b, c] = mmHg <= 760 ? [8.07131, 1730.63, 233.426] : [8.14019, 1810.94, 244.485];
  return b / (a - Math.log10(mmHg)) - c;
}

export function boilingPointPropane(bar: number): number {
  const [a, b, c] = [3.9143, 796.7, -27.2];
  return b / (a - Math.log10(bar)) - c - 273.15;
}

export const PLACES = [
  { id: 'everest', bar: 0.33 },
  { id: 'gerlach', bar: 0.74 },
  { id: 'sea', bar: 1.013 },
  { id: 'cooker', bar: 2 },
] as const;
export type PlaceId = (typeof PLACES)[number]['id'];
