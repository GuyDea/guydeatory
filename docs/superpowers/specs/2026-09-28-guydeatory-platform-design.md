# Guydeatory — platform design

- **Date:** 2026-09-28
- **Status:** awaiting review
- **Branch:** `feat/platform-foundation`

## 1. Purpose

Guydeatory ("guide" + "-atory", as in *laboratory* or *observatory*) is a static website where every
question about how something works gets its own article, explained from the absolute fundamentals.
It is built for a whole family: the base layer of every article must be understandable by a child of
about **8–10 reading alone**, while grown-ups can dig deeper in the same article.

Success looks like this:

- A child opens "How does electric current work?" and understands the short answer and the main text
  without help. They click any unfamiliar word to learn it, and find their way back again.
- A parent expands the "Go deeper" parts and gets the precise, correct version: formulas, exact terms
  and the limits of each analogy.
- Anyone can find an article by searching, by browsing the topic tree, or by filtering on the type of
  explanation (big picture, under the hood, fun facts, history…).
- Adding the 1,000th article is as easy as adding the 10th. Adding a third language needs no
  restructuring.

### Decisions already made

| Decision | Choice |
|---|---|
| Audience | Kids ~8–10 reading alone, plus adults. One layered text per article, not separate versions. |
| Languages | English and Slovak are required from day one. More languages are added later. |
| Stack | Astro 7 + MDX + Svelte 5 islands + Pagefind |
| Hosting | `theguydea.com` (apex, `www` redirects to it) on AWS S3 + CloudFront. The Route53 zone exists and is empty. |
| Where the work lives | Branch `feat/platform-foundation`, committed progressively |
| "AC" | Air conditioning. An air conditioner is a heat pump that only runs one way. |

## 2. Scope of this iteration

**In scope:**

- The platform: content model, build-time validation, routing, i18n, search, explore tree, article
  UI, authoring components, widget kit and design system.
- The initial content (§13).
- AWS infrastructure and a deploy script.
- Steering files for future work (§12).

**Out of scope:** see §16.

## 3. Architecture overview

- **Astro 7, static output.** Pages use the directory format with trailing slashes
  (`/en/voltage/` → `dist/en/voltage/index.html`).
- **Content** lives in the top-level `content/` folder as MDX text plus YAML metadata. It is loaded
  through Astro content collections (glob loaders) and checked against Zod schemas.
- **Interactivity:**
  - Rich simulations are Svelte 5 components hydrated as islands (`client:visible`).
  - Small behaviours are plain TypeScript scripts: term previews, the reading trail, theme switching
    and quizzes.
  - A page loads no framework runtime unless it contains a widget.
- **Math:** `remark-math` + `rehype-katex`, rendered to static HTML at build time. Only KaTeX's CSS
  and fonts are loaded in the browser.
- **Search:** Pagefind runs over the built site. It builds one index per language and supports filters
  for labels and topics.
- **Validation:** one "catalog" module loads all content, cross-checks it and fails the build with a
  readable list of problems.
- **Tests:** Vitest for the pure logic, plus a post-build checker that inspects `dist/`.
- **Infrastructure:** one CloudFormation stack in us-east-1 and a deploy script using the AWS CLI.

```
.
├── CLAUDE.md                     steering: vision, rules, commands, map
├── content/                      everything a writer touches
│   ├── articles/<id>/            one folder per article (see §4)
│   ├── topics.yaml               the topic tree
│   ├── labels.yaml               explanation types
│   └── home.yaml                 home-page curation
├── src/
│   ├── content.config.ts         collections + schemas
│   ├── i18n/                     languages, UI strings, helpers
│   ├── lib/                      catalog, validation, URLs, reading trail, remark plugins
│   ├── components/               layout + authoring components (Term, GoDeeper, Analogy…)
│   ├── widgets/<name>/           Svelte widgets, their strings and physics models
│   ├── layouts/  pages/  styles/
├── scripts/                      scaffolder, dist checker, deploy
├── infra/site.yml                CloudFormation
├── tests/
├── docs/                         guides (see §12) + superpowers/specs|plans
└── .claude/skills/               project skills (write-article, add-language)
```

## 4. Content model

### 4.1 Articles

Each article is one folder, named by the article's **ID**:

```
content/articles/electric-current/
├── meta.yaml        language-independent facts
├── en.mdx           English text
├── sk.mdx           Slovak text
├── diagrams/        optional article-specific diagram components (.astro)
└── images/          optional images (optimised at build)
```

