/**
 * "29 September 2026", "29. septembra 2026": a content date written out for readers.
 *
 * Content dates are calendar days: `updated: 2026-09-29` becomes midnight UTC. Formatting them in the
 * build machine's time zone would show the day before anywhere west of UTC, so this always uses UTC.
 */
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}
