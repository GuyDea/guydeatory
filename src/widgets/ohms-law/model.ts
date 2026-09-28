/** Ohm's law: I = V / R, and the power P = V · I. */
export function solve({ volts, ohms }: { volts: number; ohms: number }): { amps: number; watts: number } {
  if (volts <= 0) return { amps: 0, watts: 0 };
  const amps = volts / ohms;
  return { amps, watts: volts * amps };
}

/** Everyday situations modelled as a simple resistance (a simplification for chargers and LEDs). */
export const PRESETS = [
  { id: 'torch', volts: 3, ohms: 10 },
  { id: 'phone', volts: 5, ohms: 2.5 },
  { id: 'led', volts: 230, ohms: 5290 },
  { id: 'toaster', volts: 230, ohms: 53 },
  { id: 'kettle', volts: 230, ohms: 26.5 },
] as const;
export type PresetId = (typeof PRESETS)[number]['id'];

/** Decimals used to show a resistance: whole ohms stay whole, halves show one decimal. */
export function ohmsDigits(ohms: number): number {
  return Number.isInteger(ohms) ? 0 : 1;
}
