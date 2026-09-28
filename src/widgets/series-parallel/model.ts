/** Identical bulbs (6 Ω) on a 6 V battery, joined one after another (series) or side by side (parallel). */
export const VOLTS = 6;
export const BULB_OHMS = 6;

export type Mode = 'series' | 'parallel';

export interface BulbState {
  present: boolean;
  amps: number;
  /** 1 = as bright as one bulb alone on the battery. */
  brightness: number;
}

export function circuit(mode: Mode, present: boolean[]): { totalAmps: number; bulbs: BulbState[] } {
  const single = (VOLTS * VOLTS) / BULB_OHMS;
  if (mode === 'series') {
    const broken = present.some((p) => !p) || present.length === 0;
    const amps = broken ? 0 : VOLTS / (BULB_OHMS * present.length);
    const brightness = (amps * amps * BULB_OHMS) / single;
    return { totalAmps: amps, bulbs: present.map((p) => ({ present: p, amps, brightness: p ? brightness : 0 })) };
  }
  const bulbs = present.map((p) => (p ? { present: p, amps: VOLTS / BULB_OHMS, brightness: 1 } : { present: p, amps: 0, brightness: 0 }));
  return { totalAmps: bulbs.reduce((sum, b) => sum + b.amps, 0), bulbs };
}
