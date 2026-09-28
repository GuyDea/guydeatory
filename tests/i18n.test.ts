import { describe, expect, it } from 'vitest';
import { isLang, LANG_CODES } from '../src/i18n/languages.ts';
import { DICTIONARIES, t, tp } from '../src/i18n/t.ts';

describe('isLang', () => {
  it('accepts configured codes only, case-sensitively', () => {
    expect(isLang('sk')).toBe(true);
    expect(isLang('en')).toBe(true);
    expect(isLang('de')).toBe(false);
    expect(isLang('SK')).toBe(false);
    expect(isLang('')).toBe(false);
  });
});

describe('t', () => {
  it('returns the string in the requested language', () => {
    expect(t('en', 'nav.explore')).toBe('Explore');
    expect(t('sk', 'nav.explore')).toBe('Objavuj');
  });

  it('interpolates named variables', () => {
    expect(t('en', 'article.readingTime', { minutes: 4 })).toBe('4 min read');
    expect(t('sk', 'article.readingTime', { minutes: 4 })).toBe('4 min čítania');
  });

  it('leaves a placeholder visible when its variable is missing', () => {
    expect(t('en', 'article.readingTime')).toBe('{minutes} min read');
  });
});

describe('tp', () => {
  it('picks Slovak one / few / other forms', () => {
    expect(tp('sk', 'count.articles', 1)).toBe('1 článok');
    expect(tp('sk', 'count.articles', 3)).toBe('3 články');
    expect(tp('sk', 'count.articles', 5)).toBe('5 článkov');
    expect(tp('sk', 'count.articles', 0)).toBe('0 článkov');
  });

  it('picks English one / other forms', () => {
    expect(tp('en', 'count.articles', 1)).toBe('1 article');
    expect(tp('en', 'count.articles', 2)).toBe('2 articles');
  });

  it('formats large counts with the language grouping', () => {
    expect(tp('en', 'count.articles', 1200)).toBe('1,200 articles');
    expect(tp('sk', 'count.articles', 1200)).toBe('1 200 článkov');
  });
});

describe('dictionaries', () => {
  it('every language defines exactly the keys of the English dictionary', () => {
    const expected = Object.keys(DICTIONARIES.en).sort();
    for (const code of LANG_CODES) {
      expect(Object.keys(DICTIONARIES[code]).sort(), code).toEqual(expected);
    }
  });

  it('every plural entry defines each form its language uses for whole numbers', () => {
    for (const code of LANG_CODES) {
      const rules = new Intl.PluralRules(code);
      for (const [key, value] of Object.entries(DICTIONARIES[code])) {
        if (typeof value === 'string') continue;
        for (let n = 0; n <= 120; n++) {
          const category = rules.select(n) as keyof typeof value;
          expect(value[category], `${code} ${key} n=${n} (${category})`).toBeTypeOf('string');
        }
      }
    }
  });
});
