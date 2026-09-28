/**
 * Rough refrigerant temperatures (°C) around the loop. The refrigerant must be colder than the air it
 * takes heat from, and hotter than the air it gives heat to — that is the whole trick.
 */
export type Mode = 'heating' | 'cooling';

export interface CycleStates {
  /** Coil inside the house (condenser when heating, evaporator when cooling). */
  indoorCoil: number;
  /** Coil in the outdoor unit (evaporator when heating, condenser when cooling). */
  outdoorCoil: number;
  /** Hot gas leaving the compressor. */
  afterCompressor: number;
  /** Cold mixture leaving the expansion valve. */
  afterValve: number;
}

const EVAPORATOR_GAP = 8; // refrigerant evaporates this much colder than the air it cools
const CONDENSER_GAP = 15; // and condenses this much hotter than the air it heats
const COMPRESSOR_SUPERHEAT = 25; // gas leaves the compressor hotter than the condensing temperature

export function cycleStates(mode: Mode, outdoorC: number, indoorC: number): CycleStates {
  const evaporating = (mode === 'heating' ? outdoorC : indoorC) - EVAPORATOR_GAP;
  const condensing = (mode === 'heating' ? indoorC : outdoorC) + CONDENSER_GAP;
  return {
    indoorCoil: mode === 'heating' ? condensing : evaporating,
    outdoorCoil: mode === 'heating' ? evaporating : condensing,
    afterCompressor: condensing + COMPRESSOR_SUPERHEAT,
    afterValve: evaporating,
  };
}
