import type { LangCode } from '../../i18n/languages.ts';
import { isMetal, MAX_ORDER } from './model.ts';
import type { El, Hint, Refusal, Shape } from './model.ts';
import type { MoleculeId, Polarity, QuestId, Report } from './molecules.ts';

export interface MoleculeText {
  name: string;
  /** One true, simply worded line about it. */
  fact: string;
}

export interface Strings {
  title: string;
  hint: string;
  /** The first frame's invitation, for the carbon and four hydrogens waiting to become methane. */
  welcome: string;
  /** The board, for screen readers: "Building board with 8 atoms". */
  board: (atoms: number) => string;
  /** Element names as used inside a sentence: "hydrogen", "vodík". */
  element: Record<El, string>;
  nonmetals: string;
  metals: string;
  /** Hidden start of each palette button's name: "Add" + " H (hydrogen)". */
  add: string;
  remove: string;
  clear: string;
  /** An atom on the board, for screen readers: "Carbon: 2 free bonds", "Chlorine Cl⁻: no free bonds". */
  atom: (el: El, free: number, ion: string) => string;
  /** A bond on the board, for screen readers; `a` is the metal in an ionic bond. */
  bond: (a: El, b: El, order: number, ionic: boolean) => string;
  picked: (el: El) => string;
  unpicked: string;
  joined: (a: El, b: El, order: number) => string;
  gave: (metal: El, nonmetal: El, electrons: number, metalIon: string, nonmetalIon: string) => string;
  /** A bond after it was loosened to `order` (0: gone); `a` is the metal in an ionic bond. */
  loosened: (a: El, b: El, order: number, ionic: boolean) => string;
  refused: (refusal: { reason: Refusal; el?: El }) => string;
  added: (el: El) => string;
  removed: (el: El) => string;
  cleared: string;
  boardFull: string;
  pickFirst: string;
  completed: (name: string) => string;
  newFind: string;
  questDone: string;
  shape: string;
  shapes: Record<Shape, string>;
  /** The shape of a molecule with several centres: "carbon: tetrahedron and flat triangle; oxygen: bent". */
  centres: (centres: { el: El; shape: Shape }[]) => string;
  ionicShape: string;
  polarity: Record<Polarity, string>;
  unfinished: string;
  unnamed: string;
  start: string;
  /** What an unfinished molecule needs, starting in lower case: "carbon still has 2 free bonds". */
  hintText: (hint: Hint) => string;
  /** The whole board in words, for screen readers: "Water, H₂O, complete. Free: 1 carbon atom…". */
  summary: (report: Report) => string;
  quests: string;
  questsDone: (done: number, total: number) => string;
  quest: Record<QuestId, string>;
  /** Read after a finished quest by screen readers (the tick is only a picture). */
  doneMark: string;
  collection: string;
  discovered: (found: number, total: number) => string;
  collectionHelp: string;
  molecules: Record<MoleculeId, MoleculeText>;
}

/** First letter upper case: element names start sentences. */
export const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "carbon: tetrahedron and flat triangle; oxygen: bent", each element once, in the order given. */
const byElement = (centres: { el: El; shape: Shape }[], name: Record<El, string>, shapes: Record<Shape, string>, and: string) => {
  const els = [...new Set(centres.map((c) => c.el))];
  return els.map((el) => `${name[el]}: ${centres.filter((c) => c.el === el).map((c) => shapes[c.shape]).join(and)}`).join('; ');
};

const EN_ELEMENT: Record<El, string> = {
  H: 'hydrogen',
  C: 'carbon',
  N: 'nitrogen',
  O: 'oxygen',
  F: 'fluorine',
  S: 'sulfur',
  Cl: 'chlorine',
  Na: 'sodium',
  Mg: 'magnesium',
};
const EN_SHAPES: Record<Shape, string> = {
  linear: 'straight line',
  bent: 'bent, like a V',
  'trigonal-planar': 'flat triangle',
  'trigonal-pyramidal': 'triangular pyramid',
  tetrahedral: 'tetrahedron',
};
const EN_ORDER = ['', 'single', 'double', 'triple'];
const EN_SHARE = ['', 'a pair of electrons: a single', 'two pairs: a double', 'three pairs: a triple'];
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const enHint = (hint: Hint): string => {
  if (hint.kind === 'raise') {
    return `${EN_ELEMENT[hint.a]} and ${EN_ELEMENT[hint.b]} could share one more pair: join them again for a ${EN_ORDER[hint.order]} bond`;
  }
  return hint.metal
    ? `${EN_ELEMENT[hint.el]} can still give ${plural(hint.free, 'electron')}`
    : `${EN_ELEMENT[hint.el]} still has ${plural(hint.free, 'free bond')}`;
};

