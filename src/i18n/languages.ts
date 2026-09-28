/**
 * The languages Guydeatory is published in.
 *
 * This file has no imports on purpose: Node scripts (infra rendering, checks)
 * import it directly. Adding a language starts here — see docs/translation.md.
 *
 * `required: true` means every article must exist in that language (build error otherwise).
 * `sections` are the localized URL segments of the site's system pages.
 */
export const LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    required: true,
    dateLocale: 'en-GB',
    ogLocale: 'en_GB',
    sections: { topics: 'topics', explore: 'explore', search: 'search', about: 'about' },
  },
  {
    code: 'sk',
    name: 'Slovak',
    nativeName: 'Slovenčina',
    required: true,
    dateLocale: 'sk-SK',
    ogLocale: 'sk_SK',
    sections: { topics: 'temy', explore: 'objavuj', search: 'hladaj', about: 'o-projekte' },
  },
] as const;

export type Language = (typeof LANGUAGES)[number];
export type LangCode = Language['code'];
export type SectionKey = keyof Language['sections'];

export const DEFAULT_LANG: LangCode = 'en';
export const LANG_CODES: LangCode[] = LANGUAGES.map((l) => l.code);
export const REQUIRED_LANGS: LangCode[] = LANGUAGES.filter((l) => l.required).map((l) => l.code);
export const SECTION_KEYS: SectionKey[] = ['topics', 'explore', 'search', 'about'];

export function isLang(value: string): value is LangCode {
  return (LANG_CODES as string[]).includes(value);
}

export function getLanguage(code: LangCode): Language {
  const language = LANGUAGES.find((l) => l.code === code);
  if (!language) throw new Error(`Unknown language "${code}"`);
  return language;
}
