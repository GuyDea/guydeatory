import type { LangCode } from '../../i18n/languages.ts';
import type { BulbCount } from './model.ts';

export interface Strings {
  title: string;
  hint: string;
  mode: string;
  series: string;
  parallel: string;
  /** Label of the choice between two and three bulbs. */
  count: string;
  /** One option of that choice: "Two bulbs". */
  bulbs: (n: BulbCount) => string;
  unscrew: (n: number) => string;
  screwIn: (n: number) => string;
  total: string;
  battery: string;
  /** How many bulbs are lit, as a sentence without its full stop: "1 bulb is lit". */
  lit: (n: number) => string;
  picture: (p: { series: boolean; holders: BulbCount; lit: number; total: string }) => string;
}

// Counts of bulbs and holders as words. In Slovak both nouns are feminine (dve žiarovky, dve
// objímky); a screen reader would read the digit 2 as the masculine "dva".
const EN_COUNT: Record<BulbCount, string> = { 2: 'Two', 3: 'Three' };
const SK_COUNT: Record<BulbCount, string> = { 2: 'Dve', 3: 'Tri' };

const litEn = (n: number) => (n === 0 ? 'No bulbs are lit' : n === 1 ? '1 bulb is lit' : `${n} bulbs are lit`);

// Slovak: 1 žiarovka svieti; 2, 3 and 4 žiarovky svietia; 0 and 5 or more žiaroviek svieti.
const SK_FEW: Record<number, string> = { 2: 'dve', 3: 'tri', 4: 'štyri' };
const litSk = (n: number) =>
  n === 0
    ? 'Nesvieti žiadna žiarovka'
    : n === 1
      ? 'Svieti jedna žiarovka'
      : SK_FEW[n]
        ? `Svietia ${SK_FEW[n]} žiarovky`
        : `Svieti ${n} žiaroviek`;

export const strings: Record<LangCode, Strings> = {
  en: {
    title: 'One after another, or side by side?',
    hint: 'Switch between the two ways of connecting. Click a bulb to unscrew it and watch the others.',
    mode: 'How the bulbs are connected',
    series: 'In a row (series)',
    parallel: 'Side by side (parallel)',
    count: 'How many bulbs',
    bulbs: (n) => `${EN_COUNT[n]} bulbs`,
    unscrew: (n) => `Unscrew bulb ${n}`,
    screwIn: (n) => `Screw in bulb ${n}`,
    total: 'Current from the battery',
    battery: 'battery',
    lit: litEn,
    picture: ({ series, holders, lit, total }) =>
      `${EN_COUNT[holders]} bulb holders connected ${series ? 'one after another' : 'side by side'} to a 6 volt battery. ${litEn(lit)}. Current from the battery: ${total}.`,
  },
  sk: {
    title: 'Za sebou, alebo vedľa seba?',
    hint: 'Prepínaj medzi dvoma spôsobmi zapojenia. Kliknutím na žiarovku ju vyskrutkuješ – sleduj ostatné.',
    mode: 'Ako sú žiarovky zapojené',
    series: 'Za sebou (sériovo)',
    parallel: 'Vedľa seba (paralelne)',
    count: 'Koľko žiaroviek',
    bulbs: (n) => `${SK_COUNT[n]} žiarovky`,
    unscrew: (n) => `Vyskrutkuj žiarovku ${n}`,
    screwIn: (n) => `Zaskrutkuj žiarovku ${n}`,
    total: 'Prúd z batérie',
    battery: 'batéria',
    lit: litSk,
    picture: ({ series, holders, lit, total }) =>
      `${SK_COUNT[holders]} objímky na žiarovky zapojené ${series ? 'za sebou' : 'vedľa seba'} k batérii s napätím 6 voltov. ${litSk(lit)}. Prúd z batérie: ${total}.`,
  },
};
