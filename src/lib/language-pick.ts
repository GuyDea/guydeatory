import { DEFAULT_LANG, isLang } from '../i18n/languages.ts';
import type { LangCode } from '../i18n/languages.ts';

/** Browser languages we serve with one of ours (Czech readers understand Slovak best). */
export const LANGUAGE_ALIASES: Record<string, LangCode> = { cs: 'sk' };

/**
 * Chooses the language for a visitor landing on "/": their saved choice (the `lang` cookie),
 * else the first supported browser language, else the default. Mirrored in infra/cloudfront/router.js.
 */
export function pickLanguage({ cookie, accept }: { cookie: string; accept: readonly string[] }): LangCode {
  const saved = /(?:^|;\s*)lang=([a-z]+)/.exec(cookie)?.[1];
  if (saved && isLang(saved)) return saved;
  for (const tag of accept) {
    const primary = tag.split('-')[0]!.trim().toLowerCase();
    if (isLang(primary)) return primary;
    const alias = LANGUAGE_ALIASES[primary];
    if (alias) return alias;
  }
  return DEFAULT_LANG;
}
