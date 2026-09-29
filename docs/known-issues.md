# Known issues and next steps

Small defects found in the final review of the platform build (2026-09-29) that were left for
later, and the next steps that need the owner. Check this list before working in the same area,
and delete an entry once it is fixed.

## Known issues

### Reading trail

- Back and then Forward drops the trail: rule 1 in `src/lib/trail.ts` discards the later steps.
  Fix with a cursor into the trail, or a list of forward stops.
- `src/scripts/trail.ts` parses the stored `gd:trail` without checking its shape. A value in an
  unexpected format (for example, after the format changes) makes the script throw until the tab
  closes. Treat anything without `Array.isArray(v?.items)` as empty.
- The bfcache path (`pageshow` with `persisted: true`) has no automated test. Playwright's Chromium
  runs with bfcache off.

### Search

- Page chrome inside the indexed `<article>` is searchable, so "short answer" and "min read" match
  every article. It needs `data-pagefind-ignore`:
  - the label chips and reading time (`ArticleHeader.astro`)
  - the "The short answer" tab (`ShortAnswer.astro`)
  - the prerequisites line (`GoodToKnow.astro`)
- With JS off, the search page shows the normal hint. Add a `<noscript>` message.
- If the input is cleared within the 180 ms debounce, old results still appear
  (`search-dialog.ts`, `search-page.ts`). A failed Pagefind load is cached for the life of the page
  (`search-client.ts`).

### Widgets and accessibility

- Presets, part and bulb buttons, and SVG hot-spots can be focused before hydration, but do
  nothing without JS. Sliders and radios are already disabled until then.
- Every `Readout` is `aria-live`, so screen readers queue an announcement on every slider step.
- Explore's `<summary>` elements contain links (`TreeNode.astro`).
- Under reduced motion, AcDc shows "stopped" with no arrow (`AcDc.svelte`: `time = 4` gives
  sin = 0).
- SeriesParallel always has 3 bulbs, so a 2-bulb series circuit cannot be built. Its English
  screen-reader text can say "1 bulbs are lit".

### Build and deploy

- `src/lib/check-dist.ts` has gaps:
  - any element inside a widget root passes
  - absolute URLs to the site itself (canonical, hreflang, sitemap) are not checked
  - only the diacritics-free title is asserted, not the term and keywords
- JSON inside `<script>` tags is not escaped (`BaseLayout.astro`, `SearchData.astro`), so a
  `</script>` in a title would break the page. Escape `<`.
- Article dates use the build machine's timezone. `ArticleFooter.astro` needs `timeZone: 'UTC'`.
- Builds are not reproducible. `Math.random()` ids in `Svg.astro` and `Toggle.svelte` change on
  every build, and the radio `name` differs between the server render and hydration.
- `scripts/deploy.sh` removes old `_astro` chunks right after the invalidation. A reader with a
  page open during a deploy can get a 404 when a widget loads lazily.
- The router and the site's language picker look up aliases in plain objects (`router.js`,
  `language-pick.ts`), so `Accept-Language: constructor` sends that visitor to a broken URL on the
  site.

### Content and copy

- The heat-pump article says 1 unit of electricity "moves" 3–4 units of heat. Strictly, it
  delivers 3–4 units, and about 1 of them is the electricity itself.
- The home page's demo search word is hard-coded per language (`HomeView.astro`).
- The 404 page's header and footer are always in English (`404.astro`).
- Slovak site chrome uses em dashes (—) where `docs/translation.md` asks for a spaced en dash (–):
  - 3 strings in `src/i18n/ui/sk.ts`
  - the About page
  - the label descriptions in `content/labels.yaml`

## Next steps (need the owner)

- **Continuous deployment** from GitHub Actions through an IAM role assumed with GitHub OIDC. This
  creates an IAM role, so it needs the owner's go-ahead (`docs/deployment.md`).
- **Human review of the Slovak text.** Every translation is still `reviewed: false`.
- **Fact checks** that could not be confirmed offline:
  - the 1994 Slovak postage stamp for Jozef Murgaš
  - Aurel Stodola's heat pump in Geneva in 1928, which is widely cited but debated
- **Security headers:** consider a custom response-headers policy with a Content Security Policy
  that uses hashes for the inline theme and trail scripts, and decide on HSTS `includeSubDomains`
  and preload.