**ID rules:**

- Lowercase English kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`).
- Globally unique and permanent.
- When two concepts share a name, add a natural qualifier: `electric-current` vs `ocean-current`.
- Folders are **flat**, with no topic subfolders. Articles can then belong to several topics and be
  re-filed without anything breaking. Wikipedia uses the same model at millions of pages.

**`meta.yaml`**

| Field | Req. | Meaning |
|---|---|---|
| `topics` | yes | Topic IDs, at least one. The first is the primary topic and drives the topic breadcrumb. |
| `labels` | yes | Explanation types, at least one (§4.3). |
| `prerequisites` | – | Article IDs worth knowing first. Shown as "Good to know first". |
| `related` | – | Ordered article IDs for "Where to next?". |
| `status` | yes | `published`, `stub` or `draft`. A stub is a real but short page and is badged as such. Drafts are left out of production builds. |
| `created`, `updated` | yes | ISO dates. |
| `sources` | – | `[{ title, url }]` backing the facts and numbers. Shown at the bottom. |

**Language file frontmatter** (`en.mdx`, `sk.mdx`, …)

| Field | Req. | Meaning |
|---|---|---|
| `title` | yes | The page heading, usually a question a child would ask: "How does electric current work?" |
| `term` | – | The short name used when other pages link here and in lists ("electric current"). Defaults to `title`. |
| `slug` | yes | The URL segment in this language (`elektricky-prud`). Permanent once published. |
| `summary` | yes | 1–2 kid-level sentences: "the short answer". Reused in link previews, cards, search results and the meta description. |
| `keywords` | – | Synonyms and search terms ("AC", "air conditioner"). |
| `reviewed` | – | Whether a human has checked this language version. Defaults to `false`. Only used by tooling; never shown publicly. |

### 4.2 Topics

`content/topics.yaml` is a nested tree. Each topic has:

- an `id`
- a `slug` for each language
- a `name` for each language
- a one-line `description` for each language
- an optional icon

Articles point to topics by ID (many-to-many). Topic pages have flat URLs, so moving a topic to a
different parent never breaks a link. A topic with no published articles, neither directly nor in any
of its subtopics, gets no page and is hidden in the UI.

The initial tree only holds what the first content needs. `docs/taxonomy.md` lists the planned
top-level domains so that future topics land in a consistent place:

```
science
└── physics
    ├── electricity
    ├── heat          (heat & temperature)
    └── matter        (atoms & matter)
