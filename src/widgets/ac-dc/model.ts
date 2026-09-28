/** Current over time (as a fraction of its maximum) and how far an electron has moved. */
export type Mode = 'dc' | 'ac';

export function current(t: number, mode: Mode, frequency: number): number {
  return mode === 'dc' ? 1 : Math.sin(2 * Math.PI * frequency * t);
}

/** Electron position along the wire (arbitrary units). AC: back and forth; DC: steadily onward. */
export function displacement(t: number, mode: Mode, frequency: number): number {
  if (mode === 'dc') return t;
  return (1 - Math.cos(2 * Math.PI * frequency * t)) / (2 * Math.PI * frequency);
}
