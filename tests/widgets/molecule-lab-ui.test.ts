import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { LANG_CODES } from '../../src/i18n/languages.ts';
import { BOND_HIT, DARK_INK, HIT } from '../../src/widgets/molecule-lab/layout.ts';
import MoleculeLab from '../../src/widgets/molecule-lab/MoleculeLab.svelte';
import { buildBoard, ELEMENTS, moleculeShape, transfer } from '../../src/widgets/molecule-lab/model.ts';
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
    expect(en.centres(shape.centres)).toBe('carbon: triangular pyramid (tetrahedron) and flat triangle; oxygen: bent, like a V');
    expect(sk.centres(shape.centres)).toBe('uhlík: trojboký ihlan (štvorsten) a plochý trojuholník; kyslík: lomená čiara, ako písmeno V');
  });

  it('names shapes as the chemical-bond article does: methane is a triangular pyramid, ammonia a low one', () => {
    const shapeOf = (id: string) => {
      const molecule = MOLECULES.find((m) => m.id === id)!;
      const board = buildBoard(molecule.atoms, molecule.bonds);
      const shape = moleculeShape(board, board.atoms.map((atom) => atom.id));
      if (shape.kind !== 'centres') throw new Error(shape.kind);
      return shape.centres[0]!.shape;
    };
    expect([en.shapes[shapeOf('methane')], sk.shapes[shapeOf('methane')]]).toEqual(['triangular pyramid (tetrahedron)', 'trojboký ihlan (štvorsten)']);
    expect([en.shapes[shapeOf('ammonia')], sk.shapes[shapeOf('ammonia')]]).toEqual(['low pyramid, like a tripod', 'nízky ihlan, podobný statívu']);
    // Slovak school books call a pyramid "ihlan".
    expect(Object.values(sk.shapes).filter((text) => /pyram/i.test(text))).toEqual([]);
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

  it('explains in the hint how to pick, raise a bond and loosen it, and keeps the keys', () => {
    expect(en.hint).toBe(
      'Pick two atoms to join them. Pick the second one again for a double bond. Pick a bond to loosen it. Keys: Tab to move, Enter to pick, Delete to remove, Escape to let go.',
    );
    expect(sk.hint).toBe(
      'Vyber dva atómy a spoja sa. Vyber druhý atóm znova a vznikne dvojitá väzba. Vyber väzbu a uvoľníš ju. Klávesy: Tab – presun, Enter – výber, Delete – odstránenie, Escape – zrušenie výberu.',
    );
  });

  it('says after a join that the first atom is still picked, and what picking the second one again does', () => {
    expect(en.stillPicked('C', 'O', 2)).toBe('Carbon is still picked. Pick the oxygen again for a double bond.');
    expect(sk.stillPicked('C', 'O', 2)).toBe('Atóm uhlíka zostáva vybraný. Vyber znova kyslík a vznikne dvojitá väzba.');
    expect(sk.stillPicked('C', 'S', 2)).toBe('Atóm uhlíka zostáva vybraný. Vyber znova síru a vznikne dvojitá väzba.');
    expect(en.stillPicked('N', 'N', 3)).toBe('The first nitrogen is still picked. Pick the second one again for a triple bond.');
    expect(sk.stillPicked('N', 'N', 3)).toBe('Prvý atóm dusíka zostáva vybraný. Vyber znova druhý a vznikne trojitá väzba.');
    expect(en.stillPicked('C', 'H', null)).toBe('Carbon is still picked. Pick another atom to join to it.');
    expect(sk.stillPicked('Mg', 'Cl', null)).toBe('Atóm horčíka zostáva vybraný. Vyber ďalší atóm, s ktorým sa spojí.');
  });

  it('says which atom is picked after a refusal', () => {
    expect(en.pickedInstead('Na')).toBe('Now sodium is picked.');
    expect(sk.pickedInstead('S')).toBe('Teraz je vybraný atóm síry.');
  });

  it('keeps numbers with their units and percent signs on one line (non-breaking spaces)', () => {
    const NBSP = ' ';
    for (const lang of LANG_CODES) {
      const texts = Object.values(strings[lang].molecules).flatMap((m) => [m.name, m.fact]);
      expect(texts.filter((text) => /\d (%|°C)|\d \d{3}\b/.test(text)), lang).toEqual([]);
    }
    expect(en.molecules.hcn.fact).toContain(`26${NBSP}°C`);
    expect(en.molecules.ethyne.fact).toContain(`3,000${NBSP}°C`);
    expect(sk.molecules.n2.fact).toContain(`78${NBSP}%`);
    expect(sk.molecules.hcn.fact).toContain(`26${NBSP}°C`);
    expect(sk.molecules.ethyne.fact).toContain(`3${NBSP}000${NBSP}°C`);
  });

  it('uses the glossary’s Slovak words: sodné ióny, sóda bikarbóna', () => {
    expect(sk.molecules.nacl.fact).toContain('sodné a chloridové ióny');
    expect(sk.molecules.bakingSoda.name).toBe('Sóda bikarbóna (hydrogenuhličitan sodný)');
    expect(JSON.stringify(sk.molecules)).not.toMatch(/sodíkov|Jedlá sóda/);
  });

  it('tells how chemists keep safe with burning magnesium, instead of telling a child not to look', () => {
    expect(en.molecules.mgo.fact).toBe(
      'Burning magnesium gives a dazzling white light and leaves this white powder behind. Chemists burn it only behind a safety screen, and water cannot put it out.',
    );
    expect(sk.molecules.mgo.fact).toBe(
      'Horčík horí oslnivo bielym svetlom a zostane po ňom tento biely prášok. Chemici ho zapaľujú iba za ochranným štítom a voda ho neuhasí.',
    );
  });

  it('says that sulfur’s two bonds are this lab’s rule (real sulfur makes more, as in SF₆)', () => {
    expect(en.refused({ reason: 'full', el: 'S' })).toBe('In this lab, sulfur makes only two bonds, and this sulfur atom has no free bonds left.');
    expect(sk.refused({ reason: 'full', el: 'S' })).toBe('V tomto laboratóriu tvorí síra iba dve väzby a tento atóm síry už nemá voľnú väzbu.');
    expect(en.refused({ reason: 'full', el: 'O' })).toBe('This oxygen atom has no free bonds left.');
  });

  it('calls atoms ions only once they have given or taken all they will: no Mg⁺ or O⁻ halfway', () => {
    const said = (atoms: string, bonds: string, link: number, electrons = 1) => {
      const board = buildBoard(atoms, bonds);
      const t = transfer(board, board.links[link]!, electrons);
      return [en.gave(t), sk.gave(t)];
    };
    expect(said('Na Cl', '0>1', 0)).toEqual([
      'An electron jumped from sodium to chlorine. Now they are ions, Na⁺ and Cl⁻, and they attract each other.',
      'Elektrón preskočil zo sodíka na chlór. Teraz sú to ióny Na⁺ a Cl⁻ a navzájom sa priťahujú.',
    ]);
    // Magnesium chloride, halfway: magnesium has one more electron to give.
    expect(said('Mg Cl Cl', '0>1', 0)).toEqual([
      'An electron jumped from magnesium to chlorine. Chlorine is now an ion, Cl⁻. Magnesium has given 1 of its 2 outer electrons and can give 1 more.',
      'Elektrón preskočil z horčíka na chlór. Chlór je teraz ión Cl⁻. Atóm horčíka odovzdal 1 z 2 vonkajších elektrónov a môže dať ešte 1.',
    ]);
    expect(said('Mg Cl Cl', '0>1 0>2', 1)).toEqual([
      'An electron jumped from magnesium to chlorine. Now they are ions, Mg²⁺ and Cl⁻, and they attract each other.',
      'Elektrón preskočil z horčíka na chlór. Teraz sú to ióny Mg²⁺ a Cl⁻ a navzájom sa priťahujú.',
    ]);
    // Sodium oxide, halfway: oxygen has room for one more electron.
    expect(said('Na Na O', '0>2', 0)).toEqual([
      'An electron jumped from sodium to oxygen. Sodium is now an ion, Na⁺. Oxygen has taken 1 electron and has room for 1 more.',
      'Elektrón preskočil zo sodíka na kyslík. Sodík je teraz ión Na⁺. Atóm kyslíka prijal 1 elektrón a zmestí sa doň ešte 1.',
    ]);
    // Nitrogen takes two from magnesium and has room for one more.
    expect(said('Mg N', '0>1', 0, 2)).toEqual([
      '2 electrons jumped from magnesium to nitrogen. Magnesium is now an ion, Mg²⁺. Nitrogen has taken 2 electrons and has room for 1 more.',
      '2 elektróny preskočili z horčíka na dusík. Horčík je teraz ión Mg²⁺. Atóm dusíka prijal 2 elektróny a zmestí sa doň ešte 1.',
    ]);
    expect(sk.gave(transfer(buildBoard('Na N', '0>1'), { a: 0, b: 1, order: 1, ionic: true }, 1))).toBe(
      'Elektrón preskočil zo sodíka na dusík. Sodík je teraz ión Na⁺. Atóm dusíka prijal 1 elektrón a zmestia sa doň ešte 2.',
    );
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

    it(`describes the scene without JS, and asks for picks only once the lab works (${lang})`, () => {
      const html = parse(render(MoleculeLab, { props: { lang } }).body);
      const s = strings[lang];
      expect(html.querySelector('.status')!.text).toBe(s.scene);
      expect(html.text).not.toContain(s.welcome);
    });
  }

  it('words the first frame: a scene before JS, an invitation after', () => {
    expect(strings.en.scene).toBe('Water is ready. A carbon atom and four hydrogen atoms are waiting to become methane.');
    expect(strings.sk.scene).toBe('Voda je hotová. Atóm uhlíka a štyri atómy vodíka čakajú, kým z nich vznikne metán.');
    expect(strings.en.welcome).toBe('Water is ready. Now pick the carbon, then each hydrogen, to make methane.');
  });

  it('lists the atoms before the bonds, and puts the bonds’ tap bands in a layer under the atoms', () => {
    const html = parse(render(MoleculeLab, { props: { lang: 'en' } }).body);
    const board = html.querySelector('.board')!;
    expect(board.getAttribute('role')).toBe('group');
    const [atoms, bonds] = board.querySelectorAll('svg');
    // CSS paints the first layer on top (z-index), so a tap on an atom always reaches the atom.
    expect(atoms!.classList.contains('atoms-layer')).toBe(true);
    expect(atoms!.querySelectorAll('g.atom')).toHaveLength(8);
    expect(atoms!.querySelectorAll('g.atom circle.hit').every((hit) => hit.getAttribute('r') === String(HIT))).toBe(true);
    expect(atoms!.querySelector('.bond-hit')).toBeNull();
    expect(bonds!.getAttribute('viewBox')).toBe(atoms!.getAttribute('viewBox'));
    const hits = bonds!.querySelectorAll('line.bond-hit');
    expect(hits).toHaveLength(2);
    // Each band runs from the oxygen's centre to a hydrogen's, as wide as the atoms' tap circles.
    const centre = (id: number) => /translate\(([-\d.]+) ([-\d.]+)\)/.exec(atoms!.querySelector(`g.atom[data-id="${id}"]`)!.getAttribute('transform')!)!.slice(1);
    for (const [i, line] of hits.entries()) {
      expect(line.getAttribute('stroke-width')).toBe(String(BOND_HIT));
      expect([line.getAttribute('x1'), line.getAttribute('y1')]).toEqual(centre(0));
      expect([line.getAttribute('x2'), line.getAttribute('y2')]).toEqual(centre(i + 1));
    }
  });
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
