import type { LangCode } from '../../i18n/languages.ts';

export interface Strings {
  title: string;
  hint: string;
  outdoor: string;
  system: string;
  underfloor: string;
  radiators: string;
  cop: string;
  heatOut: string;
  electricity: string;
  air: string;
  heatPumpRow: (heat: string) => string;
  heaterRow: string;
  picture: (p: { outside: string; cop: string; heat: string }) => string;
}

export const strings: Record<LangCode, Strings> = {
  en: {
    title: 'How much heat from 1 kWh of electricity?',
    hint: 'Change the weather and the kind of heating. Yellow is electricity; blue is heat gathered from the outside air.',
    outdoor: 'Temperature outside',
    system: 'The house is heated by',
    underfloor: 'Underfloor heating (35 °C water)',
    radiators: 'Radiators (55 °C water)',
    cop: 'COP',
    heatOut: 'Heat from 1 kWh',
    electricity: '1 kWh of electricity',
    air: 'heat from the outside air',
    heatPumpRow: (heat) => `Heat pump: ${heat} of heat`,
    heaterRow: 'Electric heater: 1 kWh of heat',
    picture: ({ outside, cop, heat }) =>
      `At ${outside} outside, the heat pump delivers ${heat} of heat for every 1 kilowatt-hour of electricity (COP ${cop}); the rest is heat it collects from the outside air. An electric heater delivers just 1 kilowatt-hour.`,
  },
  sk: {
    title: 'Koľko tepla z 1 kWh elektriny?',
    hint: 'Meň počasie a druh kúrenia. Žltá je elektrina, modrá je teplo získané z vonkajšieho vzduchu.',
    outdoor: 'Teplota vonku',
    system: 'Dom vykuruje',
    underfloor: 'Podlahové kúrenie (voda 35 °C)',
    radiators: 'Radiátory (voda 55 °C)',
    cop: 'COP',
    heatOut: 'Teplo z 1 kWh',
    electricity: '1 kWh elektriny',
    air: 'teplo zo vzduchu vonku',
    heatPumpRow: (heat) => `Tepelné čerpadlo: ${heat} tepla`,
    heaterRow: 'Elektrický ohrievač: 1 kWh tepla',
    picture: ({ outside, cop, heat }) =>
      `Pri teplote ${outside} vonku dodá tepelné čerpadlo za každú 1 kilowatthodinu elektriny ${heat} tepla (COP ${cop}); zvyšok je teplo pozbierané z vonkajšieho vzduchu. Elektrický ohrievač dodá len 1 kilowatthodinu.`,
  },
};
