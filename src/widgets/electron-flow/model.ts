/** A battery, a switch and a small bulb (4 Ω) in one loop. */
export const BULB_OHMS = 4;
export const MAX_VOLTS = 12;

export function flow({ volts, closed }: { volts: number; closed: boolean }): { amps: number; glow: number } {
  if (!closed || volts <= 0) return { amps: 0, glow: 0 };
  const amps = volts / BULB_OHMS;
  const watts = volts * amps;
  const maxWatts = (MAX_VOLTS * MAX_VOLTS) / BULB_OHMS;
  return { amps, glow: Math.min(1, watts / maxWatts) };
}
