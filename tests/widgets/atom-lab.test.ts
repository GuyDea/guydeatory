import { parse } from 'node-html-parser';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { LangCode } from '../../src/i18n/languages.ts';
import AtomLab from '../../src/widgets/atom-lab/AtomLab.svelte';
import { ELEMENTS, NEUTRON_HALF_LIFE_S, RADIOACTIVE, STABLE } from '../../src/widgets/atom-lab/data.ts';
import type { HalfLife } from '../../src/widgets/atom-lab/data.ts';
import {
  chargeKind,
  collect,
  halfLifeParts,
  ionNotation,
  LIMITS,
  mostCommon,
  newlyDone,
  nucleus,
  nucleusLayout,
  outerShell,
  QUESTS,
  questsMet,
  seatOrder,
  shells,
  START,
  view,
} from '../../src/widgets/atom-lab/model.ts';
import type { Atom, QuestSet } from '../../src/widgets/atom-lab/model.ts';
import { strings } from '../../src/widgets/atom-lab/strings.ts';

const NBSP = ' ';
const atom = (protons: number, neutrons: number, electrons: number): Atom => ({ protons, neutrons, electrons });
const en = strings.en;
const sk = strings.sk;

/** "C-14" for every nuclide in the data, split into stable and radioactive. */
const nuclides = (table: Record<number, unknown>, massNumbers: (z: number) => number[]) =>
  Object.keys(table).flatMap((z) => massNumbers(Number(z)).map((a) => `${ELEMENTS[Number(z) - 1]!.symbol}-${a}`));
const stableNames = nuclides(STABLE, (z) => STABLE[z] ?? []);
const radioactiveNames = nuclides(RADIOACTIVE, (z) => Object.keys(RADIOACTIVE[z] ?? {}).map(Number));

describe('atom lab: the data', () => {
  it('has the elements 1–20 with their symbols', () => {
    expect(ELEMENTS.map((el) => el.symbol).join(' ')).toBe('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca');
  });

  it('knows the most common isotope of each element (NUBASE2020 abundances)', () => {
    expect(ELEMENTS.map((el) => el.common)).toEqual([1, 4, 7, 9, 11, 12, 14, 16, 19, 20, 23, 24, 27, 28, 31, 32, 35, 40, 39, 40]);
    for (const [i, el] of ELEMENTS.entries()) expect(STABLE[i + 1], el.symbol).toContain(el.common);
  });

  it('lists exactly the long-lived radioactive nuclides of the plan, plus calcium-48', () => {
    expect(radioactiveNames.sort()).toEqual(
      [
        'H-3', 'Be-7', 'Be-10', 'C-14', 'Na-22', 'Al-26', 'Si-32', 'P-32', 'P-33', 'S-35', 'Cl-36',
        'Ar-37', 'Ar-39', 'Ar-42', 'K-40', 'Ca-41', 'Ca-45', 'Ca-47', 'Ca-48',
      ].sort(),
    );
  });

  it('lists all 45 stable nuclides up to calcium', () => {
    expect(stableNames.sort()).toEqual(
      [
        'H-1', 'H-2', 'He-3', 'He-4', 'Li-6', 'Li-7', 'Be-9', 'B-10', 'B-11', 'C-12', 'C-13', 'N-14', 'N-15',
        'O-16', 'O-17', 'O-18', 'F-19', 'Ne-20', 'Ne-21', 'Ne-22', 'Na-23', 'Mg-24', 'Mg-25', 'Mg-26', 'Al-27',
        'Si-28', 'Si-29', 'Si-30', 'P-31', 'S-32', 'S-33', 'S-34', 'S-36', 'Cl-35', 'Cl-37', 'Ar-36', 'Ar-38',
        'Ar-40', 'K-39', 'K-41', 'Ca-40', 'Ca-42', 'Ca-43', 'Ca-44', 'Ca-46',
      ].sort(),
    );
  });

  it('gives every radioactive nuclide a half-life of at least a day, as NUBASE2020 does', () => {
    const inDays = (h: HalfLife) => (h.unit === 'd' ? h.value : h.value * 365.25);
    const halfLives = Object.values(RADIOACTIVE).flatMap((byA) => Object.values(byA));
    expect(halfLives.every((h) => inDays(h) >= 1)).toBe(true);
    expect(RADIOACTIVE[6]?.[14]).toEqual({ value: 5700, unit: 'y' });
    expect(RADIOACTIVE[19]?.[40]).toEqual({ value: 1.248e9, unit: 'y' });
    // Calcium-48 decays by double beta decay, about 6·10¹⁹ years (NUBASE2020: 5.6·10¹⁹).
    expect(RADIOACTIVE[20]?.[48]?.value).toBeCloseTo(5.6e19, -18);
  });

  it('calls every other nucleus up to 20 protons and 30 neutrons one that falls apart quickly', () => {
    let real = 0;
    for (let z = 1; z <= LIMITS.protons; z++) {
      for (let n = 0; n <= LIMITS.neutrons; n++) {
        const kind = nucleus(z, n).kind;
        const listed = STABLE[z]?.includes(z + n) || RADIOACTIVE[z]?.[z + n] !== undefined;
        expect(kind, `Z=${z} N=${n}`).toBe(listed ? (STABLE[z]?.includes(z + n) ? 'stable' : 'radioactive') : 'unbound');
        if (listed) real++;
      }
    }
    expect(real).toBe(64);
  });

  it('has the lone neutron decay in about 10 minutes', () => {
    expect(Math.round(NEUTRON_HALF_LIFE_S / 60)).toBe(10);
  });
});

