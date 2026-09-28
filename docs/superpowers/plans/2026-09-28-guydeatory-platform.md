# Guydeatory Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Guydeatory static knowledge site: platform, first EN+SK content and widgets, AWS hosting at theguydea.com, and steering files for future sessions.

**Architecture:**

- **Astro 7** generates the static site. MDX runs through the `unified()` processor so remark and rehype plugins work: wiki-links, language injection, KaTeX.
- **Content** lives in `content/`. A pure `buildCatalog(raw)` turns the raw files into a validated, cross-linked catalog.
  - Two loaders feed it:
    - an fs loader, used by the build, scripts and tests
    - the Astro `articleTexts` collection, used only to render MDX
  - Pages call a memoised `getCatalog()`.
- **Widgets** are Svelte 5 islands. **Search** is Pagefind, run over `dist/`.
- **Hosting** is one CloudFormation stack: S3 + CloudFront + ACM + Route53, plus a CloudFront Function router.

**Tech Stack:** Astro 7.3, @astrojs/mdx 8, @astrojs/svelte 9, Svelte 5, @astrojs/markdown-remark (unified), remark-math + rehype-katex, Pagefind 1.5, Zod 4 (`astro/zod`), Vitest 5, tsx, yaml, gray-matter, node-html-parser, AWS CLI v2.

**Spec:** `docs/superpowers/specs/2026-09-28-guydeatory-platform-design.md`

**Execution note:** the owner delegated the whole task end to end and waived plan review.

- The platform tasks share interfaces tightly, so the controller implements them natively.
- Content clusters and widgets that can run in parallel are dispatched to subagents. Subagents do not commit; the controller reviews and commits.
- UI tasks are specified by behaviour and acceptance checks rather than full code. Pure-logic tasks carry their tests as code.

## Global Constraints

- Node ≥ 22.12 (the local version is 24.10). Use npm.
- Every article exists in **en** and **sk**. Both are required languages; a missing translation is a build error.
- Article IDs match `^[a-z0-9]+(-[a-z0-9]+)*$`. They are English, permanent, and live in flat folders under `content/articles/<id>/`.
- Base reading level is **8–10 year olds reading alone**. Depth goes in `GoDeeper` blocks, and there is one layered text per article.
- Label IDs: `high-level`, `low-level`, `calculation`, `trivia`, `history`.
- URL sections:

  | Section | en | sk |
  |---|---|---|
  | Topics | `topics` | `temy` |
  | Explore | `explore` | `objavuj` |
  | Search | `search` | `hladaj` |
  | About | `about` | `o-projekte` |

- `trailingSlash: 'always'` and `build.format: 'directory'`.
- `compressHTML: true`. The Astro 7 default `'jsx'` strips spaces between inline elements.
- No third-party requests at runtime: fonts are self-hosted and there is no analytics. Storage is limited to the `lang` cookie, the `theme` localStorage key and the reading trail in sessionStorage.
- JS budget: at most 15 KB gzipped on a page without widgets, and at most 30 KB gzipped per widget.
- Touch targets are at least 44 px. Honour `prefers-reduced-motion`. Every diagram colour comes from a CSS variable so dark mode works.
- Never commit to `main`. Commit progressively on `feat/platform-foundation`. Never push without an explicit request.

## Review Focus

1. **Slovak searches typed without diacritics** ("elektricky prud"). They should still find "Elektrický prúd". Task 13 adds an ASCII-folded copy of the title, term and keywords to the indexed keywords, and asserts it in `check-dist`.
2. **Long Slovak words and titles on a 360 px screen.** Cards, breadcrumbs and headings must not overflow horizontally. Task 8 sets `overflow-wrap: anywhere` plus `hyphens: auto` (the `lang` attribute is set). Task 34 checks it with a 360 px browser screenshot.
3. **Reading trail and stale intents.**
   - A modifier-click or middle-click on a term must not set an intent.
   - An intent older than 30 s is ignored.
   - Task 6 covers both with unit tests.
4. **Back/forward cache restores.** When a page is restored from bfcache, the trail must be recomputed on `pageshow` with `persisted = true`. Task 10 does this; Task 34 verifies it in the browser.
5. **No-JS or pre-hydration rendering.**
   - Articles, Explore (as `<details>`), topic pages and every widget's server-rendered state must be meaningful with no JS.
   - Task 34 verifies this with JS disabled in Playwright.
   - `check-dist` asserts that no widget root renders empty.

---

## Phase 1 — Scaffold

### Task 1: Astro project scaffold

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `svelte.config.js`, `vitest.config.ts`, `.gitignore`, `.nvmrc`, `src/pages/index.astro` (temporary)

- [ ] Install the dependencies:
  - runtime: `astro @astrojs/mdx @astrojs/svelte svelte @astrojs/markdown-remark remark-math rehype-katex katex`
  - dev: `typescript @astrojs/check vitest tsx yaml gray-matter pagefind node-html-parser @types/node`
- [ ] `astro.config.mjs`:
  - `site: 'https://theguydea.com'`, `trailingSlash: 'always'`, `build: { format: 'directory' }`, `compressHTML: true`
  - `markdown: { processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }) }`
  - `integrations: [mdx(), svelte()]`
