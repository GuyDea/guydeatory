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
  'article.shortAnswer': 'The short answer',
  'article.goodToKnow': 'Good to know first:',
  'article.toc': 'On this page',
  'article.whereNext': 'Where to next?',
  'article.usedIn': 'These articles use this idea',
  'article.sources': 'Sources',
  'article.updated': 'Last updated {date}',
  'article.stub': 'This is a short version. A fuller explanation is on its way.',
  'article.draft': 'Draft — only visible while writing, not published.',
  'article.labelsLabel': 'Type of explanation',
  'trail.label': 'Your path',
  'trail.earlier': 'Earlier steps',
  'breadcrumb.label': 'Where this lives',
  'label.seeAll': 'See all “{label}” articles',
  'article.readingTime': '{minutes} min read',
  'count.articles': { one: '{n} article', other: '{n} articles' },
} as const;
