import type { LangCode } from '../../i18n/languages.ts';
import type { Mode } from './model.ts';

export type Part = 'compressor' | 'valve' | 'indoor' | 'outdoor';

export interface Strings {
  title: string;
  hint: string;
  season: string;
  heating: string;
  cooling: string;
  outdoorTemp: string;
  inside: string;
  outside: string;
  heat: string;
  heatMoved: string;
  heatDirection: Record<Mode, string>;
  parts: string;
  partNames: Record<Part, string>;
  describe: (part: Part, mode: Mode) => string;
  pickHint: string;
  picture: (p: { mode: Mode; outside: string; inside: string }) => string;
}

export const strings: Record<LangCode, Strings> = {
  en: {
    title: 'Inside a heat pump',
    hint: 'Switch between winter and summer, and click a part to find out what it does.',
    season: 'Season',
    heating: 'Winter: heating',
    cooling: 'Summer: cooling',
    outdoorTemp: 'Temperature outside',
    inside: 'inside',
    outside: 'outside',
    heat: 'heat',
    heatMoved: 'Heat is carried',
    heatDirection: { heating: 'from outside into the house', cooling: 'from the house to the outside' },
    parts: 'What does each part do?',
    partNames: { compressor: 'Compressor', valve: 'Expansion valve', indoor: 'Indoor unit', outdoor: 'Outdoor unit' },
    describe: (part, mode) =>
      ({
        compressor:
          'The compressor squeezes the refrigerant gas. Squeezing makes it hot, the way a bicycle pump warms up. This part uses most of the electricity.',
        valve:
          'The expansion valve is a tiny opening. The liquid refrigerant squirts through it, its pressure drops, and it becomes very cold — colder than the air it will take heat from.',
        indoor:
          mode === 'heating'
            ? 'Here the hot refrigerant gives its heat to the air in the room and turns back into a liquid (it condenses). The room warms up.'
            : 'Here the cold refrigerant boils and soaks up heat from the warm room air (it evaporates). The room cools down.',
        outdoor:
          mode === 'heating'
            ? 'Here the very cold refrigerant boils — even in winter air — and soaks up heat from it (it evaporates). A fan pushes outside air through.'
            : 'Here the hot refrigerant gives the heat it carried out of the house to the outside air, and turns back into a liquid (it condenses).',
      })[part],
    pickHint: 'Click a part of the machine, or use the buttons below.',
    picture: ({ mode, outside, inside }) =>
      mode === 'heating'
        ? `Winter, ${outside} outside. Refrigerant flows in a loop: it collects heat from the outside air and releases it inside the house, where it is ${inside}.`
        : `Summer, ${outside} outside. Refrigerant flows in a loop: it collects heat inside the house, where it is ${inside}, and releases it to the outside air.`,
  },
  sk: {
    title: 'Vo vnútri tepelného čerpadla',
    hint: 'Prepínaj medzi zimou a letom a kliknutím na časť zisti, čo robí.',
    season: 'Ročné obdobie',
    heating: 'Zima: kúrenie',
    cooling: 'Leto: chladenie',
    outdoorTemp: 'Teplota vonku',
    inside: 'vnútri',
    outside: 'vonku',
    heat: 'teplo',
    heatMoved: 'Teplo sa prenáša',
    heatDirection: { heating: 'zvonku do domu', cooling: 'z domu von' },
    parts: 'Čo robí každá časť?',
    partNames: { compressor: 'Kompresor', valve: 'Expanzný ventil', indoor: 'Vnútorná jednotka', outdoor: 'Vonkajšia jednotka' },
    describe: (part, mode) =>
      ({
        compressor:
          'Kompresor stláča plynné chladivo. Pri stláčaní sa chladivo zohreje – podobne ako sa zahreje pumpa na bicykel. Táto časť spotrebuje najviac elektriny.',
        valve:
          'Expanzný ventil je maličký otvor. Kvapalné chladivo ním prestrekne, jeho tlak klesne a veľmi sa ochladí – je chladnejšie ako vzduch, z ktorého bude brať teplo.',
        indoor:
          mode === 'heating'
            ? 'Tu horúce chladivo odovzdá teplo vzduchu v izbe a zmení sa späť na kvapalinu (skondenzuje). Izba sa otepľuje.'
            : 'Tu studené chladivo vrie a nasáva teplo z teplého vzduchu v izbe (vyparuje sa). Izba sa ochladzuje.',
        outdoor:
          mode === 'heating'
            ? 'Tu veľmi studené chladivo vrie – aj v zimnom vzduchu – a nasáva z neho teplo (vyparuje sa). Ventilátor cez jednotku ženie vonkajší vzduch.'
            : 'Tu horúce chladivo odovzdá vonkajšiemu vzduchu teplo, ktoré vynieslo z domu, a zmení sa späť na kvapalinu (skondenzuje).',
      })[part],
    pickHint: 'Klikni na časť stroja alebo použi tlačidlá nižšie.',
    picture: ({ mode, outside, inside }) =>
      mode === 'heating'
        ? `Zima, vonku ${outside}. Chladivo obieha v okruhu: zbiera teplo z vonkajšieho vzduchu a odovzdáva ho v dome, kde je ${inside}.`
        : `Leto, vonku ${outside}. Chladivo obieha v okruhu: zbiera teplo v dome, kde je ${inside}, a odovzdáva ho vonkajšiemu vzduchu.`,
  },
};