describe('atom lab: hand-checked atoms', () => {
  it('carbon-12: stable, neutral, 4 of 8 in the outer shell, shares 4', () => {
    const v = view(atom(6, 6, 6));
    expect(v).toMatchObject({ z: 6, a: 12, charge: 0, chargeKind: 'neutral', shells: [2, 4] });
    expect(v.nucleus).toEqual({ kind: 'stable' });
    expect(v.outer).toEqual({ count: 4, capacity: 8, full: false });
    expect(v.element?.tendency).toEqual({ kind: 'share', count: 4 });
    expect(en.readouts(v)).toEqual({
      element: { value: 'Carbon (C)', detail: 'Atomic number 6: every carbon atom has 6 protons.' },
      isotope: { value: 'Carbon-12: stable nucleus', detail: '6 protons + 6 neutrons = 12 particles in the nucleus. It does not change by itself.' },
      charge: { value: 'Neutral atom', detail: '6 protons (+) and 6 electrons (−) cancel out.' },
      shell: { value: '4 of 8', detail: 'Shares 4 electrons. Shells from the inside: 2, 4.' },
    });
    expect(sk.readouts(v)).toEqual({
      element: { value: 'Uhlík (C)', detail: 'Protónové číslo 6: každý atóm tohto prvku má 6 protónov.' },
      isotope: { value: 'Uhlík-12: stabilné jadro', detail: '6 protónov + 6 neutrónov = 12 častíc v jadre. Jadro sa samo nemení.' },
      charge: { value: 'Neutrálny atóm', detail: '6 protónov (+) a 6 elektrónov (−) sa navzájom vyrovnajú.' },
      shell: { value: '4 z 8', detail: 'Delí sa o 4 elektróny. Vrstvy od stredu: 2, 4.' },
    });
    expect(en.name(v)).toBe('Carbon-12');
    expect(en.picture(v)).toBe('Carbon-12. Nucleus: 6 protons and 6 neutrons, stable. 6 electrons in 2 shells: 2, 4.');
    expect(sk.picture(v)).toBe('Uhlík-12. Jadro: 6 protónov a 6 neutrónov, stabilné. 6 elektrónov v 2 vrstvách: 2, 4.');
  });

  it('carbon-14: radioactive, half-life about 5,700 years', () => {
    const v = view(atom(6, 8, 6));
    expect(v.nucleus).toEqual({ kind: 'radioactive', halfLife: { value: 5700, unit: 'y' } });
    expect(en.readouts(v).isotope).toEqual({
      value: 'Carbon-14: radioactive nucleus',
      detail: '6 protons + 8 neutrons = 14 particles in the nucleus. Half of such nuclei turn into another element in about 5,700 years (its half-life).',
    });
    expect(sk.readouts(v).isotope).toEqual({
      value: 'Uhlík-14: rádioaktívne jadro',
      detail: `6 protónov + 8 neutrónov = 14 častíc v jadre. Polovica takých jadier sa za približne 5${NBSP}700 rokov premení na iný prvok (polčas rozpadu).`,
    });
    expect(en.status(v)).toBe('Radioactive nucleus');
  });

  it('hydrogen-3: tritium, radioactive, about 12 years', () => {
    const v = view(atom(1, 2, 1));
    expect(v.nucleus).toEqual({ kind: 'radioactive', halfLife: { value: 12.32, unit: 'y' } });
    expect(en.name(v)).toBe('Tritium');
    expect(sk.name(v)).toBe('Trícium');
    expect(en.readouts(v).isotope.value).toBe('Hydrogen-3 (tritium): radioactive nucleus');
    expect(sk.readouts(v).isotope.value).toBe('Vodík-3 (trícium): rádioaktívne jadro');
    expect(en.readouts(view(atom(1, 1, 1))).isotope.value).toBe('Hydrogen-2 (deuterium): stable nucleus');
  });

  it('Na⁺: one electron fewer, a common ion, full outer shell like neon', () => {
    const v = view(atom(11, 12, 10));
    expect(v).toMatchObject({ charge: 1, chargeKind: 'common', notation: 'Na⁺', shells: [2, 8], like: 10 });
    expect(v.outer).toEqual({ count: 8, capacity: 8, full: true });
    expect(en.readouts(v).charge).toEqual({ value: 'Na⁺ ion, charge +1', detail: '1 electron fewer than protons. A common ion.' });
    expect(sk.readouts(v).charge).toEqual({ value: 'Ión Na⁺, náboj +1', detail: 'Elektrónov je o 1 menej ako protónov. Bežný ión.' });
    expect(en.readouts(v).shell).toEqual({ value: '8 of 8', detail: 'Full, like neon. Shells from the inside: 2, 8.' });
    expect(sk.readouts(v).shell).toEqual({ value: '8 z 8', detail: 'Plná, ako má neón. Vrstvy od stredu: 2, 8.' });
    expect(en.name(v)).toBe('Na⁺ ion');
    expect(sk.name(v)).toBe('Ión Na⁺');
  });

  it('Cl⁻: one electron more, a common ion, full outer shell like argon', () => {
    const v = view(atom(17, 18, 18));
    expect(v).toMatchObject({ charge: -1, chargeKind: 'common', notation: 'Cl⁻', shells: [2, 8, 8], like: 18 });
    expect(en.readouts(v).charge).toEqual({ value: 'Cl⁻ ion, charge −1', detail: '1 electron more than protons. A common ion.' });
    expect(en.readouts(v).shell.detail).toBe('Full, like argon. Shells from the inside: 2, 8, 8.');
  });

  it('O²⁻: two electrons more, a common ion, full outer shell like neon', () => {
    const v = view(atom(8, 8, 10));
    expect(v).toMatchObject({ charge: -2, chargeKind: 'common', notation: 'O²⁻', shells: [2, 8], like: 10 });
    expect(en.readouts(v).charge).toEqual({ value: 'O²⁻ ion, charge −2', detail: '2 electrons more than protons. A common ion.' });
    expect(sk.readouts(v).charge).toEqual({ value: 'Ión O²⁻, náboj −2', detail: 'Elektrónov je o 2 viac ako protónov. Bežný ión.' });
  });

  it('helium-2 falls apart: too few neutrons', () => {
    const v = view(atom(2, 0, 2));
    expect(v.nucleus).toEqual({ kind: 'unbound', why: 'few-neutrons' });
    expect(en.readouts(v).isotope).toEqual({
      value: 'Helium-2: nucleus falls apart quickly',
      detail:
        '2 protons + 0 neutrons = 2 particles in the nucleus. It falls apart within a day, usually in a fraction of a second. Neutrons help hold a nucleus together, and this one has too few.',
    });
    expect(sk.readouts(v).isotope).toEqual({
      value: 'Hélium-2: jadro sa rýchlo rozpadne',
      detail:
        '2 protóny + 0 neutrónov = 2 častice v jadre. Rozpadne sa do jedného dňa, zvyčajne za zlomok sekundy. Neutróny pomáhajú držať jadro pokope a tu ich je primálo.',
    });
    expect(en.status(v)).toBe('Nucleus falls apart quickly');
    expect(sk.status(v)).toBe('Jadro sa rýchlo rozpadne');
  });

  it('knows why other nuclei fall apart: too many neutrons, or a mix that does not last', () => {
    expect(nucleus(1, 3)).toEqual({ kind: 'unbound', why: 'many-neutrons' });
    expect(nucleus(4, 4)).toEqual({ kind: 'unbound', why: 'gap' }); // beryllium-8 splits into two helium-4
    expect(en.readouts(view(atom(1, 3, 1))).isotope.detail).toContain('It has too many neutrons for so few protons.');
  });

  it('a lone neutron decays in about 10 minutes; several neutrons do not stick together', () => {
    const lone = view(atom(0, 1, 0));
    expect(lone.nucleus).toEqual({ kind: 'neutron' });
    expect(en.name(lone)).toBe('A lone neutron');
    expect(en.readouts(lone).isotope).toEqual({ value: 'A lone neutron', detail: 'A lone neutron decays in about 10 minutes (its half-life).' });
    expect(sk.readouts(lone).isotope).toEqual({ value: 'Samotný neutrón', detail: 'Samotný neutrón sa rozpadne približne za 10 minút (polčas rozpadu).' });
    expect(en.readouts(lone).element).toEqual({ value: 'None yet', detail: 'The number of protons decides the element.' });
    const several = view(atom(0, 3, 0));
    expect(several.nucleus).toEqual({ kind: 'neutrons' });
    expect(en.readouts(several).isotope).toEqual({ value: 'Only neutrons', detail: 'Neutrons on their own don’t stick together.' });
  });

  it('describes nothing, and loose electrons, without pretending there is an atom', () => {
    const nothing = view(atom(0, 0, 0));
    expect(en.name(nothing)).toBe('Nothing yet');
    expect(en.picture(nothing)).toBe('Nothing yet. Add a proton to start.');
    const loose = view(atom(0, 0, 3));
    expect(loose.chargeKind).toBe('loose');
    expect(en.readouts(loose).charge).toEqual({ value: 'Charge −3', detail: 'Loose electrons: with no protons, nothing holds them.' });
    expect(en.readouts(loose).shell).toEqual({ value: 'No shells', detail: 'Electrons need protons to hold them in shells.' });
  });
});

