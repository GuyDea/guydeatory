import { describe, expect, it, vi } from 'vitest';
import { formatNumber, formatQuantity } from '../../src/widgets/kit/format.ts';
import { hotspot } from '../../src/widgets/kit/hotspot.ts';

const NBSP = ' ';

describe('formatNumber', () => {
  it('uses the language decimal separator and fixed digits', () => {
    expect(formatNumber(1.5, 'sk', 1)).toBe('1,5');
    expect(formatNumber(1.5, 'en', 1)).toBe('1.5');
    expect(formatNumber(2, 'en', 2)).toBe('2.00');
    expect(formatNumber(2.345, 'en')).toBe('2');
  });

  it('groups thousands the way each language does', () => {
    expect(formatNumber(400000, 'en')).toBe('400,000');
    expect(formatNumber(400000, 'sk')).toBe(`400${NBSP}000`);
  });

  it('writes negative numbers with a real minus sign', () => {
    expect(formatNumber(-3.5, 'sk', 1)).toBe('−3,5');
    expect(formatNumber(-20, 'en')).toBe('−20');
  });

  it('never shows a negative zero', () => {
    expect(formatNumber(-0.04, 'en', 1)).toBe('0.0');
  });
});

describe('formatQuantity', () => {
  it('joins value and unit with a non-breaking space', () => {
    expect(formatQuantity(1.5, 'A', 'sk', 1)).toBe(`1,5${NBSP}A`);
    expect(formatQuantity(20, '°C', 'en')).toBe(`20${NBSP}°C`);
  });
});

describe('hotspot (a clickable shape in a drawing)', () => {
  it('is a plain part of the picture before hydration', () => {
    expect(hotspot(false, 'Flip the switch', () => {})).toEqual({});
  });

  it('acts as a button once the widget is live', () => {
    expect(hotspot(true, 'Flip the switch', () => {}, true)).toMatchObject({
      role: 'button',
      tabindex: 0,
      'aria-label': 'Flip the switch',
      'aria-pressed': true,
    });
  });

  it('activates on click, Enter and Space, and ignores other keys', () => {
    const activate = vi.fn();
    const spot = hotspot(true, 'Unscrew bulb 1', activate);
    const press = (key: string) => {
      const event = { key, preventDefault: vi.fn() };
      spot.onkeydown!(event as unknown as KeyboardEvent);
      return event;
    };
    spot.onclick!();
    expect(press('Enter').preventDefault).toHaveBeenCalled();
    expect(press(' ').preventDefault).toHaveBeenCalled();
    expect(press('Tab').preventDefault).not.toHaveBeenCalled();
    expect(activate).toHaveBeenCalledTimes(3);
  });
});
