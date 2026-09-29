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

## Next steps (need the owner)

- **Human review of the Slovak text.** Every translation is still `reviewed: false`, including the
  new heat-pump wording.
- **Fact checks** that could not be confirmed offline:
  - the 1994 Slovak postage stamp for Jozef Murgaš
  - Aurel Stodola's heat pump in Geneva in 1928, which is widely cited but debated
- **Security headers:** consider a custom response-headers policy with a Content Security Policy
  that uses hashes for the inline scripts (theme, trail, 404 language), and decide on HSTS
  `includeSubDomains` and preload.