const EN_MOLECULES: Record<MoleculeId, MoleculeText> = {
  h2: { name: 'Hydrogen gas', fact: 'The lightest gas of all. When it burns, it joins with oxygen and turns into water.' },
  o2: { name: 'Oxygen gas', fact: 'About a fifth of the air is oxygen. You breathe it in all the time.' },
  n2: { name: 'Nitrogen gas', fact: 'Most of the air, about 78%, is nitrogen. Its triple bond is so strong that it hardly reacts.' },
  f2: { name: 'Fluorine gas', fact: 'A pale yellow gas that reacts with almost everything it touches. Very dangerous!' },
  cl2: { name: 'Chlorine gas', fact: 'A poisonous yellow-green gas. Chlorine and its compounds keep pool and tap water free of germs.' },
  hf: { name: 'Hydrogen fluoride', fact: 'Mixed with water it becomes a very dangerous acid that can even eat into glass.' },
  hcl: { name: 'Hydrogen chloride', fact: 'Mixed with water it becomes hydrochloric acid. Your stomach makes this acid to help digest food.' },
  water: {
    name: 'Water',
    fact: 'Oxygen pulls the shared electrons closer, and the molecule is bent (104.5°), so its oxygen end is slightly negative. That helps water dissolve so many things.',
  },
  h2o2: { name: 'Hydrogen peroxide', fact: 'Hairdressers use it to bleach hair. Much stronger hydrogen peroxide has even powered rockets.' },
  h2s: { name: 'Hydrogen sulfide', fact: 'It smells of rotten eggs. It is poisonous, and a lot of it can even switch off your sense of smell.' },
  ammonia: { name: 'Ammonia', fact: 'A gas with a sharp smell. Most of it is made into fertiliser that helps crops grow.' },
  methane: { name: 'Methane', fact: 'The main part of natural gas, which many homes use for cooking and heating.' },
  co2: { name: 'Carbon dioxide', fact: 'You breathe it out. Plants take it in and, with sunlight and water, turn it into sugar.' },
  hcn: { name: 'Hydrogen cyanide', fact: 'A deadly poison that boils into a gas at just 26 °C. It smells faintly of bitter almonds, but some people cannot smell it.' },
  ethane: { name: 'Ethane', fact: 'Natural gas contains a little of it. Factories turn it into ethene, which is used to make plastic.' },
  ethene: { name: 'Ethene (ethylene)', fact: 'Some fruits, like bananas and apples, give it off as they ripen, and it makes the fruit nearby ripen faster.' },
  ethyne: { name: 'Ethyne (acetylene)', fact: 'Burned with oxygen, it makes a flame over 3,000 °C hot. Welders use it to cut and join steel.' },
  methanol: { name: 'Methanol', fact: 'The simplest alcohol. It is very poisonous: even a little can make a person blind.' },
  ethanol: { name: 'Ethanol', fact: 'The alcohol in wine and beer. It has the same atoms as dimethyl ether, joined differently.' },
  dme: { name: 'Dimethyl ether', fact: 'A gas that pushes the spray out of some spray cans. It has the same atoms as ethanol, joined differently.' },
  formaldehyde: { name: 'Formaldehyde', fact: 'Its solution in water, called formalin, keeps specimens from rotting, for example in museums.' },
  aceticAcid: { name: 'Acetic acid', fact: 'The acid in vinegar. It gives vinegar its sour taste and sharp smell.' },
  ccl4: { name: 'Carbon tetrachloride', fact: 'Fire extinguishers used to contain it. It was banned because it is poisonous, and a fire’s heat can turn it into another poisonous gas.' },
  chloroform: { name: 'Chloroform', fact: 'Over 150 years ago, doctors used it to put patients to sleep before operations.' },
  chloromethane: { name: 'Chloromethane', fact: 'Tropical plants, wood-rotting fungi and wildfires all give it off, so there is always a little of it in the air.' },
  nacl: { name: 'Table salt (sodium chloride)', fact: 'In a salt crystal, sodium and chloride ions take turns, like the squares of a 3D chessboard.' },
  naf: { name: 'Sodium fluoride', fact: 'Some toothpastes contain it. Fluoride helps protect teeth from decay.' },
  naoh: { name: 'Sodium hydroxide', fact: 'Used to make soap and to unblock drains. It can badly burn skin and eyes: never touch drain cleaner!' },
  bakingSoda: { name: 'Baking soda (sodium hydrogen carbonate)', fact: 'With vinegar it fizzes, giving off bubbles of carbon dioxide.' },
  na2o: { name: 'Sodium oxide', fact: 'Ordinary window glass contains it. It helps the sand melt at a lower temperature.' },
  na2s: { name: 'Sodium sulfide', fact: 'Leather makers use it to remove hair from animal hides.' },
  mgo: { name: 'Magnesium oxide', fact: 'Burning magnesium gives a dazzling white light (never look straight at it!) and leaves this white powder behind.' },
  mgs: { name: 'Magnesium sulfide', fact: 'Steelworks add magnesium to molten iron to pull out sulfur, and this is what forms.' },
  mgcl2: { name: 'Magnesium chloride', fact: 'It is spread on icy roads, like salt. In Japan it is used to make tofu.' },
  mgf2: { name: 'Magnesium fluoride', fact: 'A very thin layer of it on camera lenses cuts down reflections.' },
};

