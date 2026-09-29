# Known issues and continuous deployment — fix plan

**Goal:** fix every entry under "Known issues" in `docs/known-issues.md` (final review of the
platform build, 2026-09-29), set up deploy-on-merge from GitHub, and deploy.

**Owner's request (2026-09-29):** "can you fix the gaps and deploy?" — the missing deploy-on-merge
pieces — "and also what you listed in: Small issues left for later".

**Out of scope** (they need the owner): the human Slovak review, the two fact checks, and the
security-header decisions (CSP, HSTS preload).

## How the work is split

Four groups run in parallel, each in its own git worktree. The controller (the main session)
builds continuous deployment (group E), then reviews and merges every group, runs `npm run check`,
deploys the infrastructure and ships through the new pipeline.

| Group | Tasks | Preview port |
|---|---|---|
| A — trail and search | A1–A6 | 4341 |
| B — widgets and accessibility | B1–B6 | 4342 |
| C — build and deploy | C1–C6 | 4343 |
| D — content and copy | D1–D4 | 4344 |
| E — continuous deployment | E1–E4 | controller |

## Global constraints (every task)

- Read `CLAUDE.md` first. Widgets: `.claude/skills/create-widget/SKILL.md` and `docs/widgets.md`.
  Content: `.claude/skills/write-article/SKILL.md`, `docs/writing-guide.md`, `docs/translation.md`.
- Test first. Write the failing test, run it and see it fail for the right reason, fix, see it pass.
  Where a test is impossible (pure wording, CSS), say how you verified instead.
- Commit after each task: one focused commit, imperative subject, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Before finishing, run `npm run check` (types, tests, content lint, build, dist checks). It must
  pass.
- Never push, deploy or call AWS.
- Leave `docs/known-issues.md`, `CLAUDE.md`, `infra/site.template.yml`, `.github/` and the
  dependencies in `package.json` alone. The controller owns them.
- DOM tests: `happy-dom` is installed. Put `// @vitest-environment happy-dom` at the top of the test
  file. Vitest already compiles `.svelte` files through Astro's config, so
  `render` from `svelte/server` works in plain Node tests. Astro components can be rendered with
  `experimental_AstroContainer` from `astro/container`.
- Browser checks: run `npm run preview -- --port <your port> --host 127.0.0.1` in the background,
  use a fresh Playwright context (`page.context().browser().newContext()`), and stop the server
  when done.
- Record every judgement call as `Ruling: <decision> — <why> — <cost if wrong>` in your report.

## Group A — trail and search

**A1. Back and Forward keep the reading trail.** Rule 1 in `src/lib/trail.ts` cuts the trail back
when the reader returns to an article already in it. After atom → electron, Back shows [Atom], and
Forward then shows only [Electron], so the trail disappears.
- Give the trail browser-history behaviour. Keep the steps after the current one as forward stops.
  Returning to an earlier step (Back, or a trail link) moves the current position back without
  dropping the later steps. Going Forward to the next stop moves it forward again. Following a link
  to a new article from an earlier position drops the forward stops and appends the new article.
- The displayed trail is the steps up to and including the current one, so the look is unchanged.
- Keep the intent rules (30 s lifetime, modifier clicks ignored), the cap of 8 and the reset on
  language change.
- Stored values without the new position field must still load, as "at the last step".
- Tests: atom → electron → Back → Forward shows [atom, electron]. atom → electron → Back → link to
  voltage shows [atom, voltage].

**A2. Unexpected stored state never breaks the trail.** `src/scripts/trail.ts` parses `gd:trail`
without checking its shape, so an unexpected value throws on every article page until the tab
closes.
- Treat anything that is not the expected shape as an empty trail, and overwrite it on the next
  save. Do the same for `gd:intent`.
- Tests: `null`, a number, invalid JSON, `{items: 'x'}`, items with missing or wrongly typed fields.

**A3. Test the back/forward cache path.** Nothing tests the `pageshow` handler with
`persisted: true`.
- Add a happy-dom test that loads the trail script against a minimal page, changes
  sessionStorage, fires `pageshow` with `persisted: true`, and asserts that the trail re-renders
  from storage.
- A small refactor for testability (such as an exported init function) is fine if behaviour stays
  the same.

**A4. Keep page chrome out of the search index.** Inside the indexed `<article>`, these are
searchable, so "short answer" and "min read" match every article:
- the label chips and reading time (`ArticleHeader.astro`)
- the "The short answer" tab label (`ShortAnswer.astro`)
- the "Good to know first" line (`GoodToKnow.astro`)

Mark only that chrome `data-pagefind-ignore`. Titles, summaries, the short answer's own text and
the body stay indexed. Test with the Astro container API.

**A5. Tell no-JS readers that search needs JavaScript.** Add a `<noscript>` message to the search
page that says search needs JavaScript and links to Explore.
- EN and SK strings go in `src/i18n/ui/*.ts`, next to the other `search.*` keys.
- Test that the rendered search view contains it.

