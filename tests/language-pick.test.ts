import { describe, expect, it } from 'vitest';
import { pickLanguage } from '../src/lib/language-pick.ts';

describe('pickLanguage', () => {
  it('prefers a valid lang cookie over the browser languages', () => {
    expect(pickLanguage({ cookie: 'theme=dark; lang=sk', accept: ['en-US'] })).toBe('sk');
  });

  it('ignores a cookie for an unsupported language', () => {
    expect(pickLanguage({ cookie: 'lang=de', accept: ['sk-SK'] })).toBe('sk');
  });

  it('takes the first supported browser language, matching on the primary subtag', () => {
    expect(pickLanguage({ cookie: '', accept: ['de-DE', 'sk-SK', 'en'] })).toBe('sk');
    expect(pickLanguage({ cookie: '', accept: ['de-DE', 'en-US'] })).toBe('en');
  });

  it('sends Czech readers to Slovak', () => {
    expect(pickLanguage({ cookie: '', accept: ['cs-CZ', 'en'] })).toBe('sk');
  });

  it('falls back to the default language', () => {
    expect(pickLanguage({ cookie: '', accept: ['fr-FR'] })).toBe('en');
    expect(pickLanguage({ cookie: '', accept: [] })).toBe('en');
  });
});
