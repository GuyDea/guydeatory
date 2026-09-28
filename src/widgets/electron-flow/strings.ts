import type { LangCode } from '../../i18n/languages.ts';

export interface Strings {
  title: string;
  hint: string;
  switch: string;
  open: string;
  closed: string;
  voltage: string;
  current: string;
  bulb: string;
  bulbStates: [string, string, string, string];
  battery: string;
  toggleSwitch: string;
  picture: (p: { closed: boolean; volts: string; amps: string; bulb: string }) => string;
}

export const strings: Record<LangCode, Strings> = {
  en: {
    title: 'Make the bulb light up',
    hint: 'Close the switch, then change how hard the battery pushes. Watch the electrons and the bulb.',
    switch: 'Switch',
    open: 'Off (open)',
    closed: 'On (closed)',
    voltage: 'Battery push (voltage)',
    current: 'Current',
    bulb: 'Bulb',
    bulbStates: ['off', 'dim', 'bright', 'very bright'],
    battery: 'battery',
    toggleSwitch: 'Flip the switch',
    picture: ({ closed, volts, amps, bulb }) =>
      `A battery of ${volts}, a switch that is ${closed ? 'closed' : 'open'} and a bulb in one loop. Current: ${amps}. The bulb is ${bulb}.`,
  },
  sk: {
    title: 'Rozsvieť žiarovku',
    hint: 'Zapni vypínač a potom meň, ako silno batéria tlačí. Sleduj elektróny a žiarovku.',
    switch: 'Vypínač',
    open: 'Vypnutý (otvorený)',
    closed: 'Zapnutý (uzavretý)',
    voltage: 'Tlačenie batérie (napätie)',
    current: 'Prúd',
    bulb: 'Žiarovka',
    bulbStates: ['nesvieti', 'svieti slabo', 'svieti', 'svieti naplno'],
    battery: 'batéria',
    toggleSwitch: 'Prepni vypínač',
    picture: ({ closed, volts, amps, bulb }) =>
      `Batéria s napätím ${volts}, ${closed ? 'zapnutý' : 'vypnutý'} vypínač a žiarovka v jednom okruhu. Prúd: ${amps}. Žiarovka ${bulb}.`,
  },
};