- [ ] `tsconfig.json`: extend `astro/tsconfigs/strict`. Path aliases `@lib/*`, `@components/*`, `@widgets/*`, `@i18n/*`, `@styles/*`, `@content/*`.
- [ ] Scripts:
  - `dev`, `build` (`astro build && pagefind --site dist`), `preview`
  - `test` (`vitest run`), `check` (`astro check && vitest run && npm run build && node scripts/check-dist.mjs`)
  - `lint:content`, `new:article`, `deploy`, `infra:deploy`
- [ ] Verify: `npx astro build` succeeds with a hello page. `node -e "import('astro/zod').then(m=>console.log(typeof m.z.object))"` prints `function`.
- [ ] Verify inside vitest that `astro/zod` imports; the spike test is deleted after.
- [ ] Commit: "Scaffold Astro 7 project with MDX, Svelte and unified markdown".

## Phase 2 — Core domain (TDD)

### Task 2: Languages and UI strings

**Files:**
- Create: `src/i18n/languages.ts` (no imports, so Node scripts can import it), `src/i18n/ui/en.ts`, `src/i18n/ui/sk.ts`, `src/i18n/t.ts`
- Test: `tests/i18n.test.ts`

**Interfaces (Produces):**
```ts
// languages.ts
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', required: true, dateLocale: 'en-GB', ogLocale: 'en_GB',
    sections: { topics: 'topics', explore: 'explore', search: 'search', about: 'about' } },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', required: true, dateLocale: 'sk-SK', ogLocale: 'sk_SK',
    sections: { topics: 'temy', explore: 'objavuj', search: 'hladaj', about: 'o-projekte' } },
] as const;
export type LangCode = (typeof LANGUAGES)[number]['code'];
export type SectionKey = keyof (typeof LANGUAGES)[number]['sections'];
export const DEFAULT_LANG: LangCode = 'en';
export const LANG_CODES: LangCode[];
export const REQUIRED_LANGS: LangCode[];
export function isLang(value: string): value is LangCode;
export function getLanguage(code: LangCode): (typeof LANGUAGES)[number];
// t.ts
export type PluralForms = { one: string; few?: string; many?: string; other: string };
export function t(lang: LangCode, key: UiKey, vars?: Record<string, string | number>): string;
export function tp(lang: LangCode, key: PluralKey, n: number): string; // Intl.PluralRules, `{n}` interpolated
```

- [ ] Write tests:
  - `t('sk','nav.explore')` returns the Slovak string.
  - `{name}` interpolation works.
  - `tp('sk','count.articles',1|3|5)` returns "1 článok", "3 články" and "5 článkov".
  - `tp('en',…,1|2)` returns the singular, then the plural.
  - Every language defines every key: a runtime check over `Object.keys(en)`.
- [ ] Run and see them fail. Implement. Run and see them pass.
- [ ] Commit.

### Task 3: Content schemas and the pure catalog builder

**Files:**
- Create: `src/lib/content/schemas.ts`, `src/lib/content/types.ts`, `src/lib/content/wiki-links.ts`, `src/lib/content/build-catalog.ts`, `src/lib/content/problems.ts`
- Test: `tests/catalog.test.ts`, `tests/wiki-links.test.ts`, `tests/fixtures/content.ts` (in-memory `RawContent` builders)

**Interfaces (Produces):**
```ts
// wiki-links.ts
export const ID_PATTERN = '[a-z0-9]+(?:-[a-z0-9]+)*';
export const WIKI_LINK_RE: RegExp;        // /\[\[(ID)(?:\|([^\]|\n]+))?\]\]/g
export interface WikiLink { target: string; text?: string }
export function extractWikiLinks(markdown: string): WikiLink[];   // ignores fenced + inline code
export function findMalformedWikiLinks(markdown: string): string[]; // `[[…]]` not matching WIKI_LINK_RE
// types.ts
export type Status = 'published' | 'stub' | 'draft';
export interface ArticleText { lang: LangCode; entryId: string; file: string; title: string; term: string;
  slug: string; summary: string; keywords: string[]; reviewed: boolean; links: WikiLink[]; wordCount: number }
export interface Article { id: string; topics: string[]; labels: string[]; prerequisites: string[]; related: string[];
  status: Status; created: Date; updated: Date; sources: { title: string; url: string }[];
  texts: Partial<Record<LangCode, ArticleText>> }
export interface Topic { id: string; parent: string | null; children: string[]; depth: number; icon?: string;
  slug: Partial<Record<LangCode, string>>; name: Partial<Record<LangCode, string>>; description: Partial<Record<LangCode, string>> }
export interface Label { id: string; color: string; name: Partial<Record<LangCode, string>>; description: Partial<Record<LangCode, string>> }
export interface Catalog { articles: Map<string, Article>; topics: Map<string, Topic>; rootTopics: string[];
  labels: Map<string, Label>; featured: string[]; backlinks: Map<string, string[]> }
export interface Problem { file: string; message: string }
export interface RawContent {
  metas: { id: string; file: string; data: unknown }[];
  texts: { id: string; lang: string; entryId: string; file: string; data: unknown; body: string }[];
  topics: { file: string; data: unknown }; labels: { file: string; data: unknown }; home: { file: string; data: unknown };
}
export function buildCatalog(raw: RawContent, opts: { includeDrafts: boolean }): { catalog: Catalog; problems: Problem[] };
export function formatProblems(problems: Problem[]): string;   // human-readable, grouped by file
export function suggest(target: string, candidates: Iterable<string>): string | undefined; // Levenshtein ≤ 3
```

