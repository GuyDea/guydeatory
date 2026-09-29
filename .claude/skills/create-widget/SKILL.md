---
name: create-widget
description: Use when an article needs an interactive widget (simulation, slider playground, animated diagram, calculator) on Guydeatory, or when changing an existing widget in src/widgets/.
---

# Creating a Guydeatory widget

Read `docs/widgets.md` first. Look at the existing widgets in `src/widgets/` and reuse them where
possible.

1. **Decide what the reader should discover.** Write it as one sentence, e.g. "More voltage means
   more current and a brighter bulb". That sentence becomes the caption.
2. **Model first (TDD).**
   - Put the physics or maths in `src/widgets/<name>/model.ts` as pure functions.
   - Add a `describe` block for the widget to `tests/widgets/models.test.ts`, with hand-checked
     numbers and edge cases (zero, maximum, "switch open").
   - Watch the tests fail, implement, watch them pass.
3. **Strings.**
   - `src/widgets/<name>/strings.ts` exports `strings = { en: {...}, sk: {...} }`.
   - Type it so every language has every key.
   - Functions are fine for dynamic text: `picture: (r) => \`…\``.
4. **Component.** `src/widgets/<name>/<Name>.svelte` (Svelte 5 runes):
   - Wrap it in `WidgetFrame` (`name`, `title`, `hint`, `lang`, `onreset`).
   - Controls come from the kit: `Slider`, `Toggle`, `Readout`. Numbers go through `formatQuantity`.
   - Draw with `viewBox` SVG and the `--d-*` colours and diagram classes. Never use hex colours.
   - Animate only through `visibleLoop()`. Show a static state when motion is reduced.
   - The server-rendered first frame must make sense without JS.
   - Give the SVG `role="img"` and an `aria-label` that describes the current state in words.
5. **Embed.** Import the widget in the article MDX (both languages) and add `client:visible`,
   inside `<Figure caption="…what to try…" wide>`.
6. **Verify.**
   - `npm test`, `npm run lint:content`, `npm run build && npm run check:dist`.
   - In a browser:
     - 360 px and desktop
     - light and dark mode
     - keyboard and touch
     - reduced motion
     - JS disabled
   - Check the bundle size in `dist/_astro` (≤ 30 KB gzipped per widget).
