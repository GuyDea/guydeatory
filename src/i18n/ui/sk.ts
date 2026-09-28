import type { Dictionary } from '../t.ts';

/** Slovak UI strings. Informal "ty" register — see docs/translation.md. */
export const sk = {
  'site.name': 'Guydeatory',
  'site.tagline': 'Ako veci fungujú — vysvetlené od úplného začiatku.',
  'nav.home': 'Domov',
  'nav.explore': 'Objavuj',
  'nav.search': 'Hľadaj',
  'nav.about': 'O projekte',
  'a11y.skipToContent': 'Preskočiť na hlavný obsah',
  'a11y.mainNav': 'Hlavná navigácia',
  'lang.label': 'Jazyk',
  'lang.notTranslated': 'Zatiaľ nie je preložené',
  'theme.label': 'Farebný režim: {mode}',
  'theme.system': 'automatický',
  'theme.light': 'svetlý',
  'theme.dark': 'tmavý',
  'footer.promise': 'Žiadne reklamy. Žiadne sledovanie. Pre zvedavé deti aj ich dospelých.',
  'footer.readIn': 'Čítaj po',
  'article.readingTime': '{minutes} min čítania',
  'count.articles': { one: '{n} článok', few: '{n} články', other: '{n} článkov' },
} satisfies Dictionary;