**Validation rules.** Each rule is one test: a fixture with a single defect should yield exactly one problem whose message names the file.

1. Frontmatter or meta fails its schema (unknown keys are rejected with `.strict()`).
2. An article folder has no `meta.yaml`, or a language file has no `meta.yaml` beside it.
3. A required language is missing.
4. An unknown language file name (e.g. `de.mdx` when `de` is not configured).
5. An unknown topic or label ID in meta.
6. An unknown ID in `prerequisites`, `related` or `featured`, with a "did you mean" suggestion.
7. A wiki-link to an unknown article. The message includes the `[[…]]` text and a suggestion.
8. A wiki-link to a draft when `includeDrafts` is false.
9. A malformed wiki-link (for example `[[Voltage]]` or `[[voltage |x]]`).
10. A duplicate slug within one language (across articles).
11. A slug equal to a section name of that language.
12. A duplicate topic ID, or a duplicate topic slug within a language.
13. A topic or label missing a name, slug or description in a required language.
14. An article that lists itself as a prerequisite or as related.

**Behaviour tests:**
- Backlinks are computed and deduplicated.
- Drafts are excluded when `includeDrafts` is false.
- The topic tree is flattened depth-first with the right parent, children and depth.
- `term` defaults to `title`.
- `wordCount` ignores code and JSX tags.

- [ ] Write the tests (red) → implement → green → commit.

### Task 4: URLs and catalog queries

**Files:**
- Create: `src/lib/urls.ts`, `src/lib/content/queries.ts`
- Test: `tests/urls.test.ts`, `tests/queries.test.ts`

**Interfaces (Produces):**
```ts
// urls.ts
export const SITE = 'https://theguydea.com';
export function homeUrl(lang: LangCode): string;                          // '/sk/'
export function sectionUrl(lang: LangCode, section: SectionKey): string;   // '/sk/objavuj/'
export function articleUrl(article: Article, lang: LangCode): string | null;
export function topicUrl(topic: Topic, lang: LangCode): string | null;     // '/sk/temy/elektrina/'
export function absolute(path: string): string;
export interface ResolvedLink { href: string; lang: LangCode; isFallback: boolean; text: ArticleText }
export function resolveArticleLink(catalog: Catalog, targetId: string, lang: LangCode): ResolvedLink | null;
// queries.ts
export function getText(article: Article, lang: LangCode): ArticleText | undefined;
export function articleLangs(article: Article): LangCode[];
export function topicAncestry(catalog: Catalog, topicId: string): Topic[];         // root … topic
export function articlesInTopic(catalog: Catalog, topicId: string, lang: LangCode, recursive: boolean): Article[]; // unique, sorted by term
export function topicArticleCount(catalog: Catalog, topicId: string, lang: LangCode): number; // recursive
export function topicHasContent(catalog: Catalog, topicId: string, lang: LangCode): boolean;
export function localized(value: Partial<Record<LangCode, string>>, lang: LangCode): string; // falls back to DEFAULT_LANG
export function readingMinutes(text: ArticleText): number;                 // ceil(words / 150), min 1
```

- [ ] Tests:
  - The paths above.
  - The fallback link for an optional language returns the default-language href with `isFallback: true`. Test it with a fake third language via a `langs` parameter on the helpers.
  - The ancestry order.
  - The recursive count de-duplicates an article that sits in two sibling topics.
  - A parent with an empty subtree reports no content.
- [ ] Red → implement → green → commit.

### Task 5: Remark plugins

**Files:**
- Create: `src/lib/markdown/remark-wiki-links.ts`, `src/lib/markdown/remark-inject-lang.ts`, `src/lib/markdown/rehype-pagefind-ignore-math.ts`
- Test: `tests/remark.test.ts` (runs `@mdx-js/mdx` `compile` with the plugins and asserts on the output JS / mdast)

**Interfaces (Produces):**
```ts
export function remarkWikiLinks(): (tree: Root) => void;
// Turns text `[[id]]` into <Term id="id" />, and `[[id|text]]` into <Term id="id">text</Term>.
// Leaves code, inlineCode and existing links alone.
export function remarkInjectLang(): (tree: Root, file: VFile) => void;
// Reads the language from the file basename (`sk.mdx` → 'sk'). Adds lang="sk" to every JSX element whose
// name starts with an uppercase letter and has no lang attribute. Does nothing for other files.
export function rehypePagefindIgnoreMath(): (tree: HastRoot) => void; // data-pagefind-ignore on .katex / .katex-display
```

- [ ] Tests:
  - Unicode display text: `[[voltage|napätím]]`.
  - Several links in one paragraph.
  - A link next to punctuation: `[[atom]]s,`.
  - Nothing is transformed inside code.
  - `lang` is injected into `<GoDeeper>` and into Svelte components.
  - An existing `lang` is not overwritten.
  - A file not named after a language is left untouched.
- [ ] Red → implement → green.
- [ ] Wire the plugins into `astro.config.mjs` in this order: remark `[remarkMath, remarkWikiLinks, remarkInjectLang]`, then rehype `[rehypeKatex, rehypePagefindIgnoreMath]`.
- [ ] Commit.

### Task 6: Reading-trail state machine

