import type { LangCode } from '../../i18n/languages.ts';

export interface Strings {
  title: string;
  hint: string;
  mode: string;
  series: string;
  parallel: string;
  unscrew: (n: number) => string;
  screwIn: (n: number) => string;
  total: string;
  battery: string;
  picture: (p: { series: boolean; lit: number; total: string }) => string;
}

export const strings: Record<LangCode, Strings> = {
  en: {
    title: 'One after another, or side by side?',
    hint: 'Switch between the two ways of connecting. Click a bulb to unscrew it and watch the others.',
    mode: 'How the bulbs are connected',
    series: 'In a row (series)',
    parallel: 'Side by side (parallel)',
    unscrew: (n) => `Unscrew bulb ${n}`,
    screwIn: (n) => `Screw in bulb ${n}`,
    total: 'Current from the battery',
    battery: 'battery',
    picture: ({ series, lit, total }) =>
      `Three bulb holders connected ${series ? 'one after another' : 'side by side'} to a 6 volt battery. ${lit} bulbs are lit. Current from the battery: ${total}.`,
  },
  sk: {
    title: 'Za sebou, alebo vedľa seba?',
    hint: 'Prepínaj medzi dvoma spôsobmi zapojenia. Kliknutím na žiarovku ju vyskrutkuješ – sleduj ostatné.',
    mode: 'Ako sú žiarovky zapojené',
    series: 'Za sebou (sériovo)',
    parallel: 'Vedľa seba (paralelne)',
    unscrew: (n) => `Vyskrutkuj žiarovku ${n}`,
    screwIn: (n) => `Zaskrutkuj žiarovku ${n}`,
    total: 'Prúd z batérie',
    battery: 'batéria',
    picture: ({ series, lit, total }) =>
      `Tri objímky na žiarovky zapojené ${series ? 'za sebou' : 'vedľa seba'} k batérii s napätím 6 voltov. Svieti žiaroviek: ${lit}. Prúd z batérie: ${total}.`,
  },
};