const en: Strings = {
  title: 'Build a molecule',
  hint: 'Pick two atoms to join them, and pick the same two again for a double bond. Pick a bond to loosen it. Keys: Tab to move, Enter to pick, Delete to remove, Escape to let go.',
  welcome: 'Water is ready. Now pick the carbon, then each hydrogen, to make methane.',
  board: (n) => (n === 0 ? 'Empty building board' : `Building board with ${plural(n, 'atom')}`),
  element: EN_ELEMENT,
  nonmetals: 'Nonmetals',
  metals: 'Metals',
  add: 'Add',
  remove: 'Remove the picked atom',
  clear: 'Clear the board',
  atom: (el, free, ion) =>
    `${cap(EN_ELEMENT[el])}${ion ? ` ${ion}` : ''}: ${
      isMetal(el) ? (free ? `${plural(free, 'electron')} to give` : 'nothing left to give') : free ? plural(free, 'free bond') : 'no free bonds'
    }`,
  bond: (a, b, order, ionic) =>
    ionic
      ? `Ionic bond between ${EN_ELEMENT[a]} and ${EN_ELEMENT[b]}. Pick it to give one electron back.`
      : `${cap(EN_ORDER[order]!)} bond between ${EN_ELEMENT[a]} and ${EN_ELEMENT[b]}. Pick it to ${order > 1 ? 'take one pair away' : 'break it'}.`,
  picked: (el) => `Picked: ${EN_ELEMENT[el]}. Now pick an atom to join it to.`,
  unpicked: 'Nothing is picked.',
  joined: (a, b, order) =>
    `${a === b ? `Two ${EN_ELEMENT[a]} atoms` : `${cap(EN_ELEMENT[a])} and ${EN_ELEMENT[b]}`} now share ${EN_SHARE[order]} bond.`,
  gave: (metal, nonmetal, n, metalIon, nonmetalIon) =>
    `${n === 1 ? 'An electron jumped' : `${n} electrons jumped`} from ${EN_ELEMENT[metal]} to ${EN_ELEMENT[nonmetal]}. Now they are ions, ${metalIon} and ${nonmetalIon}, and they attract each other.`,
  loosened: (a, b, order, ionic) => {
    if (ionic) return `One electron went back from ${EN_ELEMENT[b]} to ${EN_ELEMENT[a]}.`;
    const pair = a === b ? `the two ${EN_ELEMENT[a]} atoms` : `${EN_ELEMENT[a]} and ${EN_ELEMENT[b]}`;
    return order === 0 ? `${cap(pair)} are apart again.` : `Now ${pair} share ${EN_SHARE[order]} bond.`;
  },
  refused: ({ reason, el = 'H' }) =>
    reason === 'metals'
      ? 'Metal atoms don’t join into molecules. In a lump of metal, they share a “sea” of loose electrons instead.'
      : reason === 'metal-carbon'
        ? 'In this lab, carbon only shares electrons: it doesn’t take them from metals.'
        : reason === 'full'
          ? `This ${EN_ELEMENT[el]} atom has ${isMetal(el) ? 'no electrons left to give' : 'no free bonds left'}.`
          : MAX_ORDER[el] === 1
            ? `${cap(EN_ELEMENT[el])} makes only single bonds.`
            : MAX_ORDER[el] === 2
              ? `${cap(EN_ELEMENT[el])} usually shares at most two pairs with one partner.`
              : 'Three pairs, a triple bond, is the most these atoms can share.',
  added: (el) => `Added one ${EN_ELEMENT[el]} atom.`,
  removed: (el) => `Removed one ${EN_ELEMENT[el]} atom.`,
  cleared: 'The board is empty now. Add atoms with the buttons below.',
  boardFull: 'The board is full: 12 atoms at most. Remove one first.',
  pickFirst: 'First pick the atom you want to remove.',
  completed: (name) => `${name} is complete!`,
  newFind: 'New in your collection!',
  questDone: 'Quest done!',
  shape: 'Shape',
  shapes: EN_SHAPES,
  centres: (centres) => byElement(centres, EN_ELEMENT, EN_SHAPES, ' and '),
  ionicShape: 'a crystal of many ions',
  polarity: {
    polar: 'Polar: one end is slightly negative (δ−), the other slightly positive (δ+).',
    nonpolar: 'Nonpolar: neither end is more negative than the other.',
    ionic: 'Ionic: made of ions that attract each other.',
  },
  unfinished: 'Not finished yet',
  unnamed: 'Complete! This one isn’t in the lab’s list, though.',
  start: 'Pick an atom on the board to start building.',
  hintText: enHint,
  summary: ({ items, free }) => {
    const parts = items.map(
      (item) =>
        `${item.molecule ? `${EN_MOLECULES[item.molecule.id].name}, ` : ''}${item.formula}, ${item.complete ? 'complete' : `unfinished: ${enHint(item.hint!)}`}.`,
    );
    if (free.length) parts.push(`Free: ${free.map(([el, n]) => plural(n, `${EN_ELEMENT[el]} atom`)).join(', ')}.`);
    return parts.join(' ') || 'The board is empty.';
  },
  quests: 'Quests',
  questsDone: (done, total) => `${done} of ${total} done`,
  quest: {
    h2: 'Hydrogen gas, H₂: join two hydrogen atoms',
    water: 'Water, H₂O',
    co2: 'Carbon dioxide, CO₂, with two double bonds',
    methane: 'Methane, CH₄',
    ammonia: 'Ammonia, NH₃',
    n2: 'Nitrogen gas, N₂, with a triple bond',
    nacl: 'Table salt, NaCl: an ionic bond',
    naoh: 'Sodium hydroxide, NaOH: ionic and covalent bonds at once',
  },
  doneMark: 'done',
  collection: 'Your collection',
  discovered: (found, total) => `Discovered: ${found} of ${total}`,
  collectionHelp: 'Pick a name to read about it again.',
  molecules: EN_MOLECULES,
};