**Files:**
- Create: `src/lib/trail.ts`
- Test: `tests/trail.test.ts`

**Interfaces (Produces):**
```ts
export interface TrailItem { id: string; lang: string; url: string; title: string }
export interface TrailState { items: TrailItem[]; capped: boolean }
export interface TrailIntent { from: string; to: string; at: number }
export const TRAIL_MAX = 8;
export const INTENT_TTL_MS = 30_000;
export function nextTrail(prev: TrailState | null, intent: TrailIntent | null, current: TrailItem, now: number): TrailState;
export function shouldRecordIntent(e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): boolean;
```

**Rules:**
1. If `current.id` is already in `prev`, truncate the trail after it. This covers a reload, the back button and a breadcrumb click.
2. Otherwise, if the intent is fresh (`now - at ≤ TTL`), `intent.to === current.id`, the last `prev` item is `intent.from`, and the language is the same, append `current`.
3. Otherwise, start a new trail `[current]`.
4. When the trail grows past `TRAIL_MAX`, drop `items[1]` and set `capped: true`.
5. A language change always starts a new trail.

- [ ] Write one test per rule. Add these too:
  - an expired intent
  - an intent from a different page
  - `shouldRecordIntent` returns false for modifier clicks and a middle click
- [ ] Red → implement → green → commit.

### Task 7: Loaders, `getCatalog()`, content lint and seed content

**Files:**
- Create:
  - `src/lib/content/fs-loader.ts`: `loadRawContent(rootDir: string): Promise<RawContent>`, using `yaml` + `gray-matter` + `fs.glob`
  - `src/lib/content/catalog.ts`: `getCatalog(): Promise<Catalog>`. It is memoised in production and rebuilt on every request in dev. It throws `ContentValidationError(formatProblems(problems))`.
  - `src/content.config.ts`: the collections
    - `articleTexts`: glob `*/*.mdx` in `content/articles`, `generateId` → `<id>/<lang>`, with the text schema
    - `pages`: glob `*/*.mdx` in `content/pages`
  - `scripts/lint-content.ts`: runs the fs loader, `buildCatalog` and `@mdx-js/mdx` compile of every MDX file with the same remark plugins. It prints the problems and exits with 1 if there are any.
  - The seed content: `content/topics.yaml`, `content/labels.yaml`, `content/home.yaml`, and two articles (`atom`, `electron`) with minimal EN and SK text.
- Test: `tests/content.test.ts`, which loads the real `content/` and expects zero problems.

- [ ] Write `tests/content.test.ts` (red: no content yet).
- [ ] Implement the loader, catalog and collections. Add the seed content.
- [ ] Green. `npm run lint:content` passes.
- [ ] Add a deliberately broken link in a temporary copy of a fixture and confirm the lint output names the file and suggests the fix.
- [ ] Commit.

## Phase 3 — Site

### Task 8: Design system and base layout

Uses the frontend-design skill for the visual direction.

**Files:**
- Create:
  - `src/styles/tokens.css`: colours for light and dark, the label colours, the diagram palette (`--d-*`), the type scale, spacing, radii and shadows
  - `src/styles/base.css`
  - `src/styles/prose.css`
  - `src/layouts/BaseLayout.astro`
  - `src/components/site/SiteHeader.astro`, `SiteFooter.astro`, `LanguageSwitcher.astro`, `ThemeToggle.astro`, `Logo.astro`
- Fonts: the Astro Fonts API, with the `latin` and `latin-ext` subsets:
  - a body face for legibility
  - a display face with character
  - a mono face for widget readouts
  - Check that the Slovak glyphs č ď ľ ĺ ň ŕ š ť ž ô ä render.

**BaseLayout props:** `{ lang, title, description, alternates: { lang: LangCode; href: string }[], canonical: string, noindex?: boolean, jsonLd?: object[] }`.

It renders:
- `<html lang>`
- the title as `"{title} · Guydeatory"`
- the meta description, canonical, `hreflang` alternates plus `x-default`, OpenGraph tags and JSON-LD
- an inline theme bootstrap script in `<head>`, so there is no flash of the wrong theme
- a skip link, the header, `<main id="main">` and the footer

**Language switcher:**
- It lists the alternates.
- A missing language is rendered as `<span aria-disabled="true">` with a "not translated yet" title.
- Clicking a language sets `document.cookie = 'lang=xx;path=/;max-age=31536000;SameSite=Lax'`.

**Theme toggle:**
- It cycles system → light → dark.
- It stores the choice in localStorage (`theme`) inside try/catch.
- It sets `data-theme` on `<html>`.

**Acceptance:**
- It builds.
- A 360 px screenshot shows no horizontal scroll.
- Contrast is AA in both themes (spot-checked with the devtools/a11y skill in Task 34).

- [ ] Implement → build → screenshot → commit.

### Task 9: Routes

**Files:**
- Create:
  - `src/pages/index.astro`: the language picker and redirect script (cookie → `navigator.languages` → en), plus a `<noscript>` meta refresh to `/en/`
  - `src/pages/[lang]/index.astro`: home
  - `src/pages/[lang]/[page].astro`: dispatches article and section pages through `getStaticPaths`, with `props.kind` set to `'article' | 'explore' | 'search' | 'about'`
  - `src/pages/[lang]/[section]/[topic].astro`: topic pages, only for topics with content
  - `src/pages/404.astro`: bilingual, and picks the language from the path
  - `src/pages/sitemap.xml.ts`: every page, with `xhtml:link` alternates
  - `src/pages/robots.txt.ts`
