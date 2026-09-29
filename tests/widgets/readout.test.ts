import { parse } from 'node-html-parser';
import { render } from 'svelte/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Readout from '../../src/widgets/kit/Readout.svelte';
import Slider from '../../src/widgets/kit/Slider.svelte';
import { settle, SETTLE_MS } from '../../src/widgets/kit/settle.ts';

describe('settle (screen readers hear a value once it stops changing)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('waits between half a second and a second', () => {
    expect(SETTLE_MS).toBeGreaterThanOrEqual(500);
    expect(SETTLE_MS).toBeLessThanOrEqual(1000);
  });

  it('announces a dragged value once, at the end, and only the last value', () => {
    const announce = vi.fn();
    const settler = settle(announce);
    for (const amps of ['1.00 A', '1.50 A', '2.00 A', '2.50 A']) {
      settler.push(amps);
      vi.advanceTimersByTime(100); // a slider step every 100 ms
    }
    expect(announce).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SETTLE_MS - 101);
    expect(announce).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('2.50 A');
  });

  it('announces again after the next change has settled', () => {
    const announce = vi.fn();
    const settler = settle(announce);
    settler.push('1 W');
    vi.advanceTimersByTime(SETTLE_MS);
    settler.push('2 W');
    vi.advanceTimersByTime(SETTLE_MS);
    expect(announce.mock.calls).toEqual([['1 W'], ['2 W']]);
  });

  it('announces nothing once cancelled', () => {
    const announce = vi.fn();
    const settler = settle(announce);
    settler.push('3 A');
    settler.cancel();
    vi.advanceTimersByTime(SETTLE_MS * 2);
    expect(announce).not.toHaveBeenCalled();
  });
});

describe('Readout (server render)', () => {
  const html = parse(render(Readout, { props: { label: 'Current', value: '2.00 A' } }).body);

  it('shows the label and the value', () => {
    expect(html.querySelector('.label')?.text).toBe('Current');
    expect(html.querySelector('.value')?.text).toBe('2.00 A');
  });

  it('speaks through one polite live region that names what the number is', () => {
    const regions = html.querySelectorAll('[aria-live]');
    expect(regions).toHaveLength(1);
    expect(regions[0]!.getAttribute('aria-live')).toBe('polite');
    expect(regions[0]!.getAttribute('aria-atomic')).toBe('true');
    expect(regions[0]!.text).toBe('Current: 2.00 A');
  });

  it('hides the on-screen copy from screen readers, so nothing is read twice or at every step', () => {
    expect(html.querySelector('.label')?.getAttribute('aria-hidden')).toBe('true');
    expect(html.querySelector('.value')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Slider (server render)', () => {
  const html = parse(render(Slider, { props: { label: 'Push (voltage)', value: 12, min: 0, max: 240, unit: 'V', lang: 'en' } }).body);

  it('shows its value without a live region: the slider itself says the value while it is moved', () => {
    expect(html.querySelectorAll('output, [aria-live], [role="status"]')).toHaveLength(0);
    expect(html.querySelector('.value')?.getAttribute('aria-hidden')).toBe('true');
    expect(html.querySelector('input')?.getAttribute('aria-valuetext')).toBe('12 V');
  });
});
