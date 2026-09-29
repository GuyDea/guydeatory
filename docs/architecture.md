# Architecture

A fully static site. Content is files in git. The build turns them into HTML plus a search index,
and the result is served from S3 through CloudFront.

```
content/ (MDX + YAML) ──► fs loader ──► buildCatalog() ──► getCatalog() ──► pages (Astro)
                         (raw files)   (validate, link)     (memoised)        │
content/articles/*/*.mdx ─► Astro collection "articleTexts" ─► render(entry) ─┘ (MDX → HTML)
                                                                             ▼
                                                     dist/ ─► pagefind ─► dist/pagefind/ (search)
```

## Stack

| Piece | Choice | Why |
|---|---|---|
| Generator | Astro 7, `output: static` | Content-first, islands architecture, fast static builds |
| Markdown | `unified()` processor from `@astrojs/markdown-remark` | Astro 7's default (Sätteri) cannot run our remark/rehype plugins |
| MDX | `@astrojs/mdx` | Components inside articles |
| Math | `remark-math` + `rehype-katex` | Formulas rendered at build time; only CSS and fonts reach the browser |
| Widgets | Svelte 5 islands (`@astrojs/svelte`) | Small bundles and good reactivity; JS ships only where a widget is |
| Search | Pagefind 1.5 | Static, per-language, filterable, loads index chunks on demand |
| Validation | Zod 4 (`astro/zod`) + our catalog rules | Fails the build with readable, file-specific messages |
| Tests | Vitest | Pure logic, plugins, loaders, checker, widget models |
| Fonts | Astro Fonts API (Google provider) | Downloaded at build time and self-hosted: Andika (body) and Bricolage Grotesque (display) |

## Content pipeline

1. **`src/lib/content/fs-loader.ts`** reads `content/`: every article folder (`meta.yaml` plus
   `<lang>.mdx` frontmatter and body), `topics.yaml`, `labels.yaml` and `home.yaml`. YAML and
   frontmatter syntax errors become problems instead of crashes.
2. **`src/lib/content/build-catalog.ts`** is a **pure function**. It:
   - validates schemas (`schemas.ts`)
   - cross-checks everything: translations, topics, labels, links, slugs, drafts, TODOs
   - flattens the topic tree
   - extracts `[[wiki-links]]`
   - computes backlinks

   It returns `{ catalog, problems }`. Every rule has a unit test in `tests/catalog.test.ts`.
3. **`src/lib/content/catalog.ts`** exposes `getCatalog()`.
   - It throws `ContentValidationError` (every problem, grouped by file) if anything is wrong.
   - In production it is memoised and drafts are excluded.
   - In dev it is cached for 1.5 s, so edits show up.
4. **Rendering:** the `articleTexts` collection (`src/content.config.ts`, ids `<id>/<lang>`) exists
   only so `render(entry)` can compile MDX. Metadata always comes from the catalog.
5. **`npm run lint:content`** (`src/lib/content/lint.ts`) runs steps 1–2 *and* compiles every MDX
   file with the same plugins. It reports syntax errors with line numbers, and components that are
   neither global nor imported. It writes nothing, so it is safe to run in parallel.

### Markdown plugins (`src/lib/markdown/`)

| Plugin | Does |
|---|---|
| `remark-wiki-links` | `[[id]]` / `[[id\|text]]` → `<Term id="…">`. Skips code and existing links. |
| `remark-inject-lang` | Adds `lang="<file language>"` to every capitalised JSX element that lacks one |
| `rehype-pagefind-ignore-math` | Marks KaTeX output `data-pagefind-ignore` so formula glyphs stay out of search |

The order is set in `astro.config.mjs` (`remarkMath`, then wiki-links, then inject-lang) and
mirrored in `lint.ts`.

## Routing

| Route file | Serves |
|---|---|
| `src/pages/index.astro` | `/`: redirects by `lang` cookie, then browser language, else English. In production the CloudFront router does this first. |
| `src/pages/[lang]/index.astro` | `/en/`, `/sk/`: home |
| `src/pages/[lang]/[page].astro` | Articles (`/sk/elektricky-prud/`) **and** the localized sections `explore`, `search` and `about` (`/sk/objavuj/`…). They share a route because their URLs have the same shape. The catalog rejects article slugs that equal a section name. |
| `src/pages/[lang]/[section]/[topic].astro` | Topic pages (`/en/topics/electricity/`, `/sk/temy/elektrina/`), only for topics with content |
| `src/pages/404.astro` | The one `/404.html` for every missing path. It holds the header, message and footer in every language; an inline `<head>` script picks the language from the path (`/sk/…` → Slovak, anything else → English) before the first paint. Without JS: English header and footer, the message in every language. |
| `src/pages/sitemap.xml.ts`, `robots.txt.ts` | Sitemap with `hreflang` alternates, and robots |

All URLs end with `/` (`trailingSlash: 'always'`, directory format). `src/lib/urls.ts` builds every
URL. `resolveArticleLink()` falls back to the default language when an optional language lacks a
translation.

## Internationalisation

- `src/i18n/languages.ts` is the single source for languages and localized section slugs. It has
  no imports, so Node scripts use it too.