- Views: `src/views/ArticleView.astro`, `ExploreView.astro`, `SearchView.astro`, `AboutView.astro`, `HomeView.astro`, `TopicView.astro`

**Acceptance:**
- The build emits `/en/`, `/sk/`, `/en/explore/`, `/sk/objavuj/`, `/sk/temy/<slug>/`, every article in both languages, `sitemap.xml`, `robots.txt` and `404.html`.
- There are no route conflicts.

- [ ] Implement → build → list `dist/` → commit.

### Task 10: Article view

**Files:**
- Create: `src/components/article/TopicPath.astro` (with BreadcrumbList JSON-LD), `ReadingTrail.astro`, `ArticleHeader.astro` (labels, reading time, stub badge, draft banner), `ShortAnswer.astro`, `GoodToKnow.astro`, `Toc.astro`, `ArticleFooter.astro` (where next, used in, sources, updated)
- Create: `src/scripts/trail.ts` (DOM glue for `nextTrail`), `src/scripts/toc.ts` (active heading)

**Behaviour:**
- `<article data-pagefind-body>` wraps the title, the short answer and the body. The chrome, TOC and footer lists get `data-pagefind-ignore`.
- These hidden elements carry the search metadata:
  - `data-pagefind-filter="label"` for each label ID
  - `data-pagefind-filter="topic"` for each topic ID, ancestors included
  - `data-pagefind-meta="summary"`
  - the keywords block with `data-pagefind-weight="5"`
- Links in the Term component, prerequisites, related and backlinks carry `data-trail-link` and `data-trail-to="<id>"`.
- `trail.ts`:
  - On load and on `pageshow`, it computes `nextTrail` and stores it in `sessionStorage` (`gd:trail`, `gd:intent`), inside try/catch.
  - It renders `<nav aria-label>` when there are at least 2 items.
  - On clicks where `shouldRecordIntent` is true, it records the intent.
- The TOC is shown when there are at least 3 h2 headings. It sits in a sticky sidebar on screens ≥ 1100 px and in a collapsible `<details>` block on smaller screens.

**Acceptance:**
- Build the seed articles.
- Navigate atom → electron through a term link: the trail shows "Atom › Electron".
- Go back: the trail shows "Atom".
- A bfcache restore recomputes the trail.

- [ ] Implement → build → browser check → commit.

### Task 11: Authoring components

**Files:**
- Create in `src/components/content/`: `Term.astro`, `GoDeeper.astro`, `Analogy.astro`, `FunFact.astro`, `Safety.astro`, `Remember.astro`, `Figure.astro`, `Quiz.astro`, `index.ts` (exports the `components` map)
- Create: `src/scripts/term-preview.ts`, `src/scripts/quiz.ts`
- Create: `src/components/diagram/Svg.astro` (a responsive `viewBox` wrapper with an accessible title and description, plus shared `<defs>` for the arrow markers), `src/styles/diagram.css` (classes `.d-wire`, `.d-label`, `.d-arrow` …)
- Create: `src/styles/katex.css` (imports the KaTeX CSS and adjusts the colours for dark mode)

**Behaviour:**
- **Term** resolves through `resolveArticleLink`. It throws if the target is unknown, as a second guard after validation. It renders `a.term` with:
  - `data-preview-title`
  - `data-preview-summary`
  - a language badge when the link is a fallback
  - the slot text if present, otherwise the target's `term`
- **Term previews:**
  - Shown on devices with hover, after 250 ms of hover, or immediately on keyboard focus.
  - There is one reused `role="tooltip"` element, positioned to avoid overflowing the viewport.
  - It closes on Escape, blur or pointer leave.
  - No preview on touch devices; a tap navigates.
- **Quiz:** props `question`, `options: string[]`, `answer: number`, `explanation`.
  - The buttons use `aria-pressed`.
  - Feedback is announced through `aria-live`.
  - Without JS, the options stay disabled and the answer and explanation are shown inside a `<details>` block.
- **GoDeeper:** a `<details>` block with the localised label "Go deeper" / "Poďme hlbšie" and an optional `title` prop. Opening it is remembered only for the current view.

**Acceptance:**
- An MDX file uses every component without importing any.
- Its KaTeX formula renders.
- The dark-mode screenshot is legible.

- [ ] Implement → build → commit.

### Task 12: Discovery pages

**Files:**
- Views from Task 9: `ExploreView`, `TopicView`, `HomeView`, `AboutView`
- Create: `src/components/lists/ArticleCard.astro`, `LabelChip.astro`, `TopicCard.astro`
- Create: `src/scripts/explore.ts`
- Create: the about page content at `content/pages/about/{en,sk}.mdx`

**Behaviour:**
- **Explore:**
  - A tree of nested `<details open>` elements (articles can repeat under several topics).
  - Chips are `button[aria-pressed]`, one per label. The selected labels are OR-ed together.
  - A text filter matches the term, the title and an ASCII-folded copy of both.
  - Counts update live.
  - Topics with nothing visible are hidden.
  - The filter state is synced to `?label=a,b&q=`.
- **Topic page:**
  - The topic path.
  - Subtopics with their counts.
  - Articles grouped under their first label, in the vocabulary order.