technology
└── home-technology   (heat pumps, air conditioning, …)
```

### 4.3 Labels (type of explanation)

`content/labels.yaml` holds the controlled vocabulary, with translated names, descriptions and a
colour for each label. Adding a label means adding one YAML entry.

| ID | EN name | SK name | Meaning |
|---|---|---|---|
| `high-level` | Big picture | Celkový obraz | What it is and why it matters. Intuition first, little or no math. |
| `low-level` | Under the hood | Pod kapotou | The detailed mechanism, with precise terms. |
| `calculation` | Numbers & formulas | Čísla a vzorce | How to calculate it, with worked examples. |
| `trivia` | Fun facts | Zaujímavosti | Surprising facts, myths and curious questions. |
| `history` | History | História | Who discovered or invented it, and how. |

### 4.4 Site data

`content/home.yaml` lists the featured articles for the home page, in order.

## 5. Terms and links

### 5.1 Wiki-link syntax

- `[[voltage]]` links to the article with ID `voltage`. The link text is that article's `term` in the
  current language.
- `[[voltage|napätím]]` uses custom link text. Slovak needs this because nouns change form with
  grammatical case.

IDs are the same in every language, so translators never deal with URLs. A remark plugin turns the
syntax into `<Term>` elements, and the `Term` component resolves the ID against the catalog in the
page's language. The plugin also passes the page language to every component in the MDX file, so
authors never write `lang=` themselves.

### 5.2 When a term becomes its own article

Link a term when it names a concept that meets both conditions:

- (a) it means something beyond the current article, and
- (b) explaining it fully here would pull the reader away from the main topic.

Things central to the topic are explained inline. For example, the compressor is explained inside the
heat-pump article, not on its own page.

Link a term on its first use. You may link it again in a later section that is far away. Never link
every occurrence; highlights lose their meaning when everything is highlighted.

### 5.3 Presentation

- Terms are clearly highlighted (a tint plus a dotted underline).
- Hover or keyboard focus shows a preview card with the target's title and summary. The preview data
  is embedded at build time, so no extra request is needed.
- Clicking a term navigates to its article and extends the reading trail (§6.3).

### 5.4 Integrity

- The build fails when a link targets an unknown article, or a draft in production.
- Backlinks ("Used in") are computed from all wiki-links at build time.
- When an optional language is missing a translation, the link falls back to the default-language
  page and shows a small language badge.

## 6. Navigation and URLs

### 6.1 URL scheme

| Page | English | Slovak |
|---|---|---|
| Home | `/en/` | `/sk/` |
| Article | `/en/electric-current/` | `/sk/elektricky-prud/` |
| Topic | `/en/topics/electricity/` | `/sk/temy/elektrina/` |
| Explore (tree) | `/en/explore/` | `/sk/objavuj/` |
| Search | `/en/search/` | `/sk/hladaj/` |
| About | `/en/about/` | `/sk/o-projekte/` |

- Section names such as `topics` and `explore` are defined per language in the language config.
- The build rejects any article slug that collides with a section name.
- Every page gets:
  - a canonical URL
  - `hreflang` alternates pointing to its translations
  - an entry in a custom `sitemap.xml` that lists those alternates

### 6.2 Language entry

`/` redirects to a language homepage. The CloudFront Function picks the language in this order:

1. the `lang` cookie, which is set when a visitor picks a language
2. the `Accept-Language` header
3. English

A static `index.html` does the same in the browser, for local preview and as a fallback.

### 6.3 Breadcrumbs: two kinds

- **Topic path (static, always shown):** Home › Science › Physics › Electricity. This is where the
  article lives in the library. It is also emitted as a schema.org `BreadcrumbList`.
- **Reading trail (client-side):** "Your path: Electric current › Voltage › Electron". It shows how the
  reader got here through term links.
  - The trail is kept in `sessionStorage`.
  - Clicking an earlier item goes back and trims the trail.
  - Opening an article any other way (search, explore, a typed URL) starts a new trail.
  - The trail is capped at 8 items, with the middle collapsed.
  - Switching language resets the trail.
  - The state logic is a pure, unit-tested function.

### 6.4 Language switcher

The switcher links to the same article in each language. Languages without a translation are shown
disabled, with a "not translated yet" hint. Choosing a language sets the `lang` cookie.

## 7. Article anatomy

### 7.1 Page layout (top to bottom)

1. Topic path and reading trail
2. Title, label chips and reading time
3. **The short answer**: the `summary`, in a highlighted box
4. **Good to know first**: prerequisites, when there are any
5. **Body**:
   - main text at kid level
   - diagrams and widgets placed exactly where they help
   - collapsible **Go deeper** blocks for grown-ups
   - by convention, a closing **Remember** recap and an optional **Check yourself** quiz
6. **Where to next?** (related), **Used in** (backlinks), **Sources** and the last-updated date

Articles with three or more sections get a table of contents on wide screens.

### 7.2 Authoring components

These are available in every MDX file without an import:

| Component | Use |
|---|---|
| `[[id]]` / `Term` | Link to another article (§5) |
| `GoDeeper` | Collapsible block for grown-ups: math, precise terms, where an analogy breaks. Its content is still indexed for search. |
| `Analogy` | "Imagine…" box for an everyday comparison |
| `FunFact` | Short surprising aside |
| `Safety` | Safety note. Electricity articles need these. |
| `Remember` | Key-ideas recap |
| `Figure` | Wrapper for a diagram or image, with a caption |
| `Quiz` | "Check yourself" multiple-choice question with an explanation |

Widgets are Svelte components imported explicitly with `client:visible`. The language is injected
automatically.

## 8. Discovery

- **Search (Pagefind):**
  - A header search opens with a button, <kbd>/</kbd> or <kbd>Ctrl/⌘ K</kbd>, and shows instant
    results.
  - A full search page adds label and topic filters.
  - Titles and keywords are weighted above body text.
  - There is one index per language. No server is involved.
- **Explore:**
  - The full topic tree with every article in it, filterable by label chips and a quick text filter.
  - The filter state is kept in the URL (`?label=trivia`).
  - The page is server-rendered as nested `<details>` elements, so it works without JavaScript.
- **Topic pages:** list subtopics, and articles grouped by label. This covers sorting by type of
  explanation.
- **Home:**
  - the tagline and a big search box
  - featured articles
  - top-level topics
  - a short "what the labels mean" section that links into Explore with a filter set

## 9. Internationalisation

- `src/i18n/languages.ts` lists each language with:
  - its code and native name
  - whether it is required
  - its localised section names
  - its date format

  The default language is `en`.
- **UI strings** live in `src/i18n/ui/<lang>.ts`. TypeScript forces every language to define every key.
- **Widget strings** sit next to each widget and use the same typing.
- **Content:** one MDX file per language per article. Topic and label names live in YAML.
- **Required languages** (`en`, `sk`): a missing translation is a build error.
- **Optional languages** (added later): pages exist only for translated articles, and links fall back
  as described in §5.4. A language can therefore go live gradually.
- **Slovak style:** the informal *ty* form, which is natural for children, and the terminology used in
  Slovak schools. Both are recorded in the glossary in `docs/translation.md`.

## 10. Design and experience

- **Look:** a friendly "science notebook" style.
  - Warm paper-like background and crisp ink-coloured text.
  - One colour per label and rounded shapes.
  - Not childish: adults should enjoy reading it too.
  - The visual direction is set during implementation using the frontend-design guidance.
- **Readability:**
  - 18–20 px body text and lines of about 65 characters.
  - Generous spacing and contrast at WCAG AA or better.
  - Self-hosted fonts with full Slovak diacritics (č ď ľ ĺ ň ŕ š ť ž ô ä).
- **Theme:** light, dark or system. Motion respects `prefers-reduced-motion`.
- **Tablets and small hands:**
  - touch targets of at least 44 px
  - nothing that only works on hover
  - every widget works by touch and by keyboard
- **Privacy (it is a site for kids):**
  - no trackers, no analytics, no third-party requests
  - only a language cookie and a theme preference are stored
- **Budgets:**
  - A page without widgets ships at most 15 KB of JS (gzipped).
  - Each widget ships at most 30 KB (gzipped).
  - Lighthouse scores of at least 95 in every category.

## 11. Validation and testing

**Build-time validation.** The catalog collects every problem, then fails the build once, listing
file paths and fix hints. It checks:

- the schema of every YAML and frontmatter file
- that every required language exists for every article
- that every referenced article, topic and label exists
- that slugs are unique within a language and not reserved
- that no published page links to a draft
- that topic IDs and slugs are unique

**Unit tests (Vitest):**

- catalog building and validation rules
- URL building and slug rules
- the wiki-link and language-injection remark plugins
- the reading-trail state machine
- the topic-tree helpers
- i18n completeness
- the physics models behind the widgets (Ohm's law, heat-pump COP, boiling point vs pressure, AC
  waveform)

**Post-build checker (`scripts/check-dist`):**

- every internal link and asset in `dist/` resolves
- every article page has a title, a description, a canonical URL and `hreflang` alternates
- the search index exists for every language

**Browser verification** before deploying:

- the key pages on desktop and on mobile, in light and dark themes
- keyboard use of the widgets

## 12. Steering files

| File | Purpose |
|---|---|
| `CLAUDE.md` | Vision in brief, non-negotiable rules, commands, repo map, how to add an article, pointers to the guides below |
| `docs/vision.md` | The product idea and audience, in the owner's words plus these decisions |
| `docs/architecture.md` | Stack, content model, routing, i18n, search, validation, scaling notes |
| `docs/writing-guide.md` | Voice and reading level, the article template, analogies, linking rules, when to split an article, the labels, Go deeper, safety notes, checklists |
| `docs/taxonomy.md` | Topic tree rules, planned top-level domains, ID and slug conventions, the label vocabulary |
| `docs/translation.md` | Translation principles, Slovak style and glossary, adding a language |
| `docs/widgets.md` | How to build a widget: structure, strings, accessibility, reduced motion, testing |
| `docs/deployment.md` | AWS resources, deploy commands, cache rules, troubleshooting |
| `.claude/skills/write-article/` | Step-by-step process for turning a question into articles: find existing articles, plan the terms, write EN, write SK, diagrams and widgets, validate, build |
| `.claude/skills/add-language/` | Checklist for adding a language |
| `npm run new:article <id>` | Scaffolds `meta.yaml` and one language file per language from templates |

## 13. Initial content

All articles are written in both EN and SK.

| ID | Labels | Notes |
|---|---|---|
| `electric-current` | high-level | Main article: what flows, why, closed loops, conductors, safety |
| `calculating-electric-current` | low-level, calculation | Amperes as charge per second, Ohm's law, power, worked everyday examples |
| `how-electric-current-behaves` | low-level | Series and parallel, heating, magnetism, AC vs DC, how fast electricity is, short circuits |
| `heat-pump` | high-level | Main article: air conditioning and heat pumps. Moving heat instead of making it, the refrigerant loop, reversing it for heating, efficiency |

**Supporting term articles.** The expected set is:

- **Electricity:** `atom`, `electron`, `electric-charge`, `voltage`, `electrical-resistance`,
  `conductors-and-insulators`, `electric-circuit`, `ohms-law`, `electric-power`, `alternating-current`
- **Energy and heat:** `energy`, `conservation-of-energy`, `heat`, `temperature`, `pressure`,
  `evaporation-and-condensation`, `boiling-point`
- **Heat pumps:** `refrigerant`, `coefficient-of-performance`

The final list is settled while writing, under one rule: every `[[term]]` used must resolve to a real
article.

**Showcases for the other labels:**

- `why-birds-on-wires-dont-get-shocked` (trivia)
- `history-of-electricity` (history)

**Widgets:**

| Widget | Shows |
|---|---|
| ElectronFlow | Open or closed circuit, a voltage slider, drifting electrons and a glowing bulb |
| OhmsLawPlayground | Voltage and resistance sliders giving current and power, with everyday presets |
| SeriesParallel | Two or three bulbs; remove one and see what happens |
| AcDc | One-way flow vs back-and-forth flow, with a live graph |
| HeatPumpCycle | The four-part loop, with refrigerant coloured by temperature, a cooling/heating switch and clickable parts |
| CopExplorer | Outdoor temperature against how much heat you get per unit of electricity |
| BoilingPoint | Pressure against boiling temperature: a mountain vs a pressure cooker |

## 14. Deployment

**CloudFormation stack `guydeatory-site`** (us-east-1). Parameters: the domain and the existing hosted
zone `Z06939482PPSH3VUZ9L07`.

- **S3 bucket:** private, with public access blocked and SSE-S3 encryption. It is readable only by
  CloudFront, through Origin Access Control.
- **ACM certificate** for `theguydea.com` and `www.theguydea.com`, validated automatically through
  DNS in the zone.
- **CloudFront distribution:**
  - aliases for the apex and `www`, HTTP/2 and HTTP/3, compression, price class 100 (Europe and North
    America)
  - the managed security-headers policy (HSTS, nosniff, frame and referrer rules)
  - 403 and 404 responses serve `/404.html` with a 404 status
- **CloudFront Function (viewer request):**
  - `www` → apex (301)
  - `/` → language redirect (§6.2)
  - paths ending in `/` → `…/index.html`
  - extensionless paths without a trailing slash → the same path with a slash (301)
- **Route53:** A and AAAA alias records for the apex and `www`.

**Deploy (`npm run deploy`):**

1. Build, validate and index.
2. Run the post-build checker.
3. `aws s3 sync` in two passes:
   - hashed assets (`_astro/`) with `max-age=1y, immutable`
   - everything else (HTML, Pagefind entry files) with `max-age=0, s-maxage=1y, must-revalidate`
4. A CloudFront invalidation of `/*`.

`npm run infra:deploy` creates or updates the stack. Both commands use the local `default` AWS
profile.

## 15. Scaling notes (thousands of articles)

- **Flat IDs and many-to-many topics.** Adding or moving articles never changes URLs. The ID is the
  single stable key.
- **Build.** Astro's content layer caches parsed content between builds. Several thousand MDX pages
  build in minutes. Cross-checks and backlinks cost time in proportion to the number of links, which
  is negligible.
- **Search.** Pagefind splits its index into chunks and loads only the ones a query needs, so the
  first search downloads well under 100 KB even at 10k+ pages.
- **Explore.**
  - Rendering the whole tree on the server is fine up to about 5k articles (about 100 KB compressed).
  - Beyond that, switch to lazy per-topic data files.
  - `docs/architecture.md` records this threshold.
- **Languages.** The optional-language fallback lets a new language launch with a handful of articles.
- **Consistency.** The `write-article` skill and the writing guide keep the voice, structure and
  linking the same no matter who writes, or when.

## 16. Out of scope and future ideas

- User accounts, comments and a CMS editing UI. The content is files in git.
- CI/CD, for example GitHub Actions with an AWS OIDC role deploying on merge to `main`. This is
  documented as the next step and needs your go-ahead to set up.
- Privacy-friendly analytics.
- Read-aloud narration for pre-readers, generated per-article social images and a print stylesheet.
- A visual "knowledge map" of how articles link to each other.
