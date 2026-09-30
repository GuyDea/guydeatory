import type { LangCode } from '../../i18n/languages.ts';
import { formatNumber } from '../kit/format.ts';
import type { HalfLife, Tendency } from './data.ts';
import { halfLifeParts, ionNotation, outlivesUniverse } from './model.ts';
import type { Particle, QuestId, QuestSet, View } from './model.ts';

export interface Line {
  value: string;
  detail: string;
}

export interface Readouts {
  element: Line;
  isotope: Line;
  charge: Line;
  shell: Line;
}

export interface Strings {
  title: string;
  hints: Record<QuestSet, string>;
  particles: Record<Particle, string>;
  add: Record<Particle, string>;
  remove: Record<Particle, string>;
  labels: Record<keyof Readouts, string>;
  /** Element names, capitalised: elements[z − 1]. */
  elements: readonly string[];
  footnote: string;
  pick: string;
  built: (count: number, total: number) => string;
  /** Said after an element's name in the table once it has been built. */
  builtMark: string;
  questsTitle: string;
  progress: (done: number, total: number) => string;
  quests: Record<QuestId, string>;
  /** Read out on each quest's tick: done or not yet. */
  questState: { done: string; open: string };
  /** The short celebration. */
  questDone: (quest: string) => string;
  /** What screen readers hear when a quest is done. */
  announceQuest: (quest: string, done: number, total: number) => string;
  allDone: string;
  halfLife: (halfLife: HalfLife) => string;
  /** The name at the top of the drawing: Carbon-12, Na⁺ ion, Nothing yet. */
  name: (v: View) => string;
  /** The line at the bottom of the drawing: Stable nucleus, … */
  status: (v: View) => string;
  readouts: (v: View) => Readouts;
  /** The drawing, described in words. */
  picture: (v: View) => string;
}

const MINUS = '−';
const signed = (q: number) => (q > 0 ? `+${q}` : q < 0 ? `${MINUS}${-q}` : '0');
const ions = (v: View, or: string) => v.element!.ions.map((q) => ionNotation(v.element!.symbol, q)).join(` ${or} `);

// ── English ─────────────────────────────────────────────────────────────────────────────────────

const EN_ELEMENTS = [
  'Hydrogen', 'Helium', 'Lithium', 'Beryllium', 'Boron', 'Carbon', 'Nitrogen', 'Oxygen', 'Fluorine', 'Neon',
  'Sodium', 'Magnesium', 'Aluminium', 'Silicon', 'Phosphorus', 'Sulfur', 'Chlorine', 'Argon', 'Potassium', 'Calcium',
];

const enCount = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const enName = (z: number) => EN_ELEMENTS[z - 1]!.toLowerCase();
const enNuclide = (v: View) => (v.z === 1 && v.a === 2 ? 'Hydrogen-2 (deuterium)' : v.z === 1 && v.a === 3 ? 'Hydrogen-3 (tritium)' : `${EN_ELEMENTS[v.z - 1]}-${v.a}`);
/** The nucleus in the Isotope readout, after the nuclide's name. */
const EN_NUCLEUS = { stable: 'stable nucleus', radioactive: 'radioactive nucleus', 'short-lived': 'radioactive nucleus, falls apart within a day' };
/** The line at the bottom of the drawing. */
const EN_STATUS = { stable: 'Stable nucleus', radioactive: 'Radioactive nucleus', 'short-lived': 'Radioactive: falls apart within a day' };

function enTendency(tendency: Tendency): string {
  if (tendency.kind === 'full') return 'Full: hardly ever reacts';
  const electrons = enCount(tendency.count, 'electron', 'electrons');
  if (tendency.kind === 'give') return `Gives away ${electrons}`;
  if (tendency.kind === 'share') return `Shares ${electrons}`;
  return `Needs ${tendency.count} more ${tendency.count === 1 ? 'electron' : 'electrons'}`;
}

