/** Logarithmic slider mapping: equal track distances for 1 → 10 → 100 → 1000. */
export function logPosition(value: number, min: number, max: number, steps: number): number {
  return (Math.log(value / min) / Math.log(max / min)) * steps;
}

export function logValue(position: number, min: number, max: number, steps: number, step: number): number {
  const raw = min * Math.pow(max / min, position / steps);
  const snapped = Math.round(raw / step) * step;
  return Math.min(max, Math.max(min, Number(snapped.toPrecision(12))));
}
