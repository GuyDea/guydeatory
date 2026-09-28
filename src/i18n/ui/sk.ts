import type { Dictionary } from '../t.ts';

/** Slovak UI strings. Informal "ty" register — see docs/translation.md. */
export const sk = {
  'site.name': 'Guydeatory',
  'site.tagline': 'Ako veci fungujú — vysvetlené od úplného začiatku.',
  'nav.home': 'Domov',
  'nav.explore': 'Objavuj',
  'nav.search': 'Hľadaj',
  'nav.about': 'O projekte',
  'article.readingTime': '{minutes} min čítania',
  'count.articles': { one: '{n} článok', few: '{n} články', other: '{n} článkov' },
} satisfies Dictionary;