describe('atom lab: shells', () => {
  it('fills 2, 8, 8, 2 (correct up to 20 electrons)', () => {
    const filled = [0, 1, 2, 3, 6, 10, 11, 17, 18, 19, 20].map((e) => shells(e));
    expect(filled).toEqual([[], [1], [2], [2, 1], [2, 4], [2, 8], [2, 8, 1], [2, 8, 7], [2, 8, 8], [2, 8, 8, 1], [2, 8, 8, 2]]);
  });

  it('counts the outer shell out of 2 (first shell) or 8 (the others)', () => {
    expect(outerShell(0)).toBeNull();
    expect(outerShell(1)).toEqual({ count: 1, capacity: 2, full: false });
    expect(outerShell(2)).toEqual({ count: 2, capacity: 2, full: true });
    expect(outerShell(3)).toEqual({ count: 1, capacity: 8, full: false });
    expect(outerShell(18)).toEqual({ count: 8, capacity: 8, full: true });
    expect(outerShell(20)).toEqual({ count: 2, capacity: 8, full: false });
  });

  it('describes what each neutral atom tends to do', () => {
    const tendency = (z: number) => en.readouts(view(mostCommon(z))).shell.detail.split('.')[0];
    expect([1, 2, 3, 6, 7, 8, 9, 11, 12, 13, 17, 18].map(tendency)).toEqual([
      'Shares 1 electron',
      'Full: hardly ever reacts',
      'Gives away 1 electron',
      'Shares 4 electrons',
      'Needs 3 more electrons',
      'Needs 2 more electrons',
      'Needs 1 more electron',
      'Gives away 1 electron',
      'Gives away 2 electrons',
      'Gives away 3 electrons',
      'Needs 1 more electron',
      'Full: hardly ever reacts',
    ]);
    const tendencySk = (z: number) => sk.readouts(view(mostCommon(z))).shell.detail.split('.')[0];
    expect([1, 6, 7, 9, 12, 18].map(tendencySk)).toEqual([
      'Delí sa o 1 elektrón',
      'Delí sa o 4 elektróny',
      'Chýbajú mu 3 elektróny',
      'Chýba mu 1 elektrón',
      'Odovzdá 2 elektróny',
      'Plná: takmer nikdy nereaguje',
    ]);
  });

  it('seats the outer electrons spread out: carbon’s four sit at the top, bottom and both sides', () => {
    expect(seatOrder(8)).toEqual([0, 4, 2, 6, 1, 5, 3, 7]);
    expect(seatOrder(2)).toEqual([0, 1]);
    expect(seatOrder(8).slice(0, 4).map((seat) => (seat * 360) / 8)).toEqual([0, 180, 90, 270]);
  });
});

