/**
 * The reading trail: how a reader got to the current article by clicking terms,
 * e.g. "Electric current › Voltage › Electron". Pure state logic; the DOM glue
 * lives in src/scripts/trail.ts and stores this state in sessionStorage.
 *
 * The trail behaves like the browser's own history. `pos` marks the step the reader is on.
 * The steps after it are forward stops that the Forward button can return to, and only the
 * steps up to and including `pos` are shown.
 */
export interface TrailItem {
  id: string;
  lang: string;
  url: string;
  title: string;
}

export interface TrailState {
  items: TrailItem[];
  /** Index of the step the reader is on. The steps after it are forward stops. */
  pos: number;
  /** True when items between the origin and the rest were dropped to respect TRAIL_MAX. */
  capped: boolean;
}

/** Recorded when a reader clicks a term link on page `from` leading to page `to`. */
export interface TrailIntent {
  from: string;
  to: string;
  at: number;
}

export const TRAIL_MAX = 8;
export const INTENT_TTL_MS = 30_000;

export function nextTrail(prev: TrailState | null, intent: TrailIntent | null, current: TrailItem, now: number): TrailState {
  const fresh: TrailState = { items: [current], pos: 0, capped: false };
  if (!prev || prev.items.length === 0 || prev.items[0]!.lang !== current.lang) return fresh;

  const here = prev.items[prev.pos]!;
  const followed = intent !== null && now - intent.at <= INTENT_TTL_MS && intent.to === current.id && intent.from === here.id;
  const index = prev.items.findIndex((i) => i.id === current.id);

  // Back, Forward, a trail link or a reload: move to that step and keep the steps after it.
  // A term link to an earlier step, or to the very next one, moves the same way.
  if (index >= 0 && (!followed || index <= prev.pos + 1)) {
    return { items: prev.items.map((item, i) => (i === index ? current : item)), pos: index, capped: prev.capped };
  }
  if (!followed) return fresh;

  // A term followed from the current step: like the browser, forget the forward stops.
  const items = [...prev.items.slice(0, prev.pos + 1), current];
  let capped = prev.capped && prev.pos > 0;
  while (items.length > TRAIL_MAX) {
    items.splice(1, 1);
    capped = true;
  }
  return { items, pos: items.length - 1, capped };
}

/** The steps shown to the reader: from the origin up to and including the current step. */
export function shownSteps(state: TrailState): TrailItem[] {
  return state.items.slice(0, state.pos + 1);
}

/** Reads a stored trail. A trail stored before `pos` existed stands on its last step. */
export function parseTrail(raw: string | null): TrailState | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Omit<TrailState, 'pos'> & { pos?: number };
    return { items: value.items, pos: value.pos ?? value.items.length - 1, capped: value.capped };
  } catch {
    return null;
  }
}

/** Only plain left clicks navigate in the same tab; anything else must not record an intent. */
export function shouldRecordIntent(e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
