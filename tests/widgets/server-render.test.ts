import { readdirSync } from 'node:fs';
import { parse } from 'node-html-parser';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { LANG_CODES } from '../../src/i18n/languages.ts';
import type { LangCode } from '../../src/i18n/languages.ts';
import AcDc from '../../src/widgets/ac-dc/AcDc.svelte';
import Toggle from '../../src/widgets/kit/Toggle.svelte';
import { strings as acDcStrings } from '../../src/widgets/ac-dc/strings.ts';
import SeriesParallel from '../../src/widgets/series-parallel/SeriesParallel.svelte';
import { strings as seriesParallelStrings } from '../../src/widgets/series-parallel/strings.ts';

/** Every widget component, src/widgets/<name>/<Name>.svelte. The kit holds parts, not widgets. */
const modules = import.meta.glob<{ default: Component<{ lang: LangCode }> }>(
  ['../../src/widgets/*/*.svelte', '!../../src/widgets/kit/*.svelte'],
  { eager: true },
);
const widgets = Object.entries(modules).map(([path, module]) => ({ name: path.split('/').at(-2)!, component: module.default }));

const widgetFolders = readdirSync(new URL('../../src/widgets/', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'kit')
  .map((entry) => entry.name);

const serverRender = (component: Component<{ lang: LangCode }>, lang: LangCode) =>
  parse(render(component, { props: { lang } }).body);

describe('widgets before hydration (the server render)', () => {
  it('covers every widget folder', () => {
    expect(widgets.map((w) => w.name).sort()).toEqual([...widgetFolders].sort());
  });

  for (const { name, component } of widgets) {
    for (const lang of LANG_CODES) {
      describe(`${name} (${lang})`, () => {
        const html = serverRender(component, lang);

        it('renders a real first frame', () => {
          expect(html.querySelector(`[data-widget="${name}"]`)).not.toBeNull();
          expect(html.querySelector('svg')).not.toBeNull();
        });

        it('has no enabled buttons or form controls, because they do nothing without JS', () => {
          const live = html
            .querySelectorAll('button, input, select, textarea')
            .filter((control) => !control.hasAttribute('disabled'))
            .map((control) => control.outerHTML);
          expect(live).toEqual([]);
        });

        it('has no drawing that can be focused or poses as a button', () => {
          const focusable = html
            .querySelectorAll('[tabindex]')
            .filter((el) => Number(el.getAttribute('tabindex')) >= 0)
            .map((el) => el.outerHTML.slice(0, 120));
          expect(focusable).toEqual([]);
          expect(html.querySelectorAll('[role="button"]').map((el) => el.outerHTML.slice(0, 120))).toEqual([]);
        });
      });
    }
  }
});

describe('the same HTML on every build (and a radio name that hydration keeps)', () => {
  const toggleProps = { label: 'Kind of current', options: [{ value: 'dc', label: 'DC' }, { value: 'ac', label: 'AC' }], value: 'ac' };

  it('renders a Toggle the same way twice', () => {
    expect(render(Toggle, { props: toggleProps }).body).toBe(render(Toggle, { props: toggleProps }).body);
  });

  it('gives each Toggle on a page its own radio group', () => {
    const html = serverRender(SeriesParallel, 'en');
    const names = new Set(html.querySelectorAll('input[type="radio"]').map((radio) => radio.getAttribute('name')));
    expect(names.size).toBe(html.querySelectorAll('fieldset').length);
  });

  for (const { name, component } of widgets) {
    it(`renders ${name} the same way twice`, () => {
      expect(render(component, { props: { lang: 'en' } }).body).toBe(render(component, { props: { lang: 'en' } }).body);
    });
  }
});

describe('AcDc first frame (all that shows with reduced motion or without JS)', () => {
  for (const lang of LANG_CODES) {
    it(`shows alternating current flowing, with an arrow (${lang})`, () => {
      const html = serverRender(AcDc, lang);
      const [forward, stopped] = acDcStrings[lang].direction;
      expect(html.querySelector('input[value="ac"]')?.hasAttribute('checked')).toBe(true);
      expect(html.querySelector('path.d-arrow-accent')).not.toBeNull();
      expect(html.text).toContain(forward);
      expect(html.text).not.toContain(stopped);
    });
  }
});

describe('SeriesParallel first frame', () => {
  for (const lang of LANG_CODES) {
    it(`offers two or three bulbs and starts with three (${lang})`, () => {
      const html = serverRender(SeriesParallel, lang);
      const s = seriesParallelStrings[lang];
      const choice = html.querySelectorAll('fieldset').find((set) => set.querySelector('legend')?.text === s.count);
      expect(choice, 'a "how many bulbs" choice').toBeDefined();
      const options = choice!.querySelectorAll('input').map((input) => `${input.getAttribute('value')}${input.hasAttribute('checked') ? ' (chosen)' : ''}`);
      expect(options).toEqual(['2', '3 (chosen)']);
      expect(choice!.text).toContain(s.bulbs(2));
      expect(choice!.text).toContain(s.bulbs(3));
      expect(html.querySelectorAll('g.bulb')).toHaveLength(3);
    });
  }
});