**A6. Search results always match the input.**
- Clearing the input within the 180 ms debounce still shows the old results
  (`search-dialog.ts`, `search-page.ts`), and a slow earlier query can overwrite a newer one.
- `loadPagefind` (`search-client.ts`) caches a failed load for the life of the page.
- Required behaviour:
  - Clearing shows the empty or hint state at once and cancels pending work.
  - Responses for outdated queries are dropped.
  - A failed load shows the existing "unavailable" message, and the next search retries.
- Tests: fake timers, and a fake loader and search function. Extract small pure helpers if needed.

## Group B — widgets and accessibility

**B1. Controls stay inert until the widget hydrates.** Sliders and radios are disabled until
hydration. These are live in the server render but do nothing without JS:
- the Ohm's law presets
- the heat-pump part buttons
- the series/parallel bulb buttons
- any other widget buttons
- the SVG hot-spots (`g[role=button][tabindex=0]`)

Required:
- In the server render, and until hydration, these buttons are disabled.
- The hot-spots are neither focusable nor exposed as buttons.
- After hydration, everything works as it does today.
- Use the kit's existing mechanism.

Test: server-render every widget with `svelte/server`. The output must contain no enabled
`<button>` and no `tabindex="0"`.

**B2. Readouts announce settled values, not every step.** Every `Readout` is `aria-live`, so
dragging a slider queues an announcement per step.
- The visible number still updates at once.
- Screen readers hear the value once it has settled: a polite live region updated about 0.5–1 s
  after the last change. Use a better pattern if you find one, and document it.
- Test the settling logic with fake timers.
- Update the `Readout` row in `docs/widgets.md`.

**B3. No links inside Explore's `<summary>`.** `TreeNode.astro` puts the topic link inside
`<summary>`, which already acts as a button.
- The summary holds only non-interactive content: the topic name and the count.
- The topic page stays one tap away from the tree, with a target of at least 44 px.
- The no-JS view stays as it is: details open by default, articles visible.
- Keep the look close to today's.
- Test that no `<summary>` contains an `<a>`.

**B4. With motion off, AC/DC still shows a direction.** AcDc starts at `time = 4` and resets to it.
With f = 0.5 Hz, sin(4π) = 0, so the first frame shows "stopped" with no arrow. That frame is what
readers see with reduced motion and without JS.
- The first frame in AC mode shows current flowing, while the graph still shows a full window.
  For example, start at a peak.
- Export the start time from the model and test that it gives a non-zero AC current, in
  `tests/widgets/models.test.ts`.

**B5. Series/parallel: a two-bulb series circuit, and correct plurals.** SeriesParallel always has
3 bulbs, so the spec's 2-bulb series case cannot be built. Its English screen-reader text can say
"1 bulbs are lit".
- The reader can choose 2 or 3 bulbs, in both series and parallel. A kit `Toggle` is fine.
- The physics stays right: in series, each of N bulbs gets V/N; in parallel, each gets V.
- English says "1 bulb is lit" and "2 bulbs are lit". The Slovak must read naturally for 1, 2
  and 3.
- Check that the articles that embed the widget still describe it correctly, in both languages.
- Tests: model tests for 2-bulb series and parallel, and a strings test for plurals.

**B6. A stable radio name in Toggle.** `Toggle.svelte` builds the radio group's `name` with
`Math.random()`. Every build differs, and the name changes between the server render and
hydration.
- Use Svelte's `$props.id()` (Svelte 5.57 is installed).
- Test: two server renders give the same output.

## Group C — build and deploy

**C1. Close the gaps in the dist checker** (`src/lib/check-dist.ts`, fixture tests in
`tests/check-dist.test.ts`).
- A widget root passes as long as it contains any element, and the frame's title always counts.
  Require real content inside the frame chrome: a drawing (`svg` with shapes) or a control.
- Absolute URLs to the site itself are never checked: canonical, hreflang alternates, `og:url`
  and `sitemap.xml`. Check that each maps to a built file (`/x/` → `x/index.html`).
- Only the diacritics-free title is asserted. Also assert the folded term and keywords on Slovak
  pages.

**C2. Escape JSON inside `<script>` tags.** `BaseLayout.astro` (JSON-LD) and `SearchData.astro`
insert `JSON.stringify` output with `set:html`, so a `</script>` or `<!--` in content would break
the page.
- Add one tested helper that escapes `<`, `>`, `&`, U+2028 and U+2029 as `\u` escapes.
- Use it in both places.

**C3. Format dates in UTC.** `ArticleFooter.astro` formats dates in the build machine's timezone.
- Extract a tested helper that uses `timeZone: 'UTC'`.
- Test with a timezone west of UTC, and make sure the test fails before the fix.

