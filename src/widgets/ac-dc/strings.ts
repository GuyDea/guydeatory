import type { LangCode } from '../../i18n/languages.ts';

export interface Strings {
  title: string;
  hint: string;
  kind: string;
  dc: string;
  ac: string;
  speed: string;
  realLife: string;
  current: string;
  time: string;
  direction: [string, string, string];
  picture: (p: { ac: boolean }) => string;
}

export const strings: Record<LangCode, Strings> = {
  en: {
    title: 'One way, or back and forth?',
    hint: 'Watch the electrons in the wire and the graph of the current below them.',
    kind: 'Kind of current',
    dc: 'Direct (DC) — a battery',
    ac: 'Alternating (AC) — a socket',
    speed: 'Swings per second (slowed down)',
    realLife: 'In a real socket in Europe the current swings back and forth 50 times every second — much too fast to see.',
    current: 'current',
    time: 'time',
    direction: ['forward', 'stopped', 'backward'],
    picture: ({ ac }) =>
      ac
        ? 'Alternating current: the electrons swing back and forth, and the graph of the current goes up and down like a wave.'
        : 'Direct current: the electrons drift steadily one way, and the graph of the current is a flat line.',
  },
  sk: {
    title: 'Jedným smerom, alebo tam a späť?',
    hint: 'Sleduj elektróny v drôte a graf prúdu pod nimi.',
    kind: 'Druh prúdu',
    dc: 'Jednosmerný (DC) – batéria',
    ac: 'Striedavý (AC) – zásuvka',
    speed: 'Kmity za sekundu (spomalené)',
    realLife: 'V skutočnej zásuvke v Európe kmitá prúd tam a späť 50-krát za sekundu – oveľa rýchlejšie, než to dokážeš vidieť.',
    current: 'prúd',
    time: 'čas',
    direction: ['dopredu', 'stojí', 'dozadu'],
    picture: ({ ac }) =>
      ac
        ? 'Striedavý prúd: elektróny sa kývu tam a späť a graf prúdu stúpa a klesá ako vlna.'
        : 'Jednosmerný prúd: elektróny sa posúvajú stále jedným smerom a graf prúdu je rovná čiara.',
  },
};
