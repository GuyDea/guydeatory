import { describe, expect, it } from 'vitest';
import { foldDiacritics } from '../src/lib/text.ts';

describe('foldDiacritics', () => {
  it('strips Slovak diacritics in both cases', () => {
    expect(foldDiacritics('Elektrický prúd')).toBe('Elektricky prud');
    expect(foldDiacritics('ľščťžýáíéúäôňĺŕď ĽŠČŤŽÝÁÍÉÚÄÔŇĹŔĎ')).toBe('lsctzyaieuaonlrd LSCTZYAIEUAONLRD');
  });

  it('leaves plain ASCII untouched', () => {
    expect(foldDiacritics('Heat pump 101')).toBe('Heat pump 101');
  });
});
