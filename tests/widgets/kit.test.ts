import { describe, expect, it } from 'vitest';
import { formatNumber, formatQuantity } from '../../src/widgets/kit/format.ts';

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
