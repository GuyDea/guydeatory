import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Quiz from '../src/components/content/Quiz.astro';
import { DICTIONARIES } from '../src/i18n/t.ts';
import { DASH, EM_DASH, EN_DASH_LANGS, findEmDashes } from '../src/lib/content/typography.ts';

/** Every string inside `value`: nested objects, arrays, plural forms, and the source of string builders. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  // A function's source holds every text it can return; the transform may have escaped the dash.
  if (typeof value === 'function') return [value.toString().replace(/\\u2014/gi, EM_DASH)];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

const withEmDash = (texts: string[]) => texts.filter((text) => text.includes(EM_DASH));

/** Strings of language `lang` in a widget's `strings.ts` module: every export shaped `{ en, sk, … }`. */
function widgetStrings(module: Record<string, unknown>, lang: string): string[] {
  return Object.values(module).flatMap((value) =>
    value && typeof value === 'object' && lang in value ? strings((value as Record<string, unknown>)[lang]) : [],
  );
}

const WIDGET_STRINGS = import.meta.glob<Record<string, unknown>>('../src/widgets/**/strings.ts', { eager: true });
// Diagrams shared by both languages hold their labels and descriptions per language.
const DIAGRAMS = import.meta.glob<Parameters<AstroContainer['renderToString']>[0]>('../content/articles/*/diagrams/*.astro', {
  eager: true,
  import: 'default',
});

describe('dashes', () => {
  it('Slovak uses the spaced en dash; English keeps the em dash', () => {
    expect(DASH.en).toBe(EM_DASH);
    expect(DASH.sk).toBe('–');
    expect(EN_DASH_LANGS).toEqual(['sk']);
  });

  it.each(EN_DASH_LANGS)('the %s UI dictionary has no em dash', (lang) => {
    expect(withEmDash(strings(DICTIONARIES[lang]))).toEqual([]);
  });

  it.each(EN_DASH_LANGS)('no widget’s %s strings have an em dash', (lang) => {
    const files = Object.keys(WIDGET_STRINGS);
    expect(files.length, 'the glob finds the widget strings').toBeGreaterThanOrEqual(8);
    const found = Object.entries(WIDGET_STRINGS).flatMap(([file, module]) =>
      withEmDash(widgetStrings(module, lang)).map((text) => `${file}: ${text}`),
    );
    expect(found).toEqual([]);
  });

  it.each(EN_DASH_LANGS)('no article diagram has an em dash in its %s text', async (lang) => {
    const container = await AstroContainer.create();
    const files = Object.keys(DIAGRAMS);
    expect(files.length, 'the glob finds the diagrams').toBeGreaterThanOrEqual(10);
    const found: string[] = [];
    for (const [file, diagram] of Object.entries(DIAGRAMS)) {
      const html = await container.renderToString(diagram, { props: { lang } });
      found.push(...findEmDashes(html).map(({ excerpt }) => `${file}: ${excerpt}`));
    }
    expect(found).toEqual([]);
  });

  it.each(['en', 'sk'] as const)('the quiz joins the answer and its explanation with the %s dash', async (lang) => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Quiz, {
      props: { lang, question: 'Q?', options: ['A', 'B'], answer: 1, explanation: 'Because.' },
    });
    const reveal = /<details class="quiz-reveal"[\s\S]*?<\/details>/.exec(html)?.[0] ?? '';
    const answer = /<p[^>]*><strong[^>]*>B<\/strong>(.*?)<\/p>/.exec(reveal)?.[1];
    expect(answer).toBe(` ${DASH[lang]} Because.`);
  });

  it('the widget check sees plain strings, nested ones and text built by functions', () => {
    const module = {
      strings: {
        en: { ok: 'English — keeps it' },
        sk: { plain: 'jeden — dva', list: ['a', 'b — c'], nested: { deep: 'x — y' }, built: (n: number) => `${n} — kusov` },
      },
    };
    expect(withEmDash(widgetStrings(module, 'sk'))).toHaveLength(4);
    expect(withEmDash(widgetStrings(module, 'en'))).toHaveLength(1);
  });
});

describe('findEmDashes', () => {
  it('finds each em dash with its line and a short excerpt, cut at whole words', () => {
    const source = [
      'Prvý riadok.',
      'Klimatizácie fungujú presne rovnako — len pre celý dom.',
      'A ešte — raz.',
      'Dlhý úvod pred pomlčkou—a hneď za ňou pokračuje veta ďalej a ďalej.',
    ].join('\n');
    expect(findEmDashes(source)).toEqual([
      { line: 2, excerpt: '…presne rovnako — len pre celý dom.' },
      { line: 3, excerpt: 'A ešte — raz.' },
      { line: 4, excerpt: '…úvod pred pomlčkou—a hneď za ňou…' },
    ]);
  });

  it('ignores code, and en dashes', () => {
    const source = ['Text – s pomlčkou, 3–4 jednotky.', '`kód — tu`', '```', 'blok — kódu', '```', 'Koniec — tu.'].join('\n');
    expect(findEmDashes(source).map((dash) => dash.line)).toEqual([6]);
  });
});
