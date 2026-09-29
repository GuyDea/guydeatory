/** "Elektrický prúd" → "Elektricky prud". Used so searches typed without diacritics still match. */
export function foldDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}

/**
 * JSON for inside a <script> element (JSON-LD, page data). `<`, `>` and `&` become \u escapes, so
 * no value can end the script early ("</script>") or open an HTML comment ("<!--"). U+2028 and
 * U+2029 are escaped too: older JavaScript parsers read them as line breaks. The result is still
 * valid JSON and parses back to the same value.
 */
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u{2028}\u{2029}]/gu, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}
