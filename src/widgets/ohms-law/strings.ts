import type { LangCode } from '../../i18n/languages.ts';
import type { PresetId } from './model.ts';

export interface Strings {
  title: string;
  hint: string;
  /** Formula symbol for voltage: V in English, U in Slovak schools. */
  voltageSymbol: string;
  voltage: string;
  resistance: string;
  current: string;
  power: string;
  presets: string;
  presetNames: Record<PresetId, string>;
  push: string;
  narrow: string;
  flow: string;
  picture: (p: { amps: string; volts: string; ohms: string }) => string;
}

export const strings: Record<LangCode, Strings> = {
  en: {
    title: 'Ohm’s law playground',
    hint: 'Change the push and the resistance. The current is always the push divided by the resistance.',
    voltageSymbol: 'V',
    voltage: 'Push (voltage)',
    resistance: 'Resistance',
    current: 'Current',
    power: 'Power',
    presets: 'Try a real device:',
    presetNames: { torch: 'Torch bulb', phone: 'Phone charging', led: 'LED lamp', toaster: 'Toaster', kettle: 'Kettle' },
    push: 'push',
    narrow: 'resistance',
    flow: 'current',
    picture: ({ amps, volts, ohms }) => `Current equals voltage divided by resistance: ${amps} = ${volts} ÷ ${ohms}.`,
  },
  sk: {
    title: 'Ihrisko Ohmovho zákona',
    hint: 'Meň tlačenie a odpor. Prúd je vždy tlačenie vydelené odporom.',
    voltageSymbol: 'U',
    voltage: 'Tlačenie (napätie)',
    resistance: 'Odpor',
    current: 'Prúd',
    power: 'Výkon',
    presets: 'Vyskúšaj skutočný spotrebič:',
    presetNames: { torch: 'Žiarovka baterky', phone: 'Nabíjanie telefónu', led: 'LED lampa', toaster: 'Hriankovač', kettle: 'Rýchlovarná kanvica' },
    push: 'tlačenie',
    narrow: 'odpor',
    flow: 'prúd',
    picture: ({ amps, volts, ohms }) => `Prúd sa rovná napätiu vydelenému odporom: ${amps} = ${volts} ÷ ${ohms}.`,
  },
};