describe('atom lab: half-lives in words', () => {
  // [nuclide, half-life, English, Slovak], checked by hand against NUBASE2020 rounded to two figures.
  const cases: [string, HalfLife, string, string][] = [
    ['H-3', { value: 12.32, unit: 'y' }, 'about 12 years', 'približne 12 rokov'],
    ['Be-7', { value: 53.22, unit: 'd' }, 'about 53 days', 'približne 53 dní'],
    ['Be-10', { value: 1.387e6, unit: 'y' }, 'about 1.4 million years', 'približne 1,4 milióna rokov'],
    ['C-14', { value: 5700, unit: 'y' }, 'about 5,700 years', `približne 5${NBSP}700 rokov`],
    ['Na-22', { value: 2.6019, unit: 'y' }, 'about 2.6 years', 'približne 2,6 roka'],
    ['Al-26', { value: 7.17e5, unit: 'y' }, 'about 720,000 years', `približne 720${NBSP}000 rokov`],
    ['Si-32', { value: 157, unit: 'y' }, 'about 160 years', 'približne 160 rokov'],
    ['P-32', { value: 14.269, unit: 'd' }, 'about 14 days', 'približne 14 dní'],
    ['Cl-36', { value: 3.013e5, unit: 'y' }, 'about 300,000 years', `približne 300${NBSP}000 rokov`],
    ['Ar-39', { value: 268, unit: 'y' }, 'about 270 years', 'približne 270 rokov'],
    ['Ar-42', { value: 32.9, unit: 'y' }, 'about 33 years', 'približne 33 rokov'],
    ['K-40', { value: 1.248e9, unit: 'y' }, 'about 1.2 billion years', 'približne 1,2 miliardy rokov'],
    ['Ca-41', { value: 9.94e4, unit: 'y' }, 'about 99,000 years', `približne 99${NBSP}000 rokov`],
    ['Ca-45', { value: 162.61, unit: 'd' }, 'about 160 days', 'približne 160 dní'],
    ['Ca-47', { value: 4.536, unit: 'd' }, 'about 4.5 days', 'približne 4,5 dňa'],
    ['Ca-48', { value: 5.6e19, unit: 'y' }, 'about 56 billion billion years', 'približne 56 miliárd miliárd rokov'],
  ];

  it.each(cases)('%s', (_name, halfLife, english, slovak) => {
    expect(en.halfLife(halfLife)).toBe(english);
    expect(sk.halfLife(halfLife)).toBe(slovak);
  });

  it('uses the data for every nuclide in the table above', () => {
    for (const [name, halfLife] of cases) {
      const [symbol, a] = name.split('-');
      const z = ELEMENTS.findIndex((el) => el.symbol === symbol) + 1;
      expect(RADIOACTIVE[z]?.[Number(a)], name).toEqual(halfLife);
    }
  });

  it('agrees singular and plural forms in both languages', () => {
    expect([1, 3, 5].map((value) => en.halfLife({ value, unit: 'y' }))).toEqual(['about 1 year', 'about 3 years', 'about 5 years']);
    expect([1, 3, 5].map((value) => sk.halfLife({ value, unit: 'y' }))).toEqual(['približne 1 rok', 'približne 3 roky', 'približne 5 rokov']);
    expect([1, 3, 5].map((value) => sk.halfLife({ value, unit: 'd' }))).toEqual(['približne 1 deň', 'približne 3 dni', 'približne 5 dní']);
    expect([2e6, 5e6].map((value) => sk.halfLife({ value, unit: 'y' }))).toEqual(['približne 2 milióny rokov', 'približne 5 miliónov rokov']);
    expect(sk.halfLife({ value: 1e9, unit: 'y' })).toBe('približne 1 miliarda rokov');
  });

  it('rounds to two significant figures and picks a word for big numbers', () => {
    expect(halfLifeParts({ value: 1.387e6, unit: 'y' })).toEqual({ amount: 1.4, scale: 'million' });
    expect(halfLifeParts({ value: 5.6e19, unit: 'y' })).toEqual({ amount: 56, scale: 'billion-billion' });
    expect(halfLifeParts({ value: 162.61, unit: 'd' })).toEqual({ amount: 160, scale: 'day' });
  });

  it('adds that calcium-48 lasts far longer than the universe has existed', () => {
    expect(en.readouts(view(atom(20, 28, 20))).isotope.detail).toContain('That is far longer than the universe has existed.');
    expect(sk.readouts(view(atom(20, 28, 20))).isotope.detail).toContain('To je oveľa dlhšie, ako existuje vesmír.');
  });
});

