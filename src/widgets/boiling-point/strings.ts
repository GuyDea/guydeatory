import type { LangCode } from '../../i18n/languages.ts';
import type { PlaceId } from './model.ts';

export interface Strings {
  title: string;
  hint: string;
  pressure: string;
  water: string;
  propane: string;
  places: string;
  placeNames: Record<PlaceId, string>;
  shortNames: Record<PlaceId, string>;
  axisTemp: string;
  axisPressure: string;
  picture: (p: { pressure: string; water: string; propane: string }) => string;
}

export const strings: Record<LangCode, Strings> = {
  en: {
    title: 'When does water boil?',
    hint: 'Change the air pressure and see where water starts to boil. Lower pressure, lower boiling point.',
    pressure: 'Air pressure',
    water: 'Water boils at',
    propane: 'Propane (a refrigerant) boils at',
    places: 'Jump to a place:',
    placeNames: { everest: 'Top of Mount Everest', gerlach: 'Top of Gerlachovský štít', sea: 'At the seaside', cooker: 'Inside a pressure cooker' },
    shortNames: { everest: 'Everest', gerlach: 'Gerlach', sea: 'sea', cooker: 'cooker' },
    axisTemp: '°C',
    axisPressure: 'bar',
    picture: ({ pressure, water, propane }) =>
      `A graph of the boiling point of water against pressure. At ${pressure}, water boils at ${water} and propane at ${propane}.`,
  },
  sk: {
    title: 'Kedy voda vrie?',
    hint: 'Meň tlak vzduchu a sleduj, kedy voda začne vrieť. Nižší tlak znamená nižší bod varu.',
    pressure: 'Tlak vzduchu',
    water: 'Voda vrie pri',
    propane: 'Propán (chladivo) vrie pri',
    places: 'Skoč na miesto:',
    placeNames: { everest: 'Vrchol Mount Everestu', gerlach: 'Vrchol Gerlachovského štítu', sea: 'Pri mori', cooker: 'V tlakovom hrnci' },
    shortNames: { everest: 'Everest', gerlach: 'Gerlach', sea: 'more', cooker: 'hrniec' },
    axisTemp: '°C',
    axisPressure: 'bar',
    picture: ({ pressure, water, propane }) =>
      `Graf bodu varu vody podľa tlaku. Pri tlaku ${pressure} vrie voda pri ${water} a propán pri ${propane}.`,
  },
};