- **Home:**
  - Hero with the tagline and a search box: the form's GET goes to the search page, and focusing it opens the dialog.
  - Featured cards.
  - A grid of the visible topics.
  - A "What the labels mean" section with chips that link to `explore?label=x`.
  - A "How to read Guydeatory" section (terms, trail, Go deeper).

**Acceptance:**
- Explore works with JS disabled (everything visible).
- A filter reduces the list.
- The URL keeps the filter state across a reload.

- [ ] Implement → build → browser check → commit.

### Task 13: Search

**Files:**
- Create: `src/components/search/SearchDialog.astro`, `src/scripts/search-client.ts`, `src/scripts/search-dialog.ts`, `src/scripts/search-page.ts`, `pagefind.yml`
- Create: `src/lib/text.ts` with `foldDiacritics(s: string): string` (NFD, strip combining marks). Test: `tests/text.test.ts`.

**Behaviour:**
- **Pagefind** is imported lazily from `/pagefind/pagefind.js` the first time search is used.
- **Dialog:**
  - A native `<dialog>`. It opens with the header button, <kbd>/</kbd>, or <kbd>Ctrl/⌘ K</kbd>.
  - Search is debounced at 200 ms.
  - Each result shows the title, the summary meta, the label chips and a link.
  - Label filter chips narrow the results.
  - The arrow keys move between results and Enter opens one.
- **Search page:**
  - Reads `?q=&label=&topic=`.
  - With no query but with filters, it runs `search(null, { filters })` to list the matching pages.
- **Keywords block:** gets `foldDiacritics` of the title, the term and the keywords, when that differs from the original.
- **Dev mode:** if `/pagefind/pagefind.js` fails to load, show "Search works in the built site (`npm run preview`)".

**Tests and checks:**
- `foldDiacritics('Elektrický prúd') === 'Elektricky prud'`.
- `check-dist` asserts that `dist/pagefind/pagefind-entry.json` lists the en and sk languages.
- After the build, a Node smoke script calls Pagefind's `search('elektricky prud')` on the sk index and expects the electric-current article. This is in the Task 14 checker.

- [ ] Red → implement → green → commit.

### Task 14: Post-build checker

**Files:**
- Create: `scripts/check-dist.mjs`
- Test: it is exercised by `npm run check` in CI-like runs.

**Checks:**
- Every `href`/`src` starting with `/` in `dist/**/*.html` resolves: `/x/` → `x/index.html`, a file as is, a `#fragment` is ignored.
- Every page has one `<h1>` (except redirect pages), a `<title>`, a meta description and a canonical URL.
- Every article page has `hreflang` alternates for all its languages plus `x-default`.
- There is no `[[` in visible text (catches wiki-links that were not transformed).
- Every widget root `[data-widget]` has non-empty server-rendered content.
- The Pagefind entry exists for every language.
- The search smoke test for a query without diacritics passes (see Task 13).

- [ ] Implement → run it against the build → fix what it finds → commit.

## Phase 4 — Steering files

### Task 15: Steering docs, skills and scaffolder

**Files:**
- Create:
  - `CLAUDE.md`
  - `docs/vision.md`, `docs/architecture.md`, `docs/writing-guide.md`, `docs/taxonomy.md`, `docs/translation.md`, `docs/widgets.md`, `docs/deployment.md`
  - `.claude/skills/write-article/SKILL.md`, `.claude/skills/add-language/SKILL.md`
  - `scripts/new-article.ts` with the templates in `scripts/templates/`
  - `README.md` (rewritten)

**Content requirements:**
- **Writing guide:**
  - The audience and reading level, with measurable rules: average sentence ≤ 15 words, one idea per paragraph, ≤ 4 sentences per paragraph, every technical word linked or explained on the spot.
  - The article template.
  - Title patterns.
  - How to write the summary.
  - Analogies: choose familiar ones and flag in GoDeeper where they break down.
  - What to link and when to split into a new article.
  - How to use each label.
  - Component usage with MDX examples.
  - Diagrams (use the colour variables) and when a widget is worth it.
  - Safety notes (electricity, heat, chemicals).
  - Accuracy and sources.
  - A checklist before commit.
- **Translation guide:**
  - Slovak register (*ty*).
  - Typography: „quotes“, decimal comma, a non-breaking space before units and in `1 000`, °C spacing.
  - The EN→SK physics glossary (current = prúd, voltage = napätie, resistance = odpor, conductor = vodič, insulator = izolant, circuit = elektrický obvod, heat pump = tepelné čerpadlo, refrigerant = chladivo, evaporator = výparník, condenser = kondenzátor (with a note on the capacitor clash), expansion valve = expanzný ventil, compressor = kompresor …).
  - Slug rules (ASCII, no diacritics).
  - Declension with `[[id|text]]`.
- **Skill `write-article`:** the step-by-step process.
  1. Search the existing articles (`rg` over `content/articles/*/en.mdx` titles and keywords).
  2. Decide the ID, topics and labels.
  3. Outline from the fundamentals.
  4. List the terms and check that each exists; create missing term articles, recursively and depth-first, preferring existing ones.
  5. Write EN.
  6. Write SK.
  7. Add diagrams or widgets.
  8. `npm run lint:content`.
  9. `npm run build`.
  10. A browser check.
  11. Commit.
  12. Deploy only when asked.
