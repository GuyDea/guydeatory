import type { LangCode } from '../../i18n/languages.ts';

const NBSP = ' ';

/** A number with exactly `digits` decimals in the reader's language: 1,5 (sk) / 1.5 (en); real minus sign. */
export function formatNumber(value: number, lang: LangCode, digits = 0): string {
  const rounded = Number(value.toFixed(digits));
  const text = new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
    Object.is(rounded, -0) ? 0 : rounded,
  );
  return text.replace('-', '−');
}

/** Value + unit joined by a non-breaking space: "1,5 A", "20 °C". */
export function formatQuantity(value: number, unit: string, lang: LangCode, digits = 0): string {
  return `${formatNumber(value, lang, digits)}${NBSP}${unit}`;
}
