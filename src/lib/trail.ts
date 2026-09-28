/**
 * The reading trail: how a reader got to the current article by clicking terms,
 * e.g. "Electric current › Voltage › Electron". Pure state logic; the DOM glue
 * lives in src/scripts/trail.ts and stores this state in sessionStorage.
 */
export interface TrailItem {
  id: string;
  lang: string;
  url: string;
  title: string;
}

export interface TrailState {
  items: TrailItem[];
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
  const fresh: TrailState = { items: [current], capped: false };
  if (!prev || prev.items.length === 0 || prev.items[0]!.lang !== current.lang) return fresh;

  // Back button, breadcrumb click or reload: cut the trail after the current page.
  const index = prev.items.findIndex((i) => i.id === current.id);
  if (index >= 0) {
    return { items: [...prev.items.slice(0, index), current], capped: prev.capped && index > 0 };
  }

  const last = prev.items[prev.items.length - 1]!;
  const arrivedViaTerm = intent !== null && now - intent.at <= INTENT_TTL_MS && intent.to === current.id && intent.from === last.id;
  if (!arrivedViaTerm) return fresh;

  const items = [...prev.items, current];
  let capped = prev.capped;
  while (items.length > TRAIL_MAX) {
    items.splice(1, 1);
    capped = true;
  }
  return { items, capped };
}

/** Only plain left clicks navigate in the same tab; anything else must not record an intent. */
export function shouldRecordIntent(e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