- **`CLAUDE.md`:**
  - One screen of vision.
  - The non-negotiables: kid-first, EN+SK, every term linked, validation green, no trackers.
  - The command list and the repo map.
  - Pointers to the docs and skills.

- [ ] Write → `npm run new:article -- test-id` creates the expected files → delete the test → commit.

## Phase 5 — Widgets

### Task 16: Widget kit

**Files:**
- Create: `src/widgets/kit/WidgetFrame.svelte` (title, optional hint, reset, `data-widget` root, `role="group"`, `aria-label`), `Slider.svelte` (a labelled range input with value readout and unit, and a 44 px thumb), `Toggle.svelte` (a segmented `radiogroup`), `Readout.svelte`, `motion.svelte.ts` (`prefersReducedMotion()` rune plus `createLoop(cb)` that runs a rAF loop only while the widget is visible, via IntersectionObserver), `strings.ts` (shared widget strings), `types.ts`
- Test: `tests/widgets/kit.test.ts` for any pure helpers (value formatting with a locale-aware decimal comma).

**Interfaces (Produces):**
```ts
export function formatNumber(value: number, lang: LangCode, digits?: number): string; // 'sk' → '1,5'
export function formatQuantity(value: number, unit: string, lang: LangCode, digits?: number): string; // '1,5 A' with NBSP
```

- [ ] Red → implement → green → commit.

### Tasks 17–23: The widgets

Each widget folder has `Name.svelte`, `strings.ts` (`{ en: {...}, sk: {...} }` with typed keys) and, where there is physics, `model.ts`. Each `model.ts` gets tests in `tests/widgets/<name>.test.ts`. Every widget:

- takes a `lang: LangCode` prop
- renders a meaningful static first frame on the server
- works with touch and keyboard
- pauses its animation when off-screen or when reduced motion is preferred

| Task | Widget | Model under test |
|---|---|---|
| 17 | `electron-flow/ElectronFlow` — closed/open switch, voltage slider (0–12 V), electrons drifting at a speed ∝ current, bulb glow ∝ power | `bulbGlow(voltage, resistance)` in 0..1; zero when open |
| 18 | `ohms-law/OhmsLawPlayground` — V (0–240) and R (1–1000 Ω, log slider) sliders giving I and P; presets: torch, phone charger, kettle, LED; the formula triangle highlights the solved quantity | `solve({V,R})` → `{I,P}`; `logSlider` mapping round-trips |
| 19 | `series-parallel/SeriesParallel` — mode toggle, 2–3 bulbs, clicking a bulb removes it, brightness per bulb, current readouts | `circuit(mode, bulbs[])` → per-bulb current and brightness; one bulb removed in series → all 0; in parallel → the others unchanged |
| 20 | `ac-dc/AcDc` — DC vs AC toggle, electrons moving one way vs back and forth, a live current-time plot, a frequency slider (slow-motion 0.2–2 Hz, labelled "50 Hz in real life") | `current(t, mode, f)`; the AC mean ≈ 0 over one period; the DC value is constant |
| 21 | `heat-pump-cycle/HeatPumpCycle` — the 4-part loop (compressor, condenser, expansion valve, evaporator), refrigerant coloured by temperature, mode toggle cooling/heating (swaps the indoor/outdoor roles), clickable parts with a description, a temperature label at each point, reduced motion = static arrows | `cycleStates(mode, outdoorC, indoorC)` → temperatures at the 4 points; heating mode: condenser inside, above the indoor temperature; evaporator outside, below the outdoor temperature |
| 22 | `cop-explorer/CopExplorer` — outdoor temperature slider (−20…+15 °C), the heat delivered per 1 kWh of electricity as blocks, the resistance heater (1 kWh) for comparison | `cop(outdoorC, flowC)` = clamp(0.45 × Carnot, 1, 6); falls as it gets colder; ≥ 1 always |
| 23 | `boiling-point/BoilingPoint` — pressure slider (0.3–3 bar), boiling temperature of water with Everest, sea level and pressure-cooker markers, plus a refrigerant curve | `boilingPointWater(bar)` via the Antoine equation (100 °C ± 0.5 at 1.013 bar; ≈ 70 °C at 0.31 bar); `boilingPointR290(bar)` (≈ −42 °C at 1 bar) |

- [ ] For each widget: model tests (red) → model → green → component → embed in a scratch MDX file → browser check (touch, keyboard, reduced motion, dark mode) → commit.

## Phase 6 — Content

### Task 24: Taxonomy and exemplar article

**Files:**
- Modify: `content/topics.yaml`, `content/labels.yaml`, `content/home.yaml`
- Create: `content/articles/voltage/{meta.yaml,en.mdx,sk.mdx}`: the gold-standard example that the other writers imitate

**Topics:**
- `science` › `physics` › `electricity`, `heat`, `matter`
- `technology` › `home-technology`

Each topic has EN and SK slugs, names and descriptions.

- [ ] Write it → lint → build → read it in the browser at 360 px and on desktop → commit.

### Tasks 25–29: Term-article clusters (parallel subagents)

Each subagent gets the writing guide, the translation guide, the exemplar `voltage` article and its cluster list. Rules:

- Write EN and SK.
- Link only to IDs that exist or are in the planned list. Tell the controller about any new term they need.
- Run `npm run lint:content`.
- Do not build or commit.

