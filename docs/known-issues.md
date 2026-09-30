# Known issues and next steps

What is still open, and the next steps that need the owner. Check this list before working in
the same area, and delete an entry once it is fixed.

Every issue from the final review of the platform build (2026-09-29) is fixed. See
`docs/superpowers/plans/2026-09-29-known-issues-and-ci.md` for what was done.

## Known limitations

- **Pagefind reorders its filter files on every run.** Two builds of identical HTML differ only
  in about 13 files under `dist/pagefind/` (filters, meta, entry), so each deploy re-uploads them.
  The cause is upstream (Pagefind 1.5), and it is harmless. Everything else in `dist/` is
  byte-identical from build to build.
- **`npm test` needs the network on a fresh checkout.** Tests that render the layouts resolve the
  self-hosted fonts, and the first run downloads them from Google Fonts into `.astro/`, as
  `npm run build` does.
- **Widget behaviour after hydration has no automated test.** Under happy-dom, `svelte` resolves to
  its server build, so the tests cover the server render (`tests/widgets/server-render.test.ts`)
  and the models. Check clicks and keys in a browser.
- **Find-in-page does not unfold a folded Explore topic.** Each topic's `<details>` holds only its
  summary, and CSS hides the lists after it while the topic is folded. This keeps the topic link
  out of the `<summary>`. Topics start unfolded, and the Explore filter unfolds matches.

## The chemistry labs (atoms-and-molecules section, 2026-09-30)

From the review of the section. The review's must-fix items are fixed; these were left for later.

- **Molecule Lab: rings are drawn tangled.** Benzene (it just fits the 12-atom limit) and
  cyclopropane come out with crossing bonds. `layout.ts` does not avoid crossings, and the layout
  tests don't check for them.
- **Molecule Lab: crowded name tags.** With three or more molecules on the board, a name tag can
  land next to the wrong molecule. The card and the screen-reader summary stay correct.
- **Molecule Lab: bond targets on phones.** A bond's tap band is 44 px across but only about 18 px
  along the bond, because the atoms at both ends take priority. Bonds are also reachable with Tab.
  A molecule too big for the board zooms the view out (up to about 1.6×), which shrinks every
  target.
- **Atom Lab: table cells on phones** are about 30 × 44 px: eight real columns don't fit 44 px
  wide. WCAG 2.2 AA's 24 px is met, and the − and + steppers are full-size.
- **Small text:** Molecule Lab labels render at 10–12.5 px on a 360 px phone, like the other
  diagrams.
- **Fallback font for chemical notation:** subscripts and superscripts (H₂O, Na⁺), δ and the
  Molecule Lab's ✓ are not in the self-hosted font files, so they come from the reader's system
  font. They render correctly, just in a slightly different typeface.
- **Quest starts differ:** the Molecule Lab counts its pre-built water as found ("1 of 8" at the
  start), while the Atom Lab never counts its starting atom. Both are deliberate.
- **The footer version of a local build** links to a commit that GitHub may not have yet (a local
  build with uncommitted changes shows "+").

## Next steps (need the owner)

- **Human review of the Slovak text.** Every translation is still `reviewed: false`, including the
  new heat-pump wording and the whole atoms-and-molecules section (both labs included). Phrases
  the writers asked about: "Marie Curie-Sklodowska" vs "Curie-Skłodowská", "trojboký ihlan
  (štvorsten)", "chlórové bielidlo", "čpavok", "Haberov-Boschov proces".
- **Fact checks** that could not be confirmed offline:
  - the 1994 Slovak postage stamp for Jozef Murgaš
  - Aurel Stodola's heat pump in Geneva in 1928, which is widely cited but debated
- **Security headers:** consider a custom response-headers policy with a Content Security Policy
  that uses hashes for the inline scripts (theme, trail, 404 language), and decide on HSTS
  `includeSubDomains` and preload.
