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

/** Seconds of history the graph shows. */
export const GRAPH_WINDOW = 4;

/** Swings per second the widget starts with: slowed down from 50 so eyes can follow. */
export const START_FREQUENCY = 0.5;

/**
 * The first moment after `window` seconds when AC current flows forward at full strength.
 * Forward peaks of sin(2π·f·t) come at t = (k + ¼) / f, for whole numbers k.
 */
export function firstPeakAfter(window: number, frequency: number): number {
  return (Math.ceil(window * frequency - 0.25) + 0.25) / frequency;
}

/**
 * Where the widget's clock starts, and restarts on "Start again": 4.5 s. The graph already has a
 * full window of history, and the current is at a forward peak, so the still first frame (all that
 * readers see with reduced motion or without JS) shows current flowing, with an arrow.
 */
export const START_TIME = firstPeakAfter(GRAPH_WINDOW, START_FREQUENCY);