describe('atom lab: ions', () => {
  it('writes charges as superscripts', () => {
    expect([['Na', 1], ['Mg', 2], ['O', -2], ['Cl', -1], ['N', -3], ['Ca', 10], ['C', 0]].map(([symbol, q]) => ionNotation(symbol as string, q as number))).toEqual([
      'Na⁺', 'Mg²⁺', 'O²⁻', 'Cl⁻', 'N³⁻', 'Ca¹⁰⁺', 'C',
    ]);
  });

  it('tells common ions from unusual ones, and names the special cases', () => {
    expect(chargeKind(atom(1, 0, 0))).toBe('common'); // H⁺, a bare proton
    expect(chargeKind(atom(2, 2, 0))).toBe('alpha');
    expect(chargeKind(atom(6, 6, 0))).toBe('bare');
    expect(chargeKind(atom(11, 12, 9))).toBe('uncommon');
    expect(chargeKind(atom(6, 6, 20))).toBe('overloaded');
    expect(chargeKind(atom(0, 2, 0))).toBe('none');
    expect(chargeKind(atom(0, 0, 3))).toBe('loose');
  });

  it('says what an element usually does instead of an unusual ion', () => {
    expect(en.readouts(view(atom(11, 12, 9))).charge.detail).toBe('2 electrons fewer than protons. Not a common ion: sodium usually forms Na⁺.');
    expect(en.readouts(view(atom(1, 0, 3))).charge.detail).toBe('2 electrons more than protons. Not a common ion: hydrogen usually forms H⁺ or H⁻.');
    expect(en.readouts(view(atom(6, 6, 7))).charge.detail).toBe('1 electron more than protons. Not a common ion: carbon usually shares electrons instead.');
    expect(en.readouts(view(atom(10, 10, 9))).charge.detail).toBe('1 electron fewer than protons. Not a common ion: neon hardly ever forms ions.');
    expect(sk.readouts(view(atom(11, 12, 9))).charge.detail).toBe('Elektrónov je o 2 menej ako protónov. Nie je to bežný ión: sodík zvyčajne tvorí Na⁺.');
    expect(en.readouts(view(atom(1, 0, 0))).charge.detail).toBe('1 electron fewer than protons. A common ion: a bare proton.');
    expect(en.readouts(view(atom(2, 2, 0))).charge.detail).toContain('alpha particle');
  });
});