| Task | Cluster | Articles (labels) |
|---|---|---|
| 25 | A — electricity building blocks | `atom`, `electron`, `electric-charge`, `conductors-and-insulators`, `electric-circuit` (all high-level) |
| 26 | B — electricity quantities | `electrical-resistance` (high-level), `ohms-law` (low-level, calculation), `electric-power` (low-level, calculation), `alternating-current` (high-level; embeds AcDc) |
| 27 | C — energy and heat | `energy`, `conservation-of-energy`, `heat`, `temperature`, `pressure` (all high-level) |
| 28 | D — phase change and heat pumps | `evaporation-and-condensation` (high-level), `boiling-point` (high-level; embeds BoilingPoint), `refrigerant` (high-level), `coefficient-of-performance` (low-level, calculation; embeds CopExplorer) |
| 29 | E — label showcases | `why-birds-on-wires-dont-get-shocked` (trivia), `history-of-electricity` (history) |

- [ ] Dispatch A–E in parallel.
- [ ] Review each cluster for reading level, accuracy, linking and Slovak quality. Fix, lint, build.
- [ ] Commit per cluster.

### Tasks 30–33: Main articles

| Task | Article | Labels | Widgets |
|---|---|---|---|
| 30 | `electric-current` | high-level | ElectronFlow + static water-analogy diagram |
| 31 | `calculating-electric-current` | low-level, calculation | OhmsLawPlayground + worked examples |
| 32 | `how-electric-current-behaves` | low-level | SeriesParallel, AcDc |
| 33 | `heat-pump` | high-level | HeatPumpCycle, CopExplorer (summary) |

- [ ] For each: EN → SK → lint → build → browser read-through → commit.

### Task 34: Full-site QA

- [ ] `npm run check` is green.
- [ ] Playwright:
  - The key pages at 360 px and 1280 px, in light and dark themes.
  - With JS disabled: articles, Explore and widget first frames.
  - A term → term → back sequence, with the trail correct.
  - Search in SK without diacritics.
  - Language switch.
  - The 404 page.
- [ ] Lighthouse on an article and on home: ≥ 95 in every category, or the issues are fixed.
- [ ] A widget JS-size check against the budgets.
- [ ] Commit the fixes.

## Phase 7 — Deploy

### Task 35: Infrastructure

**Files:**
- Create:
  - `infra/site.template.yml`: CloudFormation with the bucket, OAC, bucket policy, certificate (DNS validated in `Z06939482PPSH3VUZ9L07`), the function (router), the distribution (managed CachingOptimized and SecurityHeaders policies, custom errors 403/404 → `/404.html` with a 404 status), and the Route53 A/AAAA records for the apex and `www`
  - `infra/cloudfront/router.js`: runtime `cloudfront-js-2.0`; the language list is injected
  - `scripts/render-infra.mjs`: inlines `router.js` and the language list from `src/i18n/languages.ts` into `infra/.build/site.yml`
  - `scripts/infra-deploy.sh`
- Test: `tests/router.test.ts`, which loads `router.js` with `new Function` and exercises the handler

**Router tests:**
- `www` → a 301 to the apex, keeping the path and query.
- `/` with a `lang=sk` cookie → a 302 to `/sk/`.
- `/` with `Accept-Language: sk-SK,sk;q=0.9,en;q=0.8` → `/sk/`.
- `/` with `Accept-Language: de` → `/en/`.
- `/en/voltage/` → the request URI becomes `/en/voltage/index.html`.
- `/en/voltage` → a 301 to `/en/voltage/`.
- `/_astro/x.css` → unchanged.
- `/sitemap.xml` → unchanged.

Steps:
- [ ] Red → implement → green.
- [ ] `aws cloudformation validate-template`.
- [ ] Deploy the stack in us-east-1 (wait for the certificate and the distribution).
- [ ] Commit.

### Task 36: Deploy and verify live

**Files:**
- Create: `scripts/deploy.sh`

**Steps in the script:**
1. `npm run check`.
2. Read the stack outputs.
3. `aws s3 sync dist/ s3://$BUCKET/ --delete --exclude '*' --include '_astro/*' --cache-control 'public,max-age=31536000,immutable'`.
4. Sync the rest with `--cache-control 'public,max-age=0,s-maxage=31536000,must-revalidate'`.
5. `aws cloudfront create-invalidation --paths '/*'`.
6. Wait.

- [ ] Run it.
- [ ] Verify with `curl -sI`:
  - `https://theguydea.com/` gives a 302 to `/en/` or `/sk/`
  - `https://www.theguydea.com/x` gives a 301
  - `/en/electric-current/` gives a 200 with HSTS
  - a missing path gives a 404 with the 404 page
- [ ] Load the live site in Playwright.
- [ ] Commit, and update `docs/deployment.md` with the real stack outputs.

### Task 37: Final review and hand-off

- [ ] Dispatch a fresh reviewer subagent over the whole branch diff (correctness, security of the infra, a11y, docs accuracy).
- [ ] Fix the confirmed findings.
- [ ] Update `CLAUDE.md` and the docs if anything drifted.
- [ ] Final commit.
- [ ] Report to the owner:
  - what exists
  - the live URL
  - how to add an article
  - what was not done
  - the next steps (CI/CD, content review of the `reviewed: false` translations)
