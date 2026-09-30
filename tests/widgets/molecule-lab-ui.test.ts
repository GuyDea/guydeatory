import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { LANG_CODES } from '../../src/i18n/languages.ts';
import { DARK_INK } from '../../src/widgets/molecule-lab/layout.ts';
import MoleculeLab from '../../src/widgets/molecule-lab/MoleculeLab.svelte';
import { buildBoard, ELEMENTS, moleculeShape } from '../../src/widgets/molecule-lab/model.ts';
import { INITIAL, MOLECULES, QUESTS, report } from '../../src/widgets/molecule-lab/molecules.ts';
import { strings } from '../../src/widgets/molecule-lab/strings.ts';

describe('MoleculeLab strings', () => {
  const { en, sk } = strings;

  it('sums up the first frame for screen readers', () => {
    const first = report(INITIAL.board);
    expect(en.summary(first)).toBe('Water, H₂O, complete. Free: 1 carbon atom, 4 hydrogen atoms.');
    expect(sk.summary(first)).toBe('Voda, H₂O – hotovo. Voľné: 1 atóm uhlíka, 4 atómy vodíka.');
  });

  it('says what an unfinished molecule still needs', () => {
    const unfinished = report(buildBoard('C H H', '0-1 0-2'));
    expect(en.summary(unfinished)).toBe('CH₂, unfinished: carbon still has 2 free bonds.');
    expect(sk.summary(unfinished)).toBe('CH₂ – rozostavané: uhlík má ešte 2 voľné väzby.');
    const unnamed = report(buildBoard('N N H H H H', '0-1 0-2 0-3 1-4 1-5'));
    expect(en.summary(unnamed)).toBe('H₄N₂, complete.');
    expect(sk.summary(unnamed)).toBe('H₄N₂ – hotovo.');
    expect(en.summary(report(buildBoard('', '')))).toBe('The board is empty.');
    expect(sk.summary(report(buildBoard('', '')))).toBe('Plocha je prázdna.');
  });

  it('counts atoms the Slovak way: 1 atóm, 2 to 4 atómy, 5 atómov', () => {
    const free = report(buildBoard('H H H H H O O S', ''));
    expect(sk.summary(free)).toBe('Voľné: 5 atómov vodíka, 2 atómy kyslíka, 1 atóm síry.');
    expect(en.summary(free)).toBe('Free: 5 hydrogen atoms, 2 oxygen atoms, 1 sulfur atom.');
  });

  it('words each kind of hint', () => {
    expect(en.hintText({ kind: 'free', el: 'C', free: 1, metal: false })).toBe('carbon still has 1 free bond');
    expect(sk.hintText({ kind: 'free', el: 'C', free: 1, metal: false })).toBe('uhlík má ešte 1 voľnú väzbu');
    expect(sk.hintText({ kind: 'free', el: 'S', free: 2, metal: false })).toBe('síra má ešte 2 voľné väzby');
    expect(en.hintText({ kind: 'free', el: 'Mg', free: 1, metal: true })).toBe('magnesium can still give 1 electron');
    expect(sk.hintText({ kind: 'free', el: 'Mg', free: 2, metal: true })).toBe('horčík môže dať ešte 2 elektróny');
    expect(en.hintText({ kind: 'raise', a: 'C', b: 'O', order: 2 })).toBe(
      'carbon and oxygen could share one more pair: join them again for a double bond',
    );
    expect(sk.hintText({ kind: 'raise', a: 'C', b: 'O', order: 2 })).toBe(
      'medzi uhlíkom a kyslíkom môže vzniknúť dvojitá väzba – spoj ich ešte raz',
    );
    expect(sk.hintText({ kind: 'raise', a: 'N', b: 'N', order: 3 })).toBe(
      'medzi dusíkom a dusíkom môže vzniknúť trojitá väzba – spoj ich ešte raz',
    );
  });

  it('names each kind of centre once for a molecule with several: acetic acid', () => {
    const acid = MOLECULES.find((m) => m.id === 'aceticAcid')!;
    const board = buildBoard(acid.atoms, acid.bonds);
    const shape = moleculeShape(board, board.atoms.map((atom) => atom.id));
    if (shape.kind !== 'centres') throw new Error(shape.kind);
    expect(en.centres(shape.centres)).toBe('carbon: tetrahedron and flat triangle; oxygen: bent, like a V');
    expect(sk.centres(shape.centres)).toBe('uhlík: štvorsten a plochý trojuholník; kyslík: lomená čiara, ako písmeno V');
  });

  it('names every molecule, with a one-line fact, in every language', () => {
    for (const lang of LANG_CODES) {
      for (const molecule of MOLECULES) {
        const text = strings[lang].molecules[molecule.id];
        expect(text.name.length, `${lang} ${molecule.id}`).toBeGreaterThan(2);
        expect(text.fact.length, `${lang} ${molecule.id}`).toBeGreaterThan(20);
        expect(text.fact.length, `${lang} ${molecule.id} is one or two short lines`).toBeLessThan(170);
      }
      for (const quest of QUESTS) expect(strings[lang].quest[quest].length).toBeGreaterThan(5);
    }
  });

  it('explains every refusal', () => {
    for (const lang of LANG_CODES) {
      const s = strings[lang];
      expect(s.refused({ reason: 'same' })).toMatch(/.{20}/);
      expect(s.refused({ reason: 'metals' })).toMatch(/.{30}/);
      expect(s.refused({ reason: 'metal-carbon' })).toMatch(/.{30}/);
      expect(s.refused({ reason: 'full', el: 'O' })).toMatch(/.{15}/);
      expect(s.refused({ reason: 'full', el: 'Na' })).not.toBe(s.refused({ reason: 'full', el: 'O' }));
      expect(s.refused({ reason: 'max-order', el: 'H' })).toMatch(/.{15}/);
    }
  });
});

