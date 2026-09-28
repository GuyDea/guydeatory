/**
 * English UI strings. This dictionary defines the key set: every other language
 * must provide exactly these keys (enforced by TypeScript and tests/i18n.test.ts).
 * Plural entries are objects keyed by Intl.PluralRules categories; `{n}` is the count.
 */
export const en = {
  'site.name': 'Guydeatory',
  'site.tagline': 'How things work — explained from the very beginning.',
  'nav.home': 'Home',
  'nav.explore': 'Explore',
  'nav.search': 'Search',
  'nav.about': 'About',
  'a11y.skipToContent': 'Skip to the main content',
  'a11y.mainNav': 'Main',
  'lang.label': 'Language',
  'lang.notTranslated': 'Not translated yet',
  'theme.label': 'Colour theme: {mode}',
  'theme.system': 'automatic',
  'theme.light': 'light',
  'theme.dark': 'dark',
  'footer.promise': 'No ads. No tracking. Made for curious kids and their grown-ups.',
  'footer.readIn': 'Read in',
  'article.readingTime': '{minutes} min read',
  'count.articles': { one: '{n} article', other: '{n} articles' },
} as const;