function enStatus(v: View): string {
  if (v.z > 0) return EN_STATUS[v.nucleus.kind as keyof typeof EN_STATUS];
  if (v.e > 0) return 'Nothing holds them together';
  return { none: 'Add a proton to start', neutron: 'Decays in about 10 minutes', neutrons: 'They don’t stick together' }[
    v.nucleus.kind as 'none' | 'neutron' | 'neutrons'
  ];
}

function enHeading(v: View): string {
  if (v.z > 0) return v.charge === 0 ? (v.a === 2 && v.z === 1 ? 'Deuterium' : v.a === 3 && v.z === 1 ? 'Tritium' : enNuclide(v)) : `${v.notation} ion`;
  if (v.e === 0) return { none: 'Nothing yet', neutron: 'A lone neutron', neutrons: 'Only neutrons' }[v.nucleus.kind as 'none' | 'neutron' | 'neutrons'];
  return v.n === 0 ? 'Only electrons' : 'No atom yet';
}

function enReadouts(v: View): Readouts {
  const name = v.z > 0 ? enName(v.z) : '';
  const element: Line =
    v.z > 0
      ? { value: `${EN_ELEMENTS[v.z - 1]} (${v.element!.symbol})`, detail: `Atomic number ${v.z}: every ${name} atom has ${enCount(v.z, 'proton', 'protons')}.` }
      : { value: 'Nothing yet', detail: 'The number of protons decides the element.' };

  let isotope: Line;
  if (v.z === 0) {
    isotope = {
      none: { value: 'No nucleus', detail: 'Add protons and neutrons to build one.' },
      neutron: { value: 'A lone neutron', detail: 'A lone neutron decays in about 10 minutes (its half-life).' },
      neutrons: { value: 'Only neutrons', detail: 'Neutrons on their own don’t stick together.' },
    }[v.nucleus.kind as 'none' | 'neutron' | 'neutrons'];
  } else {
    const counts = `${enCount(v.z, 'proton', 'protons')} + ${enCount(v.n, 'neutron', 'neutrons')} = ${enCount(v.a, 'particle', 'particles')} in the nucleus.`;
    const nucleus = v.nucleus;
    const why =
      nucleus.kind === 'stable'
        ? 'It does not change by itself.'
        : nucleus.kind === 'radioactive'
          ? `Half of such nuclei turn into another element in ${en.halfLife(nucleus.halfLife)} (its half-life).${
              outlivesUniverse(nucleus.halfLife) ? ' That is far longer than the universe has existed.' : ''
            }`
          : `Half of such nuclei fall apart in less than a day. ${
              {
                'few-neutrons': 'Neutrons help hold a nucleus together, and this one has too few.',
                'many-neutrons': 'It has too many neutrons for so few protons.',
                gap: 'This mix of protons and neutrons does not hold together for long.',
              }[nucleus.kind === 'short-lived' ? nucleus.why : 'gap']
            }`;
    isotope = { value: `${enNuclide(v)}: ${EN_NUCLEUS[nucleus.kind as keyof typeof EN_NUCLEUS]}`, detail: `${counts} ${why}` };
  }

  const q = v.charge;
  let charge: Line;
  switch (v.chargeKind) {
    case 'none':
      charge = { value: 'No charge', detail: v.n > 0 ? 'Neutrons have no charge.' : 'There is nothing here yet.' };
      break;
    case 'loose':
      charge = { value: `Charge ${signed(q)}`, detail: 'Loose electrons: with no protons, nothing holds them.' };
      break;
    case 'neutral':
      charge = { value: 'Neutral atom', detail: `${enCount(v.z, 'proton', 'protons')} (+) and ${enCount(v.e, 'electron', 'electrons')} (−) cancel out.` };
      break;
    default: {
      const why = {
        common: v.z === 1 && v.n === 0 ? 'A common ion: a bare proton.' : 'A common ion.',
        uncommon: `Not a common ion: ${
          v.element!.ions.length > 0
            ? `${name} usually forms ${ions(v, 'or')}`
            : v.element!.tendency.kind === 'full'
              ? `${name} hardly ever forms ions`
              : `${name} usually shares electrons instead`
        }.`,
        alpha: 'This is an alpha particle: alpha radiation is made of these.',
        bare: 'All its electrons are gone. That happens in extremely hot places, like deep inside stars.',
        overloaded: 'That is too many extra electrons: they push each other away, and no atom can hold them.',
      }[v.chargeKind];
      const difference = `${enCount(Math.abs(q), 'electron', 'electrons')} ${q > 0 ? 'fewer' : 'more'} than protons.`;
      charge = { value: `${v.notation} ion, charge ${signed(q)}`, detail: `${difference} ${why}` };
    }
  }

  let shell: Line;
  if (v.z === 0) {
    shell = v.e > 0 ? { value: 'No shells', detail: 'Electrons need protons to hold them in shells.' } : { value: 'No electrons', detail: 'Electrons fill shells around a nucleus.' };
  } else if (!v.outer) {
    shell = { value: 'No electrons', detail: 'Only the bare nucleus is left.' };
  } else {
    const tendency = v.charge === 0 ? enTendency(v.element!.tendency) : v.like ? `Full, like ${enName(v.like)}` : 'Not full';
    shell = { value: `${v.outer.count} of ${v.outer.capacity}`, detail: `${tendency}. Shells from the inside: ${v.shells.join(', ')}.` };
  }
  return { element, isotope, charge, shell };
}

