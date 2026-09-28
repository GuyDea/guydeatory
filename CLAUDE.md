# Guydeatory — how things work, explained from the very beginning

Static website at **https://theguydea.com**. Every question about how something works gets its own
article, explained from the absolute fundamentals. It is written for **children of about 8–10
reading alone** (the owner's kids among them) and for the grown-ups reading with them. The site
covers **English and Slovak**, and more languages come later. It must scale to thousands of
articles on any subject.

Read `docs/vision.md` once per session if you are unsure what the product is for.

## Non-negotiables

1. **Kid-first, layered text.**
   - The main text of every article must work for an 8–10-year-old.
   - Precise details, formulas and "where the analogy breaks" go into `<GoDeeper>` blocks.
   - There is one text per article, never a separate kids' version.
   - Rules: `docs/writing-guide.md`.
2. **Every term is a door.**
   - A concept that needs its own explanation is linked with `[[article-id]]`, or `[[article-id|custom text]]`.
   - It must link to a real article.
   - If that article does not exist yet, write it; the build fails on unknown links.
3. **Every article exists in every required language (en, sk).**
   - The two versions keep the same structure: sections, components, links and widgets.
   - Slovak rules and glossary: `docs/translation.md`.
4. **Simplified but never wrong.**
   - List sources in `meta.yaml`.
   - Add `<Safety>` notes wherever a child could try something dangerous.
5. **Everything green before commit.**
   - Run `npm run lint:content` for content.
   - Run `npm run check` for code: typecheck, tests, lint, build, dist checks.
6. **Privacy.**
   - No trackers, no analytics, no third-party requests; fonts are self-hosted.
   - Only a `lang` cookie and a `theme` localStorage key are stored.
7. **Git.**
   - Work on a feature branch, never commit to `main`.
   - Commit progressively.
   - Never push or deploy unless the owner asks.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server. Drafts are visible. Search needs a build. |
| `npm run lint:content` | Validates all content: schemas, translations, links, slugs, MDX syntax and components. Fast, and safe to run in parallel. |
| `npm test` | Vitest unit tests (content rules, URLs, plugins, trail, widget models…). |
| `npm run build` | `astro build` + Pagefind search index → `dist/`. |
| `npm run check:dist` | Post-build checks on `dist/`: links, SEO basics, widgets, search index. |
| `npm run check` | Everything above plus `astro check` (types). Run this before deploying. |
| `npm run preview` | Serves `dist/` locally. Search works here. |
| `npm run new:article -- <id> --topic <topic-id> [--label <label-id>]` | Scaffolds a draft article. |
| `npm run deploy` | Builds, checks, uploads to S3 and invalidates CloudFront. Only when asked. |
| `npm run infra:deploy` | Creates or updates the AWS CloudFormation stack. Only when asked. |

## Where things are

| Path | What |
|---|---|
| `content/articles/<id>/` | One folder per article: `meta.yaml` (language-independent) + `en.mdx`, `sk.mdx`, plus optional `diagrams/` and `images/` |
| `content/topics.yaml` | The topic tree (ids, localized slugs, names, descriptions) |
| `content/labels.yaml` | Explanation types: high-level, low-level, calculation, trivia, history |
| `content/home.yaml` | Articles featured on the home page |
| `content/pages/<id>/<lang>.mdx` | Non-article pages (About) |
| `src/lib/content/` | Schemas, the pure `buildCatalog` (all validation rules), fs loader, `getCatalog()`, linter |
| `src/lib/markdown/` | remark/rehype plugins: `[[wiki-links]]` → `<Term>`, `lang` injection, math search-ignore |
| `src/lib/urls.ts`, `src/lib/trail.ts` | URL building and fallbacks; the reading-trail state machine |
| `src/i18n/` | `languages.ts` (languages, localized URL sections) and `ui/<lang>.ts` (typed UI strings) |
| `src/components/content/` | Authoring components available in all MDX files: Term, GoDeeper, Analogy, FunFact, Safety, Remember, Figure, Quiz |
| `src/components/diagram/` | `Svg.astro` wrapper + shared arrow markers. Styles are in `src/styles/diagram.css`. |
| `src/widgets/<name>/` | Interactive Svelte widgets: component + `strings.ts` + `model.ts` (tested). Preview all of them at `/lab/en/` in dev. |
| `src/views/`, `src/pages/` | Page views and routes. `[lang]/[page].astro` serves articles and the explore, search and about sections. |
| `infra/`, `scripts/deploy.sh` | AWS: `infra/site.template.yml` (CloudFormation), `infra/cloudfront/router.js` (router function), `infra/render.ts` (inlines the router and the language list) |
| `docs/` | Guides (below) and `superpowers/specs|plans` (design history) |
| `.claude/skills/` | Project skills: `write-article`, `create-widget`, `add-language` |

## How to…

- **Explain a new question or topic:** use the `write-article` skill (`.claude/skills/write-article/SKILL.md`).
- **Build an interactive widget:** use the `create-widget` skill and read `docs/widgets.md`.
- **Add a language:** use the `add-language` skill.
- **Change the topic tree or labels:** read `docs/taxonomy.md`. Ids and slugs are permanent.
- **Deploy:** read `docs/deployment.md`. Only deploy when the owner asks.

## Guides

- `docs/vision.md` — what and why, in the owner's words.
- `docs/writing-guide.md` — how to write articles. **Read before writing any content.**
- `docs/translation.md` — Slovak style, typography, glossary, adding languages.
- `docs/taxonomy.md` — topics, labels, ids, slugs, stubs and drafts.
- `docs/widgets.md` — interactive widgets and diagrams.
- `docs/architecture.md` — how the code fits together, and scaling notes.
- `docs/deployment.md` — AWS setup and deploy.

## Gotchas

- **Astro 7 Markdown.** Astro 7 defaults to the Sätteri processor. We use the `unified()` processor from `@astrojs/markdown-remark` because our remark and rehype plugins need it (`astro.config.mjs`).
- **Whitespace.** `compressHTML: true` is set on purpose; Astro 7's default `'jsx'` strips the spaces between inline elements.
- **Component names.** Components used in MDX must be global (`src/lib/content/components.ts`) or imported in the file. The linter reports anything else.
- **Language injection.** Never write `lang=` in MDX; `remark-inject-lang` adds it from the file name.
- **The `hidden` attribute.** `[hidden]` is forced to `display: none` globally, because component `display` rules otherwise override it.
- **Diagram colours.** Use the `--d-*` tokens and the diagram classes so dark mode works. Never hard-code hex colours.
- **Pagefind.** Search only works on a built site (`npm run build && npm run preview`). Slovak has no stemmer. Each article adds a copy of its title and keywords without diacritics so queries like "elektricky prud" match.