// Slovak: element names decline, so each sentence takes the case it needs.
const SK_ELEMENT: Record<El, string> = {
  H: 'vodík',
  C: 'uhlík',
  N: 'dusík',
  O: 'kyslík',
  F: 'fluór',
  S: 'síra',
  Cl: 'chlór',
  Na: 'sodík',
  Mg: 'horčík',
};
/** Genitive: "atóm uhlíka". */
const SK_OF: Record<El, string> = {
  H: 'vodíka',
  C: 'uhlíka',
  N: 'dusíka',
  O: 'kyslíka',
  F: 'fluóru',
  S: 'síry',
  Cl: 'chlóru',
  Na: 'sodíka',
  Mg: 'horčíka',
};
/** Instrumental: "medzi uhlíkom a kyslíkom". */
const SK_WITH: Record<El, string> = {
  H: 'vodíkom',
  C: 'uhlíkom',
  N: 'dusíkom',
  O: 'kyslíkom',
  F: 'fluórom',
  S: 'sírou',
  Cl: 'chlórom',
  Na: 'sodíkom',
  Mg: 'horčíkom',
};
/** "From": "zo sodíka", "z chlóru". */
const SK_FROM: Record<El, string> = {
  H: 'z vodíka',
  C: 'z uhlíka',
  N: 'z dusíka',
  O: 'z kyslíka',
  F: 'z fluóru',
  S: 'zo síry',
  Cl: 'z chlóru',
  Na: 'zo sodíka',
  Mg: 'z horčíka',
};
/** Accusative after "na": "na chlór", "na síru". */
const SK_ONTO: Record<El, string> = { ...SK_ELEMENT, S: 'síru' };
const SK_SHAPES: Record<Shape, string> = {
  linear: 'rovná čiara',
  bent: 'lomená čiara, ako písmeno V',
  'trigonal-planar': 'plochý trojuholník',
  'trigonal-pyramidal': 'trojboká pyramída',
  tetrahedral: 'štvorsten',
};
const SK_ORDER = ['', 'jednoduchá', 'dvojitá', 'trojitá'];
const SK_SHARE = ['', 'jeden elektrónový pár: jednoduchá', 'dva páry: dvojitá', 'tri páry: trojitá'];
/** 1 atóm, 2–4 atómy, 5 a viac atómov. */
const skAtoms = (n: number) => `${n} ${n === 1 ? 'atóm' : n < 5 ? 'atómy' : 'atómov'}`;