function enPicture(v: View): string {
  if (v.z === 0) {
    const loose = [v.n > 1 || (v.n === 1 && v.e > 0) ? enCount(v.n, 'neutron', 'neutrons') : '', v.e > 0 ? enCount(v.e, 'electron', 'electrons') : '']
      .filter(Boolean)
      .join(' and ');
    return `${enHeading(v)}${loose ? `: ${loose}` : ''}. ${enStatus(v)}.`;
  }
  const state = { stable: 'stable', radioactive: 'radioactive', 'short-lived': 'radioactive, falls apart within a day' }[
    v.nucleus.kind as 'stable' | 'radioactive' | 'short-lived'
  ];
  const electrons =
    v.e === 0 ? 'No electrons' : `${enCount(v.e, 'electron', 'electrons')} in ${enCount(v.shells.length, 'shell', 'shells')}: ${v.shells.join(', ')}`;
  return `${enHeading(v)}. Nucleus: ${enCount(v.z, 'proton', 'protons')} and ${enCount(v.n, 'neutron', 'neutrons')}, ${state}. ${electrons}.`;
}

const en: Strings = {
  title: 'Build an atom',
  hints: {
    atoms: 'Add protons, neutrons and electrons, or pick an element from the table.',
    isotopes: 'Keep the protons and change the neutrons: which nuclei hold together?',
    ions: 'Add or take away electrons to turn an atom into an ion.',
  },
  particles: { protons: 'Protons', neutrons: 'Neutrons', electrons: 'Electrons' },
  add: { protons: 'Add a proton', neutrons: 'Add a neutron', electrons: 'Add an electron' },
  remove: { protons: 'Remove a proton', neutrons: 'Remove a neutron', electrons: 'Remove an electron' },
  labels: { element: 'Element', isotope: 'Isotope', charge: 'Charge', shell: 'Outer shell' },
  elements: EN_ELEMENTS,
  footnote: 'Not to scale. Real electrons move in fuzzy clouds, not on rings.',
  pick: 'Pick an element',
  built: (count, total) => `Elements built: ${count} of ${total}`,
  builtMark: 'built',
  questsTitle: 'Quests',
  progress: (done, total) => `${done} of ${total} done`,
  quests: {
    hydrogen: 'Hydrogen, the simplest atom',
    'helium-4': 'Helium-4',
    'carbon-12': 'Carbon-12',
    'nitrogen-14': 'Nitrogen-14, most of the air',
    'oxygen-16': 'Oxygen-16',
    'noble-gas': 'Any noble gas, as a neutral atom',
    'calcium-40': 'Calcium-40',
    'hydrogen-1': 'Hydrogen-1, ordinary hydrogen',
    deuterium: 'Deuterium, heavy hydrogen',
    tritium: 'Tritium, radioactive hydrogen',
    'carbon-14': 'Carbon-14, used to date old things',
    'falls-apart': 'A nucleus that falls apart within a day',
    'potassium-40': 'Potassium-40, found in bananas',
    'sodium-ion': 'Na⁺, as in table salt',
    'chloride-ion': 'Cl⁻, as in table salt',
    'magnesium-ion': 'Mg²⁺',
    'oxide-ion': 'O²⁻',
    'hydrogen-ion': 'H⁺, a bare proton',
    'calcium-ion': 'Ca²⁺, as in your bones',
    'noble-shell': 'Any ion with a full outer shell',
  },
  questState: { done: 'Done', open: 'Not done yet' },
  questDone: (quest) => `Quest done: ${quest}!`,
  announceQuest: (quest, done, total) => `Quest done: ${quest}. ${done} of ${total} done.`,
  allDone: 'All quests done. Great work!',
  halfLife: (halfLife) => {
    const { amount, scale } = halfLifeParts(halfLife);
    const words = {
      day: amount === 1 ? 'day' : 'days',
      year: amount === 1 ? 'year' : 'years',
      million: 'million years',
      billion: 'billion years',
      'billion-billion': 'billion billion years',
    }[scale];
    return `about ${formatNumber(amount, 'en', Number.isInteger(amount) ? 0 : 1)} ${words}`;
  },
  name: enHeading,
  status: enStatus,
  readouts: enReadouts,
  picture: enPicture,
};