describe('MoleculeLab first frame (server render, and all there is without JS)', () => {
  for (const lang of LANG_CODES) {
    it(`shows finished water, one carbon and four hydrogens, and the goals (${lang})`, () => {
      const html = parse(render(MoleculeLab, { props: { lang } }).body);
      const s = strings[lang];
      expect(html.querySelectorAll('g.atom')).toHaveLength(8);
      expect(html.querySelectorAll('g.atom[data-el="C"]')).toHaveLength(1);
      expect(html.querySelectorAll('g.atom[data-el="H"]')).toHaveLength(6);
      expect(html.text).toContain(s.molecules.water.name);
      expect(html.text).toContain(s.summary(report(INITIAL.board)));
      expect(html.querySelectorAll('.quests li')).toHaveLength(QUESTS.length);
      expect(html.querySelectorAll('.quests li.done')).toHaveLength(1);
      expect(html.text).toContain(s.discovered(1, MOLECULES.length));
    });
  }
});

describe('MoleculeLab element colours (src/styles/tokens.css)', () => {
  const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');

  function block(selector: string): Record<string, string> {
    const start = css.indexOf(selector);
    const open = css.indexOf('{', start);
    const vars: Record<string, string> = {};
    for (const [, name, value] of css.slice(open + 1, css.indexOf('}', open)).matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars[name!] = value!.trim();
    return vars;
  }

  const light = block(':root {');
  const themes = {
    light,
    dark: { ...light, ...block(":root[data-theme='dark'] {") },
    'dark (system)': { ...light, ...block(":root:not([data-theme='light']) {") },
  };

  const resolve = (vars: Record<string, string>, name: string): string => {
    const value = vars[name];
    if (!value) throw new Error(`${name} is not defined`);
    const ref = /^var\((--[\w-]+)\)$/.exec(value);
    return ref ? resolve(vars, ref[1]!) : value;
  };

  function contrast(a: string, b: string): number {
    const luminance = (hex: string) => {
      const [r, g, bl] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
    };
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi! + 0.05) / (lo! + 0.05);
  }

  it('defines a colour for every element in the light block and in both dark blocks', () => {
    for (const selector of [':root {', ":root[data-theme='dark'] {", ":root:not([data-theme='light']) {"]) {
      const vars = block(selector);
      for (const el of ELEMENTS) expect(vars[`--d-el-${el.toLowerCase()}`], `${selector} ${el}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  for (const [theme, vars] of Object.entries(themes)) {
    it(`${theme}: each symbol is readable on its atom (WCAG AA, 4.5:1)`, () => {
      for (const el of ELEMENTS) {
        const ink = resolve(vars, DARK_INK.has(el) ? '--d-el-ink-dark' : '--d-el-ink-light');
        expect(contrast(ink, resolve(vars, `--d-el-${el.toLowerCase()}`)), el).toBeGreaterThanOrEqual(4.5);
      }
    });

    it(`${theme}: charge marks are readable as text and as badges`, () => {
      for (const mark of ['--d-el-plus', '--d-el-minus']) {
        for (const background of ['--d-fill', '--surface']) {
          expect(contrast(resolve(vars, mark), resolve(vars, background)), `${mark} on ${background}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(resolve(vars, '--d-fill'), resolve(vars, mark)), `sign on ${mark}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
