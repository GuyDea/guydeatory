/**
 * Coefficient of performance of an air-source heat pump, estimated as a fraction of the ideal
 * (Carnot) value: COP_ideal = T_hot / (T_hot − T_cold), temperatures in kelvin. The refrigerant runs
 * about 5 °C hotter than the heating water and 5 °C colder than the outside air.
 */
export const EFFICIENCY = 0.5;
const KELVIN = 273.15;
const APPROACH = 5;

export function cop(outdoorC: number, flowC: number): number {
  const hot = flowC + APPROACH + KELVIN;
  const cold = outdoorC - APPROACH + KELVIN;
  const ideal = hot / (hot - cold);
  return Math.min(7, Math.max(1, EFFICIENCY * ideal));
}