// ── Slovenčina ──────────────────────────────────────────────────────────────────────────────────

const SK_ELEMENTS = [
  'Vodík', 'Hélium', 'Lítium', 'Berýlium', 'Bór', 'Uhlík', 'Dusík', 'Kyslík', 'Fluór', 'Neón',
  'Sodík', 'Horčík', 'Hliník', 'Kremík', 'Fosfor', 'Síra', 'Chlór', 'Argón', 'Draslík', 'Vápnik',
];

/** Slovak number agreement: 1 protón, 2–4 protóny, 5 protónov; a decimal takes the genitive singular (2,6 roka). */
function skForm(n: number, one: string, few: string, many: string, fraction = many): string {
  if (!Number.isInteger(n)) return fraction;
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
}
const protons = (n: number) => `${n} ${skForm(n, 'protón', 'protóny', 'protónov')}`;
const neutrons = (n: number) => `${n} ${skForm(n, 'neutrón', 'neutróny', 'neutrónov')}`;
const electrons = (n: number) => `${n} ${skForm(n, 'elektrón', 'elektróny', 'elektrónov')}`;
/** "z" or "zo" before a number, as it is read aloud: zo 7 (sedem), z 8 (ôsmich). */
const zo = (n: number) => (/^(4|6|7|1[467]|[467]\d|1\d\d)$/.test(String(n)) ? 'zo' : 'z');
const skName = (z: number) => SK_ELEMENTS[z - 1]!.toLocaleLowerCase('sk');
const skNuclide = (v: View) => (v.z === 1 && v.a === 2 ? 'Vodík-2 (deutérium)' : v.z === 1 && v.a === 3 ? 'Vodík-3 (trícium)' : `${SK_ELEMENTS[v.z - 1]}-${v.a}`);
const SK_NUCLEUS = { stable: 'stabilné jadro', radioactive: 'rádioaktívne jadro', 'short-lived': 'rádioaktívne jadro, rozpadne sa do jedného dňa' };
const SK_STATUS = { stable: 'Stabilné jadro', radioactive: 'Rádioaktívne jadro', 'short-lived': 'Rádioaktívne: rozpadne sa do jedného dňa' };