- UI strings live in `src/i18n/ui/<lang>.ts`. The English dictionary defines the key set, and
  `Dictionary` typing plus `tests/i18n.test.ts` force completeness. Plurals use `Intl.PluralRules`
  forms (`tp()`).
- Article text is one MDX file per language. Topic and label names live in YAML per language.
- See `docs/translation.md`.

## Page anatomy (article)

Built by `src/views/ArticleView.astro`:

- `TopicPath`: the static breadcrumb, with `BreadcrumbList` JSON-LD.
- `ReadingTrail`: client-side, `src/scripts/trail.ts` driving `src/lib/trail.ts`.
- `ArticleHeader`: labels, reading time, stub or draft notes.
- `ShortAnswer`: the summary, also Pagefind meta `summary`.
- `GoodToKnow`: prerequisites.
- `Toc`: a sidebar at 1100 px and up, an inline `<details>` below that.
- The MDX body, rendered with the global components.
- Hidden search data: `label` and `topic` filters, plus keywords with a diacritics-folded copy.
- `ArticleFooter`: related, backlinks, sources, updated date.

Scripts on article pages:

| Script | Size |
|---|---|
| `trail.ts` | ~1 KB |
| `toc.ts` | ~0.4 KB |
| `term-preview.ts` | ~1 KB |

The search dialog (on every page) loads Pagefind only when opened.

## Reading trail

"Your path: Electric current › Voltage › Electron".

- Kept in `sessionStorage` (`gd:trail`, `gd:intent`).
- A plain left click on any `a[data-trail-link]` records an intent `{from, to, at}`. Term links,
  prerequisites, related articles and backlinks all carry that attribute.
- On page load, and on a back/forward-cache restore, `nextTrail()`:
  - truncates when revisiting an earlier stop
  - appends when the intent is fresh (≤ 30 s) and matches
  - otherwise starts a new trail
- The trail keeps at most 8 stops, keeping the origin. It resets on a language change.

## Search

- `npm run build` runs `pagefind --site dist` after Astro.
- Only `[data-pagefind-body]`, the article element, is indexed.
- Filters: `label` (ids) and `topic` (ids, ancestors included).
- The index for each language is picked from `<html lang>`.
- `src/scripts/search-client.ts` imports `/pagefind/pagefind.js` lazily. It is used by:
  - the header dialog (`search-dialog.ts`: `/` or Ctrl/⌘ K)
  - the search page (`search-page.ts`: query, label and topic filters, state in the URL)
- Slovak has no Pagefind stemmer. Prefix matching still works, and the folded-keywords copy
  handles typing without diacritics.

## Validation layers

| Layer | Catches | Runs |
|---|---|---|
| Zod schemas | Wrong or missing fields, typos (strict objects) | build, lint, tests |
| `buildCatalog` rules | Missing translations, unknown ids, broken or draft links, malformed links, duplicate or reserved slugs, topic and label problems, TODOs in published content | build, lint, tests |
| `lint.ts` MDX compile | MDX syntax errors (with line), unknown components, KaTeX warnings | `npm run lint:content` |
| `astro check` | TypeScript errors in `.astro`, `.ts` and `.svelte` | `npm run check` |
| `check-dist.ts` | Broken internal links or assets, missing trailing slash, missing title, description, canonical or h1, missing hreflang, leaked `[[`, empty widget first frames, missing search index, missing folded keywords | `npm run check:dist` |

## Design system

- **Tokens:** `src/styles/tokens.css`.
  - Colours: chalk paper `#f6f8fb`, navy ink `#1a2640`, cobalt accent, highlighter yellow for terms.
  - The label colours and the `--d-*` diagram palette.
  - Dark mode ("navy night") through `prefers-color-scheme` or `data-theme`.
- **Type:**
  - Andika (SIL literacy font: single-storey a/g, clear I/l/1) for body text.
  - Bricolage Grotesque for display.
- **The recurring motif:** things you can explore look marked with a highlighter. That covers
  terms, featured questions and the short-answer shadow.
- **Global CSS files:** `base.css`, `prose.css`, `content.css`, `diagram.css` and `search.css`.
  Everything else is scoped in its component.

## Performance budgets

| What | Budget |
|---|---|
| JS on a page without widgets | ≤ 15 KB gzipped (currently ~3–5 KB) |
| Each widget | ≤ 30 KB gzipped, hydrated with `client:visible` |
| Lighthouse | ≥ 95 in every category |

## Scaling notes

- **Articles:** flat folders and ids, with many-to-many topics. Nothing needs restructuring as the
  count grows.
- **Build time:** a few thousand MDX pages build in minutes. The content layer caches between
  builds. `getCatalog()` is computed once per build.
- **Explore:** renders the whole tree on the server as nested `<details>`, which works without JS.
  At about 5,000+ articles the page gets heavy (~100 KB compressed). Switch to lazy per-topic JSON
  (`/[lang]/explore/<topic>.json`) and render subtrees on expand.
- **Topic pages:** list the whole subtree. For very large topics, paginate or show only direct
  articles plus the subtopics.
- **Search:** Pagefind loads index chunks on demand, so it is fine at tens of thousands of pages.
- **Dev server:** the catalog is rebuilt at most every 1.5 s. At thousands of files that costs
  around 100–300 ms per rebuild, which is acceptable.