describe('atom lab: quests', () => {
  const ids = (set: QuestSet) => QUESTS[set].map((quest) => quest.id);

  it('has seven quests in each set, in the planned order', () => {
    expect(ids('atoms')).toEqual(['hydrogen', 'helium-4', 'carbon-12', 'nitrogen-14', 'oxygen-16', 'noble-gas', 'calcium-40']);
    expect(ids('isotopes')).toEqual(['hydrogen-1', 'deuterium', 'tritium', 'carbon-12', 'carbon-14', 'falls-apart', 'potassium-40']);
    expect(ids('ions')).toEqual(['sodium-ion', 'chloride-ion', 'magnesium-ion', 'oxide-ion', 'hydrogen-ion', 'calcium-ion', 'noble-shell']);
  });

  it('starts from carbon-12, or from a neutral sodium-23 atom for ions', () => {
    expect(START.atoms).toEqual(atom(6, 6, 6));
    expect(START.isotopes).toEqual(atom(6, 6, 6));
    expect(START.ions).toEqual(atom(11, 12, 11));
    expect(questsMet('ions', START.ions)).toEqual([]);
  });

  it('completes each atom quest with the right neutral atom only', () => {
    expect(questsMet('atoms', atom(1, 0, 1))).toEqual(['hydrogen']);
    expect(questsMet('atoms', atom(1, 1, 1))).toEqual(['hydrogen']);
    expect(questsMet('atoms', atom(1, 0, 0))).toEqual([]); // an ion, not an atom
    expect(questsMet('atoms', atom(1, 3, 1))).toEqual([]); // hydrogen-4 does not hold together
    expect(questsMet('atoms', atom(2, 2, 2))).toEqual(['helium-4', 'noble-gas']);
    expect(questsMet('atoms', atom(2, 0, 2))).toEqual([]);
    expect(questsMet('atoms', atom(7, 7, 7))).toEqual(['nitrogen-14']);
    expect(questsMet('atoms', atom(8, 8, 8))).toEqual(['oxygen-16']);
    expect(questsMet('atoms', atom(18, 22, 18))).toEqual(['noble-gas']);
    expect(questsMet('atoms', atom(20, 20, 20))).toEqual(['calcium-40']);
    expect(questsMet('atoms', atom(20, 20, 18))).toEqual([]);
  });

  it('completes isotope quests by the nucleus alone', () => {
    expect(questsMet('isotopes', atom(1, 0, 0))).toEqual(['hydrogen-1']);
    expect(questsMet('isotopes', atom(1, 1, 1))).toEqual(['deuterium']);
    expect(questsMet('isotopes', atom(1, 2, 1))).toEqual(['tritium']);
    expect(questsMet('isotopes', atom(6, 8, 6))).toEqual(['carbon-14']);
    expect(questsMet('isotopes', atom(2, 0, 2))).toEqual(['falls-apart']);
    expect(questsMet('isotopes', atom(0, 2, 0))).toEqual([]); // not a nucleus at all
    expect(questsMet('isotopes', atom(19, 21, 19))).toEqual(['potassium-40']);
  });

  it('completes ion quests by the charge', () => {
    expect(questsMet('ions', atom(11, 12, 10))).toEqual(['sodium-ion', 'noble-shell']);
    expect(questsMet('ions', atom(17, 18, 18))).toEqual(['chloride-ion', 'noble-shell']);
    expect(questsMet('ions', atom(12, 12, 10))).toEqual(['magnesium-ion', 'noble-shell']);
    expect(questsMet('ions', atom(8, 8, 10))).toEqual(['oxide-ion', 'noble-shell']);
    expect(questsMet('ions', atom(1, 0, 0))).toEqual(['hydrogen-ion']);
    expect(questsMet('ions', atom(1, 1, 0))).toEqual([]); // a deuteron is not a bare proton
    expect(questsMet('ions', atom(20, 20, 18))).toEqual(['calcium-ion', 'noble-shell']);
    expect(questsMet('ions', atom(1, 0, 2))).toEqual(['noble-shell']); // H⁻ has helium's two electrons
    expect(questsMet('ions', atom(10, 10, 10))).toEqual([]); // neon itself is not an ion
  });

  it('reports only the quests a new atom completes, once each, in list order', () => {
    expect(newlyDone('ions', [], atom(11, 12, 10))).toEqual(['sodium-ion', 'noble-shell']);
    expect(newlyDone('ions', ['noble-shell'], atom(11, 12, 10))).toEqual(['sodium-ion']);
    expect(newlyDone('ions', ['sodium-ion', 'noble-shell'], atom(11, 12, 10))).toEqual([]);
    expect(newlyDone('atoms', [], atom(4, 4, 4))).toEqual([]);
  });

  it('collects an element once its nucleus lasts, as an atom or an ion', () => {
    expect(collect([], atom(6, 6, 6))).toEqual([6]);
    expect(collect([6], atom(6, 8, 7))).toEqual([6]);
    expect(collect([6], atom(11, 12, 10))).toEqual([6, 11]);
    expect(collect([6], atom(2, 0, 2))).toEqual([6]); // helium-2 falls apart: not built
    expect(collect([6], atom(0, 1, 0))).toEqual([6]);
  });

  it('has a label for every quest in both languages', () => {
    for (const set of ['atoms', 'isotopes', 'ions'] as const) {
      for (const id of ids(set)) {
        expect(en.quests[id], id).toBeTruthy();
        expect(sk.quests[id], id).toBeTruthy();
      }
    }
  });
});