function skTendency(tendency: Tendency): string {
  if (tendency.kind === 'full') return 'Plná: takmer nikdy nereaguje';
  if (tendency.kind === 'give') return `Odovzdá ${electrons(tendency.count)}`;
  if (tendency.kind === 'share') return `Delí sa o ${electrons(tendency.count)}`;
  return tendency.count === 1 ? 'Chýba mu 1 elektrón' : `Chýbajú mu ${electrons(tendency.count)}`;
}

function skStatus(v: View): string {
  if (v.z > 0) return SK_STATUS[v.nucleus.kind as keyof typeof SK_STATUS];
  if (v.e > 0) return 'Nič ich nedrží pokope';
  return { none: 'Začni pridaním protónu', neutron: 'Rozpadne sa približne za 10 minút', neutrons: 'Nedržia pokope' }[
    v.nucleus.kind as 'none' | 'neutron' | 'neutrons'
  ];
}

function skHeading(v: View): string {
  if (v.z > 0) return v.charge === 0 ? (v.a === 2 && v.z === 1 ? 'Deutérium' : v.a === 3 && v.z === 1 ? 'Trícium' : skNuclide(v)) : `Ión ${v.notation}`;
  if (v.e === 0) return { none: 'Zatiaľ nič', neutron: 'Samotný neutrón', neutrons: 'Samé neutróny' }[v.nucleus.kind as 'none' | 'neutron' | 'neutrons'];
  return v.n === 0 ? 'Samé elektróny' : 'Zatiaľ žiadny atóm';
}

