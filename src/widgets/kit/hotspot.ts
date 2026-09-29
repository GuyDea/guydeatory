/** Attributes that let a shape in a widget's drawing act as a button. */
export interface HotspotAttributes {
  role?: 'button';
  tabindex?: number;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  onclick?: () => void;
  onkeydown?: (event: KeyboardEvent) => void;
}

/**
 * Spread onto an SVG shape to make it clickable and keyboard-operable:
 * `<g {...hotspot(live.current, label, activate)}>`.
 *
 * Before hydration (`live` is false) it returns no attributes, so the shape is a plain part of the
 * picture: not focusable and not announced as a button, because without JS it would do nothing.
 */
export function hotspot(live: boolean, label: string, activate: () => void, pressed?: boolean): HotspotAttributes {
  if (!live) return {};
  return {
    role: 'button',
    tabindex: 0,
    'aria-label': label,
    'aria-pressed': pressed,
    onclick: activate,
    onkeydown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    },
  };
}