describe('atom lab: drawing the nucleus', () => {
  it('packs every proton and neutron, mixed, around the centre', () => {
    const layout = nucleusLayout(6, 8, 6);
    expect(layout).toHaveLength(14);
    expect(layout.filter((p) => p.proton)).toHaveLength(6);
    const cx = layout.reduce((sum, p) => sum + p.x, 0) / layout.length;
    const cy = layout.reduce((sum, p) => sum + p.y, 0) / layout.length;
    expect(cx).toBeCloseTo(0);
    expect(cy).toBeCloseTo(0);
  });

  it('keeps the particles already there when a neutron is added', () => {
    const before = nucleusLayout(6, 6, 6);
    const after = nucleusLayout(6, 7, 6);
    // The same kinds in the same spiral places; only the centre shifts a little.
    expect(after.slice(0, 12).map((p) => p.proton)).toEqual(before.map((p) => p.proton));
  });
});

describe('atom lab: the first frame, before JS', () => {
  const frame = (lang: LangCode, quests?: QuestSet) => parse(render(AtomLab, { props: { lang, quests } }).body);
  const count = (html: ReturnType<typeof frame>, selector: string) => html.querySelectorAll(selector).length;

  it('draws carbon-12: 6 protons, 6 neutrons, 2 + 4 electrons and 4 empty places', () => {
    const html = frame('en');
    expect(html.querySelector('svg')?.getAttribute('aria-label')).toBe(en.picture(view(START.atoms)));
    expect(count(html, 'svg .particle.d-positive')).toBe(6);
    expect(count(html, 'svg .particle.d-muted')).toBe(6);
    expect(count(html, 'svg circle.d-electron')).toBe(6);
    expect(count(html, 'svg .seat')).toBe(4);
    expect(html.querySelector('svg .name')?.text).toBe('Carbon-12');
    expect(html.querySelector('.readouts')?.text).toContain('Carbon (C)');
  });

  it('starts the ion quests from a neutral sodium-23 atom', () => {
    const html = frame('en', 'ions');
    expect(html.querySelector('svg')?.getAttribute('aria-label')).toMatch(/^Sodium-23\. /);
    expect(count(html, 'svg .particle.d-positive')).toBe(11);
    expect(count(html, 'svg circle.d-electron')).toBe(11);
    expect(count(html, 'svg .seat')).toBe(7);
  });

  it('speaks Slovak', () => {
    const html = frame('sk', 'isotopes');
    expect(html.querySelector('svg')?.getAttribute('aria-label')).toMatch(/^Uhlík-12\. /);
    expect(html.querySelector('.readouts')?.text).toContain('Uhlík (C)');
  });

  it('shows the element table with the start element marked, and no quest done yet', () => {
    const html = frame('en');
    const cells = html.querySelectorAll('.cell');
    expect(cells.map((cell) => cell.getAttribute('aria-label'))).toHaveLength(20);
    expect(cells[5]?.getAttribute('aria-label')).toBe('C, Carbon');
    expect(html.querySelectorAll('.cell[aria-current="true"]').map((cell) => cell.text)).toEqual(['6C']);
    expect(html.querySelectorAll('.quest').map((quest) => quest.text.trim())).toEqual(QUESTS.atoms.map((quest) => en.quests[quest.id]));
    expect(html.querySelectorAll('.quest .tick').map((tick) => tick.getAttribute('aria-label'))).toEqual(Array(7).fill('Not done yet'));
    expect(html.querySelector('.progress')?.text).toBe('0 of 7 done');
    expect(html.querySelector('.collection')?.text).toBe('Elements built: 0 of 20');
    // Nothing celebrates before the reader has built anything.
    expect(html.querySelector('.toast')).toBeNull();
    expect(html.querySelector('.burst-ring')).toBeNull();
  });

  it('lists the ion quests, with sodium marked in the table', () => {
    const html = frame('sk', 'ions');
    expect(html.querySelector('.cell[aria-current="true"]')?.getAttribute('aria-label')).toBe('Na, Sodík');
    expect(html.querySelector('.quest')?.text.trim()).toBe('Na⁺ ako v kuchynskej soli');
    expect(html.querySelector('.progress')?.text).toBe('Splnené: 0 zo 7');
  });

  it('shows the counts, with every button inert until the widget is live', () => {
    const html = frame('en');
    expect(html.querySelectorAll('.count').map((el) => el.text)).toEqual(['6', '6', '6']);
    const buttons = html.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(6);
    expect(buttons.filter((button) => !button.hasAttribute('disabled'))).toEqual([]);
  });
});
