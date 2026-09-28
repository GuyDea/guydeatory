/** "Elektrický prúd" → "Elektricky prud". Used so searches typed without diacritics still match. */
export function foldDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}
