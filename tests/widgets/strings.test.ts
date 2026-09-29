import { describe, expect, it } from 'vitest';
import { BULB_COUNTS } from '../../src/widgets/series-parallel/model.ts';
import { strings as seriesParallel } from '../../src/widgets/series-parallel/strings.ts';

describe('series and parallel strings', () => {
  const { en, sk } = seriesParallel;

  it('English agrees with the number of lit bulbs', () => {
    expect([0, 1, 2, 3].map((n) => en.lit(n))).toEqual(['No bulbs are lit', '1 bulb is lit', '2 bulbs are lit', '3 bulbs are lit']);
  });

  it('Slovak agrees too: one bulb, two to four bulbs, and none', () => {
    // Number words: a screen reader would read "2" as the masculine "dva", but žiarovka is feminine.
    expect([0, 1, 2, 3].map((n) => sk.lit(n))).toEqual([
      'Nesvieti žiadna žiarovka',
      'Svieti jedna žiarovka',
      'Svietia dve žiarovky',
      'Svietia tri žiarovky',
    ]);
  });

  it('names the choice of two or three bulbs', () => {
    expect(BULB_COUNTS.map((n) => en.bulbs(n))).toEqual(['Two bulbs', 'Three bulbs']);
    expect(BULB_COUNTS.map((n) => sk.bulbs(n))).toEqual(['Dve žiarovky', 'Tri žiarovky']);
  });

  it('describes the circuit with the number of bulb holders it has', () => {
    expect(en.picture({ series: true, holders: 2, lit: 1, total: '0.50 A' })).toBe(
      'Two bulb holders connected one after another to a 6 volt battery. 1 bulb is lit. Current from the battery: 0.50 A.',
    );
    expect(en.picture({ series: false, holders: 3, lit: 3, total: '3.00 A' })).toBe(
      'Three bulb holders connected side by side to a 6 volt battery. 3 bulbs are lit. Current from the battery: 3.00 A.',
    );
    expect(sk.picture({ series: true, holders: 2, lit: 0, total: '0,00 A' })).toBe(
      'Dve objímky na žiarovky zapojené za sebou k batérii s napätím 6 voltov. Nesvieti žiadna žiarovka. Prúd z batérie: 0,00 A.',
    );
    expect(sk.picture({ series: false, holders: 3, lit: 1, total: '1,00 A' })).toBe(
      'Tri objímky na žiarovky zapojené vedľa seba k batérii s napätím 6 voltov. Svieti jedna žiarovka. Prúd z batérie: 1,00 A.',
    );
  });
});
