# Interactive widgets and diagrams

Widgets are small interactive exhibits inside articles: sliders, switches, animated circuits, a heat
pump you can switch between cooling and heating. They exist because **changing something and
seeing what happens** teaches better than a paragraph.

## When to build one

- **Build a widget** when a *cause and effect* is the point. More voltage gives a brighter bulb.
  Colder outside means the heat pump gets less efficient.
- **Draw a static diagram instead** (see `docs/writing-guide.md` §9) when the picture alone
  explains it.
- Main articles should have at least one widget. Term articles usually need only diagrams.
- Reuse before you build. Widgets are shared, and one can serve many articles.

## Folder layout

```
src/widgets/<name>/
  <Name>.svelte     the component (Svelte 5, runes)
  strings.ts        UI text for every language, typed
  model.ts          pure physics / maths, no DOM (unit-tested)
tests/widgets/models.test.ts   one describe block per widget model
```

| Kit file (`src/widgets/kit/`) | Purpose |
|---|---|
| `WidgetFrame.svelte` | The exhibit frame. The root has `data-widget`, `role="group"` and `aria-label`, plus a title, an optional hint and a reset button. Use it for every widget. |
| `Slider.svelte` | Labelled range input, value readout with unit, big thumb (≥ 44 px touch area), keyboard accessible. The slider speaks its own value (`aria-valuetext`); the copy on screen is not a live region. |
| `Toggle.svelte` | Segmented choice (radiogroup), e.g. DC / AC or cooling / heating |
| `Button.svelte` | Pill button for a widget's actions: presets, places, parts, bulbs. `pressed` makes it an on/off button. |
| `Readout.svelte` | Large number with a label. The number on screen changes at once. Screen readers hear "label: value" from a visually hidden polite live region once the value has settled, 0.7 s after the last change (`settle.ts`), so a dragged slider is announced once, not at every step. The on-screen copy is `aria-hidden`, so nothing is read twice. |
| `settle.ts` | `settle(announce)`: passes a changing value on only once it has stopped changing for `SETTLE_MS` (700 ms) |
| `hotspot.ts` | `hotspot(live, label, activate)`: spread onto an SVG shape to make it a keyboard-operable button once the widget is live |
| `hydration.svelte.ts` | `hydrated()`: a reactive flag, false in the server render and true once the widget has hydrated |
| `motion.svelte.ts` | `reducedMotion()` and `visibleLoop()`: runs `requestAnimationFrame` only while the widget is on screen and motion is allowed |
| `format.ts` | `formatNumber()` / `formatQuantity()` with the right decimal comma and non-breaking spaces per language |
| `strings.ts` | Shared kit strings (Reset, Play, Pause…) |

## Rules

1. **The physics lives in `model.ts`** and is unit-tested with hand-checked numbers. The component
   only draws and wires controls.
2. **The server render is a real first frame.**
   - Astro renders the widget to HTML at build time, and `client:visible` hydrates it later.
   - The first frame (initial values, drawn state, labels) must already make sense with no JS.
   - `npm run check:dist` fails on empty widget roots.
   - **Controls stay inert until the widget hydrates**, because without JS they do nothing. Use the
     kit's `Slider`, `Toggle` and `Button`: they are disabled until `hydrated()` turns true. Make a
     shape in the drawing clickable only with `hotspot()`, so it is not focusable and not
     announced as a button before then. `tests/widgets/server-render.test.ts` server-renders every
     widget and fails on an enabled control or a focusable shape.
3. **Language:**
   - Every widget takes a `lang: LangCode` prop. It is injected automatically in MDX.
   - All visible text comes from `strings.ts`: `{ en: {...}, sk: {...} }`, typed so every
     language has every key.
   - Numbers use `formatNumber` / `formatQuantity`.
4. **Colours:** use only the `--d-*` tokens and diagram classes (`src/styles/diagram.css`), so light
   and dark mode both work.
5. **Accessibility:**
   - Every control has a visible label.
   - Every result is shown as text (a `Readout`), not only as a picture.
   - Don't add your own `aria-live` to anything that changes while a slider moves. A `Readout`
     already announces its value once it has settled.
   - SVG drawings get `role="img"` and a short, updated `aria-label`.
   - Everything works with the keyboard, and with touch at 360 px.
6. **Motion:**
   - Animations run through `visibleLoop()`.
   - With `prefers-reduced-motion`, show a static state: arrows instead of moving dots.
   - Never animate endlessly off-screen.
7. **Size:** at most 30 KB gzipped per widget. Only the kit and Svelte are shared.
8. **Layout:** a widget sits in the article flow and may use `<Figure wide>`. It must fit a 360 px
   screen without horizontal scrolling. Use `viewBox` SVGs that scale.

## Embedding

```mdx
import OhmsLawPlayground from '@widgets/ohms-law/OhmsLawPlayground.svelte';

<Figure caption="Change the push (voltage) and the narrowness (resistance), and watch the current." wide>
  <OhmsLawPlayground client:visible />
</Figure>
```

Never pass `lang`; it is injected. Always add `client:visible`, or the widget stays a static
picture.

An article that embeds a widget (any component with a `client:` directive) counts as having a
**lab**. It gets the flask badge in Explore, on cards and in search results, and it appears under
the "Has a lab" filter. Nothing needs configuring: the catalog detects it (`ArticleText.hasLab`).

## Skeleton

```svelte
<script lang="ts">
  import type { LangCode } from '@i18n/languages';
  import WidgetFrame from '../kit/WidgetFrame.svelte';
  import Slider from '../kit/Slider.svelte';
  import Readout from '../kit/Readout.svelte';
  import { formatQuantity } from '../kit/format';
  import { strings } from './strings';
  import { solve } from './model';

  let { lang }: { lang: LangCode } = $props();
  const s = $derived(strings[lang]);
  let volts = $state(9);
  const result = $derived(solve(volts));
</script>

<WidgetFrame name="example" title={s.title} hint={s.hint} {lang} onreset={() => (volts = 9)}>
  <svg viewBox="0 0 400 200" role="img" aria-label={s.picture(result)}>…</svg>
  {#snippet controls()}
    <Slider label={s.voltage} bind:value={volts} min={0} max={12} step={0.5} unit="V" {lang} />
    <Readout label={s.current} value={formatQuantity(result.amps, 'A', lang, 2)} />
  {/snippet}
</WidgetFrame>
```

## Widget lab

`src/pages/lab/[lang].astro` shows every widget on one page in both languages. It is built only in
`npm run dev` (open `/lab/en/`) or when building with `WIDGET_LAB=1 npm run build`; production builds
skip it. Add every new widget there.

## Testing

- `tests/widgets/models.test.ts` covers every model, one `describe` block per widget, with values
  checked by hand: Ohm's law, the COP curve, boiling points, waveform means.
- `tests/widgets/server-render.test.ts` renders every widget in every language the way the build
  does (`render` from `svelte/server`). It finds new widgets by itself.
- Check in a browser (`npm run build && npm run preview`):
  - touch and keyboard
  - 360 px and desktop widths
  - light and dark mode
  - reduced motion (Playwright `emulateMedia({ reducedMotion: 'reduce' })`)
  - JS disabled: the first frame still makes sense