**C4. Reproducible builds.** `Svg.astro` uses `Math.random()` ids.
- Make the ids deterministic and unique within a page, for example from the label text plus a
  per-page counter.
- Group B fixes `Toggle.svelte`. Don't edit it.
- Test the id helper.
- Build twice and compare `dist/`. Report every file that still differs and why.

**C5. Prune old assets only after a grace period.** `scripts/deploy.sh` deletes old `_astro` files
right after the invalidation. A reader with a page open during a deploy then gets 404s when a
widget loads lazily.
- Delete only `_astro/` objects that are missing from the current build and were last modified
  more than 7 days ago.
- Put the selection in a tested pure function, with a small script that calls the AWS CLI:
  `s3api list-objects-v2` with paging, and `s3api delete-objects` in batches of up to 1,000.
- `deploy.sh` calls the script. It needs only the permissions the deploy already has: ListBucket
  and DeleteObject.
- Update only step 6 of "What `npm run deploy` does" in `docs/deployment.md`.
- Do not run it against AWS.

**C6. Language aliases: own properties only.** `infra/cloudfront/router.js` and
`src/lib/language-pick.ts` look up aliases in plain objects, so `Accept-Language: constructor`
redirects to a broken URL.
- Count only own properties.
- The router must stay valid `cloudfront-js-2.0` (ES5-style code:
  `Object.prototype.hasOwnProperty.call`).
- Tests: a router test (`constructor` → 302 to `/en/`) and a language-pick test.

## Group D — content and copy

**D1. Heat-pump wording.** `heat-pump/{en,sk}.mdx` says 1 unit of electricity *moves* 3–4 units of
heat: around lines 99–101 and in the Remember box. In fact, the pump delivers 3–4 units, and about
1 of them is the electricity itself; the rest is collected outside.
- Write accurate, kid-level wording in both languages.
- Keep it consistent with the HeatPumpBalance diagram in `conservation-of-energy`, the
  `coefficient-of-performance` article and the CopExplorer text.
- Fix any other place with the same imprecision.

**D2. The home page's demo word lives in the dictionary.** `HomeView.astro` hard-codes the demo
search word per language.
- Move it into `src/i18n/ui/*.ts`, so a new language must supply it.

**D3. A localized 404 page.** The 404 page's header and footer are always in English.
- A reader who hits a missing page under `/sk/…` sees Slovak chrome and text. Every other path
  gets English.
- The page is one static `/404.html` that CloudFront serves for every missing path, so the choice
  happens in the browser, before first paint (for example, an inline `<head>` script that sets a
  class).
- Without JS, show English, or both languages; document which.
- Mind the `hidden` gotcha in `CLAUDE.md`.
- Test the rendered page, and check it in a browser.

**D4. Spaced en dashes in Slovak, enforced.** Slovak site chrome uses "—" where
`docs/translation.md` asks for a spaced en dash ("–"):
- `src/i18n/ui/sk.ts`: the tagline, the draft notice and the home intro
- `content/pages/about/sk.mdx`
- the Slovak label descriptions in `content/labels.yaml`
- also check `topics.yaml` and every widget's Slovak strings

Required:
- Fix every one.
- Make the rule stick: `lint:content` flags "—" in `sk.mdx` prose and in Slovak YAML fields, and
  a unit test covers `src/i18n/ui/sk.ts` and the widgets' Slovak strings.
- English keeps its em dashes.

## Group E — continuous deployment (controller)

**E1. A GitHub login for AWS, and a deploy role** (`infra/site.template.yml`).
- Add the `token.actions.githubusercontent.com` OIDC provider and the role
  `guydeatory-github-deploy`.
- Only `repo:GuyDea/guydeatory:ref:refs/heads/main` may assume the role.
- Its permissions:
  - `cloudformation:DescribeStacks` on this stack
  - `s3:ListBucket`, `s3:PutObject` and `s3:DeleteObject` on the site bucket
  - `cloudfront:CreateInvalidation` and `cloudfront:GetInvalidation` on the distribution
- `scripts/infra-deploy.sh` passes `CAPABILITY_NAMED_IAM`.
- Verify with `aws iam simulate-principal-policy`.

**E2. Workflows.**
- `.github/workflows/check.yml` runs `npm run check` on pushes to any branch except `main`.
- `.github/workflows/deploy.yml` runs `npm run deploy` with the role on pushes to `main`, and on
  manual dispatch. It has `id-token: write` and one deploy at a time.

**E3. Docs.** Update `docs/deployment.md`, `CLAUDE.md` (merging to `main` deploys) and
`docs/known-issues.md` (remove what was fixed).

**E4. Ship it.**
1. Merge groups A–D and run `npm run check`.
2. Run `npm run infra:deploy`, which updates the role and the router.
3. Push the branch and wait for the check workflow to pass.
4. Fast-forward `main` and wait for the deploy workflow to pass.
5. Verify the live site.
