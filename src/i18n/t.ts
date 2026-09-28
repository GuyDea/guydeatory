import type { LangCode } from './languages.ts';
import { en } from './ui/en.ts';
import { sk } from './ui/sk.ts';

export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

type EnDictionary = typeof en;
/** Shape every language's dictionary must have: same keys, strings or plural forms. */
export type Dictionary = {
  [K in keyof EnDictionary]: EnDictionary[K] extends string ? string : PluralForms;
};
export type UiKey = { [K in keyof EnDictionary]: EnDictionary[K] extends string ? K : never }[keyof EnDictionary];
export type PluralKey = Exclude<keyof EnDictionary, UiKey>;

export const DICTIONARIES: Record<LangCode, Dictionary> = { en, sk };

type Vars = Record<string, string | number>;

function interpolate(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in vars ? String(vars[name]) : placeholder,
  );
}

/** Translate a UI string. Missing variables stay visible as `{name}`. */
export function t(lang: LangCode, key: UiKey, vars?: Vars): string {
  return interpolate(DICTIONARIES[lang][key] as string, vars);
}

/** Translate a plural UI string for count `n` (formatted with the language's grouping). */
export function tp(lang: LangCode, key: PluralKey, n: number, vars?: Vars): string {
  const forms = DICTIONARIES[lang][key] as PluralForms;
  const category = new Intl.PluralRules(lang).select(n) as keyof PluralForms;
  const template = forms[category] ?? forms.other;
  return interpolate(template, { ...vars, n: new Intl.NumberFormat(lang).format(n) });
}