const skHint = (hint: Hint): string => {
  if (hint.kind === 'raise') {
    return `medzi ${SK_WITH[hint.a]} a ${SK_WITH[hint.b]} môže vzniknúť ${SK_ORDER[hint.order]} väzba – spoj ich ešte raz`;
  }
  return hint.metal
    ? `${SK_ELEMENT[hint.el]} môže dať ešte ${hint.free} ${hint.free === 1 ? 'elektrón' : 'elektróny'}`
    : `${SK_ELEMENT[hint.el]} má ešte ${hint.free} ${hint.free === 1 ? 'voľnú väzbu' : 'voľné väzby'}`;
};

const SK_MOLECULES: Record<MoleculeId, MoleculeText> = {
  h2: { name: 'Plynný vodík', fact: 'Najľahší zo všetkých plynov. Keď horí, spája sa s kyslíkom a mení sa na vodu.' },
  o2: { name: 'Plynný kyslík', fact: 'Kyslík tvorí asi pätinu vzduchu. Vdychuješ ho s každým nádychom.' },
  n2: { name: 'Plynný dusík', fact: 'Tvorí väčšinu vzduchu, asi 78 %. Jeho trojitá väzba je taká pevná, že dusík takmer nereaguje.' },
  f2: { name: 'Plynný fluór', fact: 'Bledožltý plyn, ktorý reaguje takmer so všetkým, čoho sa dotkne. Veľmi nebezpečný!' },
  cl2: { name: 'Plynný chlór', fact: 'Jedovatý žltozelený plyn. Chlór a jeho zlúčeniny ničia choroboplodné zárodky vo vode v bazénoch aj vo vodovode.' },
  hf: { name: 'Fluorovodík', fact: 'S vodou vytvára veľmi nebezpečnú kyselinu, ktorá dokáže leptať aj sklo.' },
  hcl: { name: 'Chlorovodík', fact: 'S vodou vytvára kyselinu chlorovodíkovú. Tvoj žalúdok ju vyrába, aby pomohla tráviť jedlo.' },
  water: {
    name: 'Voda',
    fact: 'Kyslík si spoločné elektróny priťahuje bližšie a molekula je lomená (104,5°), takže jej kyslíkový koniec je trochu záporný. Preto voda rozpúšťa toľko látok.',
  },
  h2o2: { name: 'Peroxid vodíka', fact: 'Kaderníci ním odfarbujú vlasy. Oveľa silnejší peroxid vodíka dokonca poháňal rakety.' },
  h2s: { name: 'Sulfán (sírovodík)', fact: 'Páchne ako skazené vajcia. Je jedovatý a vo väčšom množstve dokonca vyradí čuch.' },
  ammonia: { name: 'Amoniak', fact: 'Plyn s ostrým zápachom. Najviac sa ho spotrebuje na výrobu hnojív, vďaka ktorým lepšie rastú plodiny.' },
  methane: { name: 'Metán', fact: 'Hlavná zložka zemného plynu, ktorým sa v mnohých domácnostiach varí a kúri.' },
  co2: { name: 'Oxid uhličitý', fact: 'Vydychuješ ho. Rastliny ho prijímajú a pomocou slnečného svetla a vody z neho vyrábajú cukor.' },
  hcn: { name: 'Kyanovodík', fact: 'Smrteľne jedovatý: vrie a mení sa na plyn už pri 26 °C. Slabo vonia po horkých mandliach, no niektorí ľudia ho necítia.' },
  ethane: { name: 'Etán', fact: 'Trochu ho obsahuje zemný plyn. Továrne z neho vyrábajú etén, z ktorého sa robia plasty.' },
  ethene: { name: 'Etén (etylén)', fact: 'Niektoré ovocie, napríklad banány a jablká, ho pri dozrievaní uvoľňuje a ovocie v blízkosti potom dozrieva rýchlejšie.' },
  ethyne: { name: 'Etín (acetylén)', fact: 'S kyslíkom horí plameňom horúcim vyše 3 000 °C. Zvárači ním režú a spájajú oceľ.' },
  methanol: { name: 'Metanol', fact: 'Najjednoduchší alkohol. Je veľmi jedovatý: aj malé množstvo môže človeka oslepiť.' },
  ethanol: { name: 'Etanol', fact: 'Alkohol vo víne a pive. Má rovnaké atómy ako dimetyléter, len inak pospájané.' },
  dme: { name: 'Dimetyléter', fact: 'Plyn, ktorý v niektorých sprejoch vytláča obsah von. Má rovnaké atómy ako etanol, len inak pospájané.' },
  formaldehyde: { name: 'Formaldehyd', fact: 'Jeho roztok vo vode, formalín, chráni preparáty pred rozkladom, napríklad v múzeách.' },
  aceticAcid: { name: 'Kyselina octová', fact: 'Kyselina v octe. Dáva mu kyslú chuť a ostrý zápach.' },
  ccl4: { name: 'Tetrachlórmetán', fact: 'Kedysi sa plnil do hasiacich prístrojov. Zakázali ho, lebo je jedovatý a teplom ohňa sa môže zmeniť na ďalší jedovatý plyn.' },
  chloroform: { name: 'Trichlórmetán (chloroform)', fact: 'Pred vyše 150 rokmi ním lekári uspávali pacientov pred operáciou.' },
  chloromethane: { name: 'Chlórmetán', fact: 'Uvoľňujú ho tropické rastliny, huby rozkladajúce drevo aj lesné požiare, preto je ho vo vzduchu vždy trochu.' },
  nacl: { name: 'Kuchynská soľ (chlorid sodný)', fact: 'V kryštáliku soli sa sodíkové a chloridové ióny striedajú ako políčka na trojrozmernej šachovnici.' },
  naf: { name: 'Fluorid sodný', fact: 'Býva v niektorých zubných pastách. Fluorid pomáha chrániť zuby pred kazom.' },
  naoh: { name: 'Hydroxid sodný', fact: 'Používa sa na výrobu mydla a na čistenie odpadov. Vážne poleptá pokožku aj oči: čističa odpadov sa nikdy nedotýkaj!' },
  bakingSoda: { name: 'Jedlá sóda (hydrogenuhličitan sodný)', fact: 'S octom šumí a uvoľňuje bublinky oxidu uhličitého.' },
  na2o: { name: 'Oxid sodný', fact: 'Obsahuje ho bežné okenné sklo. Pomáha, aby sa piesok roztavil pri nižšej teplote.' },
  na2s: { name: 'Sulfid sodný', fact: 'Pri výrobe kože sa ním odstraňuje srsť zo zvieracích koží.' },
  mgo: { name: 'Oxid horečnatý', fact: 'Horčík horí oslnivo bielym svetlom (nikdy sa doň nepozeraj priamo!) a zostane po ňom tento biely prášok.' },
  mgs: { name: 'Sulfid horečnatý', fact: 'Oceliarne pridávajú do roztaveného železa horčík, ktorý z neho vytiahne síru – a vznikne práve táto zlúčenina.' },
  mgcl2: { name: 'Chlorid horečnatý', fact: 'Sype sa na zľadovatené cesty podobne ako soľ. V Japonsku sa s ním vyrába tofu.' },
  mgf2: { name: 'Fluorid horečnatý', fact: 'Tenučká vrstva z neho na objektívoch fotoaparátov zmenšuje odlesky.' },
};