function skReadouts(v: View): Readouts {
  const name = v.z > 0 ? skName(v.z) : '';
  const element: Line =
    v.z > 0
      ? { value: `${SK_ELEMENTS[v.z - 1]} (${v.element!.symbol})`, detail: `Protónové číslo ${v.z}: každý atóm tohto prvku má ${protons(v.z)}.` }
      : { value: 'Zatiaľ žiadny', detail: 'Prvok určuje počet protónov.' };

  let isotope: Line;
  if (v.z === 0) {
    isotope = {
      none: { value: 'Žiadne jadro', detail: 'Postav ho z protónov a neutrónov.' },
      neutron: { value: 'Samotný neutrón', detail: 'Samotný neutrón sa rozpadne približne za 10 minút (polčas rozpadu).' },
      neutrons: { value: 'Samé neutróny', detail: 'Samotné neutróny nedržia pokope.' },
    }[v.nucleus.kind as 'none' | 'neutron' | 'neutrons'];
  } else {
    const counts = `${protons(v.z)} + ${neutrons(v.n)} = ${v.a} ${skForm(v.a, 'častica', 'častice', 'častíc')} v jadre.`;
    const nucleus = v.nucleus;
    const why =
      nucleus.kind === 'stable'
        ? 'Jadro sa samo nemení.'
        : nucleus.kind === 'radioactive'
          ? `Polovica takých jadier sa za ${sk.halfLife(nucleus.halfLife)} premení na iný prvok (polčas rozpadu).${
              outlivesUniverse(nucleus.halfLife) ? ' To je oveľa dlhšie, ako existuje vesmír.' : ''
            }`
          : `Polovica takých jadier sa rozpadne za menej ako deň. ${
              {
                'few-neutrons': 'Neutróny pomáhajú držať jadro pokope a tu ich je primálo.',
                'many-neutrons': 'Na taký malý počet protónov má priveľa neutrónov.',
                gap: 'Takáto zmes protónov a neutrónov dlho nevydrží.',
              }[nucleus.kind === 'short-lived' ? nucleus.why : 'gap']
            }`;
    isotope = { value: `${skNuclide(v)}: ${SK_NUCLEUS[nucleus.kind as keyof typeof SK_NUCLEUS]}`, detail: `${counts} ${why}` };
  }

  const q = v.charge;
  let charge: Line;
  switch (v.chargeKind) {
    case 'none':
      charge = { value: 'Bez náboja', detail: v.n > 0 ? 'Neutróny nemajú náboj.' : 'Zatiaľ tu nič nie je.' };
      break;
    case 'loose':
      charge = { value: `Náboj ${signed(q)}`, detail: 'Voľné elektróny: bez protónov ich nič nedrží.' };
      break;
    case 'neutral':
      charge = { value: 'Neutrálny atóm', detail: `${protons(v.z)} (+) a ${electrons(v.e)} (−) sa navzájom vyrovnajú.` };
      break;
    default: {
      const why = {
        common: v.z === 1 && v.n === 0 ? 'Bežný ión: samotný protón.' : 'Bežný ión.',
        uncommon: `Nie je to bežný ión: ${
          v.element!.ions.length > 0
            ? `${name} zvyčajne tvorí ${ions(v, 'alebo')}`
            : v.element!.tendency.kind === 'full'
              ? `${name} ióny takmer netvorí`
              : `${name} sa o elektróny radšej delí`
        }.`,
        alpha: 'Je to častica alfa: z takých častíc sa skladá žiarenie alfa.',
        bare: 'Nezostal mu ani jeden elektrón. To sa stáva na nesmierne horúcich miestach, napríklad hlboko vo vnútri hviezd.',
        overloaded: 'To je priveľa elektrónov navyše: navzájom sa odpudzujú a žiadny atóm ich neudrží.',
      }[v.chargeKind];
      const difference = `Elektrónov je o ${Math.abs(q)} ${q > 0 ? 'menej' : 'viac'} ako protónov.`;
      charge = { value: `Ión ${v.notation}, náboj ${signed(q)}`, detail: `${difference} ${why}` };
    }
  }

  let shell: Line;
  if (v.z === 0) {
    shell =
      v.e > 0
        ? { value: 'Žiadne vrstvy', detail: 'Elektróny drží vo vrstvách až jadro s protónmi.' }
        : { value: 'Žiadne elektróny', detail: 'Elektróny zapĺňajú vrstvy okolo jadra.' };
  } else if (!v.outer) {
    shell = { value: 'Žiadne elektróny', detail: 'Zostalo len holé jadro.' };
  } else {
    const tendency = v.charge === 0 ? skTendency(v.element!.tendency) : v.like ? `Plná, ako má ${skName(v.like)}` : 'Nie je plná';
    shell = { value: `${v.outer.count} z ${v.outer.capacity}`, detail: `${tendency}. Vrstvy od stredu: ${v.shells.join(', ')}.` };
  }
  return { element, isotope, charge, shell };
}

function skPicture(v: View): string {
  if (v.z === 0) {
    const loose = [v.n > 1 || (v.n === 1 && v.e > 0) ? neutrons(v.n) : '', v.e > 0 ? electrons(v.e) : ''].filter(Boolean).join(' a ');
    return `${skHeading(v)}${loose ? `: ${loose}` : ''}. ${skStatus(v)}.`;
  }
  const state = { stable: 'stabilné', radioactive: 'rádioaktívne', 'short-lived': 'rádioaktívne, rozpadne sa do jedného dňa' }[
    v.nucleus.kind as 'stable' | 'radioactive' | 'short-lived'
  ];
  const shells = `${v.shells.length} ${v.shells.length === 1 ? 'vrstve' : 'vrstvách'}`;
  const inShells = v.e === 0 ? 'Žiadne elektróny' : `${electrons(v.e)} v ${shells}: ${v.shells.join(', ')}`;
  return `${skHeading(v)}. Jadro: ${protons(v.z)} a ${neutrons(v.n)}, ${state}. ${inShells}.`;
}