const sk: Strings = {
  title: 'Postav molekulu',
  hint: 'Vyber dva atómy a spoja sa. Keď vyberieš tie isté dva znova, vznikne dvojitá väzba. Vybraním väzby ju uvoľníš. Klávesy: Tab – presun, Enter – výber, Delete – odstránenie, Escape – zrušenie výberu.',
  welcome: 'Voda je hotová. Teraz vyber uhlík a potom každý vodík – vznikne metán.',
  board: (n) => (n === 0 ? 'Prázdna stavebná plocha' : `Stavebná plocha s ${n} ${n === 1 ? 'atómom' : 'atómami'}`),
  element: SK_ELEMENT,
  nonmetals: 'Nekovy',
  metals: 'Kovy',
  add: 'Pridaj',
  remove: 'Odober vybraný atóm',
  clear: 'Vyčisti plochu',
  atom: (el, free, ion) =>
    `${cap(SK_ELEMENT[el])}${ion ? ` ${ion}` : ''}: ${
      isMetal(el)
        ? free
          ? `${free} ${free === 1 ? 'elektrón' : 'elektróny'} na darovanie`
          : 'už nemá čo darovať'
        : free
          ? `${free} ${free === 1 ? 'voľná väzba' : 'voľné väzby'}`
          : 'bez voľných väzieb'
    }`,
  bond: (a, b, order, ionic) =>
    ionic
      ? `Iónová väzba medzi ${SK_WITH[a]} a ${SK_WITH[b]}. Vyber ju a jeden elektrón sa vráti.`
      : `${cap(SK_ORDER[order]!)} väzba medzi ${SK_WITH[a]} a ${SK_WITH[b]}. Vyber ju a ${order > 1 ? 'uberieš jeden pár' : 'rozpojíš ju'}.`,
  picked: (el) => `Vybraný atóm: ${SK_ELEMENT[el]}. Teraz vyber atóm, s ktorým sa spojí.`,
  unpicked: 'Nič nie je vybrané.',
  joined: (a, b, order) =>
    `${a === b ? `Dva atómy ${SK_OF[a]}` : `${cap(SK_ELEMENT[a])} a ${SK_ELEMENT[b]}`} teraz zdieľajú ${SK_SHARE[order]} väzba.`,
  gave: (metal, nonmetal, n, metalIon, nonmetalIon) =>
    `${n === 1 ? 'Elektrón preskočil' : `${n} elektróny preskočili`} ${SK_FROM[metal]} na ${SK_ONTO[nonmetal]}. Teraz sú to ióny ${metalIon} a ${nonmetalIon} a navzájom sa priťahujú.`,
  loosened: (a, b, order, ionic) => {
    if (ionic) return `Jeden elektrón sa vrátil ${SK_FROM[b]} na ${SK_ONTO[a]}.`;
    if (order === 0) return `Väzba medzi ${SK_WITH[a]} a ${SK_WITH[b]} zanikla.`;
    return `Teraz ${a === b ? `dva atómy ${SK_OF[a]}` : `${SK_ELEMENT[a]} a ${SK_ELEMENT[b]}`} zdieľajú ${SK_SHARE[order]} väzba.`;
  },
  refused: ({ reason, el = 'H' }) =>
    reason === 'metals'
      ? 'Atómy kovov netvoria molekuly. V kúsku kovu namiesto toho spoločne zdieľajú „more“ voľných elektrónov.'
      : reason === 'metal-carbon'
        ? 'V tomto laboratóriu uhlík elektróny iba zdieľa – od kovov si ich neberie.'
        : reason === 'full'
          ? `Atóm ${SK_OF[el]} už ${isMetal(el) ? 'nemá čo darovať' : 'nemá voľnú väzbu'}.`
          : MAX_ORDER[el] === 1
            ? `${cap(SK_ELEMENT[el])} tvorí iba jednoduché väzby.`
            : MAX_ORDER[el] === 2
              ? `${cap(SK_ELEMENT[el])} zvyčajne zdieľa s jedným partnerom najviac dva páry.`
              : 'Trojitá väzba, teda tri páry, je najviac, čo tieto atómy dokážu zdieľať.',
  added: (el) => `Pribudol jeden atóm ${SK_OF[el]}.`,
  removed: (el) => `Jeden atóm ${SK_OF[el]} je preč.`,
  cleared: 'Plocha je teraz prázdna. Atómy pridáš tlačidlami nižšie.',
  boardFull: 'Plocha je plná: zmestí sa na ňu najviac 12 atómov. Najprv jeden odober.',
  pickFirst: 'Najprv vyber atóm, ktorý chceš odobrať.',
  completed: (name) => `${name} – hotovo!`,
  newFind: 'Nová položka v tvojej zbierke!',
  questDone: 'Úloha splnená!',
  shape: 'Tvar',
  shapes: SK_SHAPES,
  centres: (centres) => byElement(centres, SK_ELEMENT, SK_SHAPES, ' a '),
  ionicShape: 'kryštál z mnohých iónov',
  polarity: {
    polar: 'Polárna: jeden koniec je trochu záporný (δ−), druhý trochu kladný (δ+).',
    nonpolar: 'Nepolárna: žiadny koniec nie je zápornejší ako druhý.',
    ionic: 'Iónová: skladá sa z iónov, ktoré sa navzájom priťahujú.',
  },
  unfinished: 'Ešte to nie je hotové',
  unnamed: 'Hotovo! V zozname laboratória však nie je.',
  start: 'Vyber atóm na ploche a začni stavať.',
  hintText: skHint,
  summary: ({ items, free }) => {
    const parts = items.map(
      (item) =>
        `${item.molecule ? `${SK_MOLECULES[item.molecule.id].name}, ` : ''}${item.formula} – ${item.complete ? 'hotovo' : `rozostavané: ${skHint(item.hint!)}`}.`,
    );
    if (free.length) parts.push(`Voľné: ${free.map(([el, n]) => `${skAtoms(n)} ${SK_OF[el]}`).join(', ')}.`);
    return parts.join(' ') || 'Plocha je prázdna.';
  },
  quests: 'Úlohy',
  questsDone: (done, total) => `Splnené: ${done} z ${total}`,
  quest: {
    h2: 'Plynný vodík, H₂: spoj dva atómy vodíka',
    water: 'Voda, H₂O',
    co2: 'Oxid uhličitý, CO₂, s dvoma dvojitými väzbami',
    methane: 'Metán, CH₄',
    ammonia: 'Amoniak, NH₃',
    n2: 'Plynný dusík, N₂, s trojitou väzbou',
    nacl: 'Kuchynská soľ, NaCl: iónová väzba',
    naoh: 'Hydroxid sodný, NaOH: iónová aj kovalentná väzba naraz',
  },
  doneMark: 'splnené',
  collection: 'Tvoja zbierka',
  discovered: (found, total) => `Objavené: ${found} z ${total}`,
  collectionHelp: 'Vyber názov a prečítaj si o látke znova.',
  molecules: SK_MOLECULES,
};

export const strings: Record<LangCode, Strings> = { en, sk };