const sk: Strings = {
  title: 'Postav si atóm',
  hints: {
    atoms: 'Pridávaj protóny, neutróny a elektróny alebo vyber prvok z tabuľky.',
    isotopes: 'Nechaj protóny a meň počet neutrónov. Ktoré jadrá držia pokope?',
    ions: 'Pridaj alebo uber elektróny a z atómu sa stane ión.',
  },
  particles: { protons: 'Protóny', neutrons: 'Neutróny', electrons: 'Elektróny' },
  add: { protons: 'Pridať protón', neutrons: 'Pridať neutrón', electrons: 'Pridať elektrón' },
  remove: { protons: 'Odobrať protón', neutrons: 'Odobrať neutrón', electrons: 'Odobrať elektrón' },
  labels: { element: 'Prvok', isotope: 'Izotop', charge: 'Náboj', shell: 'Vonkajšia vrstva' },
  elements: SK_ELEMENTS,
  footnote: 'Nie je v mierke. Skutočné elektróny sa pohybujú v rozmazanom oblaku, nie po kruhoch.',
  pick: 'Vyber prvok',
  built: (count, total) => `Postavené prvky: ${count} ${zo(total)} ${total}`,
  builtMark: 'postavený',
  questsTitle: 'Výzvy',
  progress: (done, total) => `Splnené: ${done} ${zo(total)} ${total}`,
  quests: {
    hydrogen: 'Vodík, najjednoduchší atóm',
    'helium-4': 'Hélium-4',
    'carbon-12': 'Uhlík-12',
    'nitrogen-14': 'Dusík-14, z neho je väčšina vzduchu',
    'oxygen-16': 'Kyslík-16',
    'noble-gas': 'Akýkoľvek vzácny plyn ako neutrálny atóm',
    'calcium-40': 'Vápnik-40',
    'hydrogen-1': 'Vodík-1, obyčajný vodík',
    deuterium: 'Deutérium, ťažký vodík',
    tritium: 'Trícium, rádioaktívny vodík',
    'carbon-14': 'Uhlík-14, podľa neho sa určuje vek starých vecí',
    'falls-apart': 'Jadro, ktoré sa rozpadne do jedného dňa',
    'potassium-40': 'Draslík-40, nájdeš ho aj v banánoch',
    'sodium-ion': 'Na⁺ ako v kuchynskej soli',
    'chloride-ion': 'Cl⁻ ako v kuchynskej soli',
    'magnesium-ion': 'Mg²⁺',
    'oxide-ion': 'O²⁻',
    'hydrogen-ion': 'H⁺, samotný protón',
    'calcium-ion': 'Ca²⁺ ako v tvojich kostiach',
    'noble-shell': 'Akýkoľvek ión s plnou vonkajšou vrstvou',
  },
  questState: { done: 'Splnená', open: 'Ešte nesplnená' },
  questDone: (quest) => `Výzva splnená: ${quest}!`,
  announceQuest: (quest, done, total) => `Výzva splnená: ${quest}. Splnené: ${done} ${zo(total)} ${total}.`,
  allDone: 'Všetky výzvy sú splnené. Skvelá práca!',
  halfLife: (halfLife) => {
    const { amount, scale } = halfLifeParts(halfLife);
    const billions = skForm(amount, 'miliarda', 'miliardy', 'miliárd', 'miliardy');
    const words = {
      day: skForm(amount, 'deň', 'dni', 'dní', 'dňa'),
      year: skForm(amount, 'rok', 'roky', 'rokov', 'roka'),
      million: `${skForm(amount, 'milión', 'milióny', 'miliónov', 'milióna')} rokov`,
      billion: `${billions} rokov`,
      'billion-billion': `${billions} miliárd rokov`,
    }[scale];
    return `približne ${formatNumber(amount, 'sk', Number.isInteger(amount) ? 0 : 1)} ${words}`;
  },
  name: skHeading,
  status: skStatus,
  readouts: skReadouts,
  picture: skPicture,
};

export const strings: Record<LangCode, Strings> = { en, sk };
