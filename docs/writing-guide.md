# Writing guide

Every Guydeatory article answers one question and starts from the very beginning. The main text must
work for a **child of 8–10 reading alone**. Grown-ups get the precise version in `<GoDeeper>`
blocks inside the same article.

> The test for every paragraph: could an eight-year-old read it out loud to a parent and explain it
> back? If not, simplify it, split it, link a term, or move the detail into `<GoDeeper>`.

The gold-standard example to imitate is `content/articles/voltage/` (both languages).

---

## 1. The promise of every article

1. **One question.** The title is the question, and the article answers exactly that.
2. **From the very beginning.** Assume only everyday life experience. Anything more is explained on
   the spot or linked.
3. **Simplified, never wrong.** Leave things out, but never state something false. Where an
   analogy stops being true, say so in `<GoDeeper>`.
4. **Every non-everyday term is explained or linked** (see §5).
5. **Show, don't only tell.** High-level articles have at least one diagram. Main articles have at
   least one interactive widget where playing with it helps understanding.

## 2. Structure

```
Title        — the question, as a child would ask it
Summary      — "the short answer": 1–2 sentences that answer the question on their own
Body
  Opening    — something the reader already knows → the question → what we need first
  Sections   — one new idea per section (## heading, ideally a question), each with a picture or analogy
  GoDeeper   — after the kid explanation of an idea: the precise version, the math, the caveats
  Remember   — 3–5 key ideas as bullets
  Quiz       — 1–2 "Check yourself" questions (encouraged)
```

- **Title:** a question when natural ("How does electric current work?", "What is voltage?",
  "Why don't birds on power lines get shocked?"). Name-style titles are fine for history pieces
  ("The history of electricity").
- **Summary:**
  - Kid-level and complete on its own. It appears in link previews, search results and the "short
    answer" box.
  - One or two sentences, ideally under 220 characters (the maximum is 320).
  - Plain text only: no links or formatting.
  - Start with the subject: "Voltage is the push that…"
- **Headings:**
  - Use `##` for sections. Three or more sections show a table of contents.
  - Use `###` rarely.
  - Never use `#`, because the title is the page's only h1.
  - No links inside headings.
- **Length:**
  - Term articles: about 400–1,100 words of main text.
  - Main articles: 900–2,000 words.
  - `<GoDeeper>` blocks come on top of that.
  - Long is fine when each step is small. Dense is never fine.

## 3. Reading level (measurable rules)

These apply to the main text. `<GoDeeper>` may be denser, but should still be friendly.

- Average sentence length ≤ **15 words**. No sentence over **25 words**.
- Paragraphs of **≤ 4 sentences**, one idea per paragraph.
- Everyday words first. When a technical word is needed, introduce it *after* the idea:
  "This push is called **voltage**." Bold marks the moment a word is defined in place.
- **Concrete beats abstract:**
  - "about as heavy as a bag of sugar" rather than "≈ 1 kg"
  - "a wire as thin as a hair" rather than "0.1 mm"
- **Numbers:** round them and compare them with familiar things. Spell units out the first time:
  "230 volts (V)".
- **Voice:** address the reader as **you**, and use **we** for shared discovery ("Let's find out").
  Use the active voice.
- **Words to avoid:** "simply", "just", "obviously", "of course", "clearly". What is obvious to an
  adult is not obvious to a child.
- **References:** no sarcasm, no idioms that do not translate, no culturally narrow references.
  Kitchens, playgrounds, bicycles, rain, the sea and toys work everywhere.
- **Humour:** welcome if it is kind and does not distract.

### Before / after

> ❌ Electric current is defined as the rate of flow of electric charge through a conductor, measured in amperes.
>
> ✅ Electric current is a flow of tiny particles called [[electron|electrons]] through a wire. The more
> electrons pass by each second, the stronger the current.

> ❌ Obviously, a higher potential difference drives a larger current through the same resistance.
>
> ✅ Push harder, and more electrons flow. A bigger [[voltage]] gives a bigger current — as long as
> the wire stays the same.

## 4. Analogies

- Take analogies from a child's world:
  - water in pipes and hoses
  - slides and playgrounds
  - crowds in a corridor
  - marbles
  - bicycle pumps
  - kitchens and fridges
- Use **one analogy per idea**, and keep it consistent across related articles. The shared
  analogies:

  | Idea | Analogy |
  |---|---|
  | Electric circuit | a closed loop of water pipes |
  | Voltage | the push (pressure) from a pump |
  | Current | how much water flows past each second |
  | Resistance | a narrow or clogged pipe |
  | Heat pump | carrying heat like a sponge carries water, from where you don't want it to where you do |
  | Energy | it never disappears; it only changes form or moves |

- Put the main analogy of a section in `<Analogy>`.
- Always say where the analogy breaks, in a `<GoDeeper>` block. For example: "Water can drip out of
  a cut pipe, but electrons do not pour out of a cut wire, because…"

## 5. Terms and links

**Syntax**

| You write | It renders |
|---|---|
| `[[voltage]]` | a link showing the target article's `term` ("voltage") |
| `[[voltage\|napätím]]` | a link with your own text. Slovak cases need this; see `docs/translation.md`. |
| `[[electron\|electrons]]` | plurals and other forms |

**What to link.** Link a concept that means something beyond this article *and* whose full
explanation would pull the reader away from the question: atom, energy, pressure, voltage. Do not
link:

- everyday words (water, house, light)
- things fully explained in this article

**When to link.**

- Link the **first use** in the article.
- Link again only in a distant section, or in a `<GoDeeper>` where it matters.
- Never link in the title, the summary, headings, quiz strings or diagram labels.

**If the target does not exist yet,** write it: a short but real term article, in every language,
with its own terms linked. Unknown links fail the build.

- Before creating one, search for an existing article, synonyms included:
  `rg -il "^(title|term|keywords):.*<word>" content/articles/*/en.mdx`
- If the full explanation cannot be written now, a short but correct version with
  `status: stub` is acceptable. It shows a "short version" note.

**Prerequisites and related.** In `meta.yaml`:

- `prerequisites` lists what a reader should know first. It is shown at the top.
- `related` lists the best next reads, in order. It is shown at the bottom.

Backlinks ("These articles use this idea") are computed automatically.

## 6. When to split into separate articles

- A side explanation longer than about two paragraphs that is not the core of the question
  becomes **its own article**, linked with `[[…]]`.
- A big question with several angles becomes **several articles**, each with its own label, all
  linked through `related`. The angles are: how it works, how it is calculated, how it behaves,
  its history, and fun facts.
  - Example: `electric-current` (high-level), `calculating-electric-current` (calculation) and
    `how-electric-current-behaves` (low-level).

## 7. Labels (type of explanation)

An article has 1–3 labels. **The first is its main label**; topic pages group articles by it.

| Label | Use for |
|---|---|
| `high-level` — Big picture | What it is and why it matters. Intuition, little or no math. Most term articles. |
| `low-level` — Under the hood | The mechanism in detail, step by step, with precise words. Some math allowed. |
| `calculation` — Numbers & formulas | Formulas, what every symbol means, and worked examples with everyday numbers. |
| `trivia` — Fun facts | Surprising facts, myths busted, curious "why?" questions. |
| `history` — History | Who discovered or invented it, when and how. It still explains the science involved. |

## 8. Components

The following work in every MDX file without an import. The language is passed automatically, so
never write `lang=`.

```mdx
<Analogy>Think of a wire as a pipe full of water…</Analogy>
<Analogy title="Like a water slide">…</Analogy>

<FunFact>Electrons in a wire move slower than a snail!</FunFact>

<Safety>Never poke anything into a socket. The electricity there can kill.</Safety>

<GoDeeper title="Why electrons move so slowly">
Precise version for grown-ups: drift velocity, formulas, caveats…
</GoDeeper>

<Remember>
- Current is a flow of electrons.
- Voltage is the push.
</Remember>

<Figure caption="What to notice in the picture." wide>
  …an <Svg> diagram, an image or a widget…
</Figure>

<Quiz
  question="What makes the electrons move?"
  options={["The wire gets hot", "The push from the battery", "Gravity"]}
  answer={1}
  explanation="The battery pushes the electrons; that push is called voltage."
/>
```

**Math:**

- Write inline math as `$I = \frac{V}{R}$` and a display block as `$$P = V \cdot I$$`.
- Always explain every symbol in words right after the formula.
- Keep formulas in `<GoDeeper>`, or in `calculation` articles where the formula *is* the point.

**Widgets:** import them explicitly and hydrate them when visible:

```mdx
import OhmsLawPlayground from '@widgets/ohms-law/OhmsLawPlayground.svelte';

<OhmsLawPlayground client:visible />
```

## 9. Diagrams

Draw simple diagrams as inline SVG with the shared wrapper and classes:

```mdx
import Svg from '@components/diagram/Svg.astro';

<Figure caption="Electrons flow around the loop from minus to plus.">
  <Svg viewBox="0 0 400 200" title="A simple circuit" desc="A battery connected to a bulb by two wires in a loop." maxWidth="30rem">
    <path d="M60 60H340V160H60Z" class="d-wire" />
    <circle cx="200" cy="60" r="18" class="d-glow" />
    <path d="M120 170h60" class="d-line d-arrow-electron" />
    <text x="190" y="30" class="d-label">bulb</text>
  </Svg>
</Figure>
```

- **Language:**
  - A diagram used in only one language can be written inline in that language's MDX file.
  - For a diagram shared by both languages, create `content/articles/<id>/diagrams/Name.astro`.
    It takes a `lang` prop and holds a `strings` object per language. Import it in both MDX files.
- **Colours:**
  - Use only the classes in `src/styles/diagram.css`: `d-wire`, `d-line`, `d-box`, `d-electron`,
    `d-positive`, `d-hot`, `d-cold`, `d-glow`, `d-label`, `d-muted`, and the arrows `d-arrow*`.
  - Never hard-code colours; dark mode depends on it.
- **Text size:** labels must stay readable at a 360 px screen width (about 14 px effective). Use
  few words and a large viewBox scale.
- **Accessibility:**
  - Every diagram needs a `title` and a `desc` that describes what it shows.
  - Every figure needs a caption that says **what to notice**.

## 10. Widgets

Add a widget when *changing something and seeing the effect* explains the idea better than words:
sliders for voltage, switches for circuits, a mode toggle for a heat pump. Read `docs/widgets.md`
and use the `create-widget` skill.

## 11. Safety

- Add a `<Safety>` note whenever a child might try something dangerous: mains electricity, heat,
  fire, chemicals, heights, sharp tools.
- Mains electricity is always dangerous. Say so plainly.
- Suggested experiments must be safe with household items, and marked "with a grown-up" when needed.

## 12. Accuracy and sources

- Facts and numbers need reliable sources. Put 1–5 of them in `meta.yaml` → `sources`.
  - Prefer educational or scientific institutions, textbooks and encyclopedias.
  - Wikipedia is acceptable as a starting point.
- Double-check physics. If you are unsure, leave it out.
- Round numbers honestly, e.g. "about 230 volts". "Always" and "never" must be true.

## 13. Metadata

`meta.yaml` (language-independent):

```yaml
topics: [electricity]              # primary topic first (it drives the breadcrumb)
labels: [high-level]               # main label first
prerequisites: [electron]          # optional
related: [voltage, electric-circuit]   # optional, best first
status: published                  # draft | stub | published
created: 2026-09-28
updated: 2026-09-28
sources:
  - title: "Electric current — Encyclopaedia Britannica"
    url: https://www.britannica.com/science/electric-current
```

Language frontmatter (`en.mdx`, `sk.mdx`):

```yaml
title: How does electric current work?
term: electric current           # short name used in links and lists
slug: electric-current           # URL segment; ASCII kebab-case; permanent once published
summary: Electric current is a flow of tiny particles called electrons through a wire…
keywords: [electricity, amps, flow]   # synonyms people might search for
reviewed: false                  # set true once a human has checked this language version
```

## 14. Voice

Friendly, curious and encouraging. Celebrate the question. Enthusiasm yes, hype no. Write the way a
patient, fun teacher talks while drawing on a whiteboard.

## 15. Checklist before commit

- [ ] The title is the question. The summary answers it alone in 1–2 plain sentences.
- [ ] The main text meets §3. Read it out loud: no stumbling.
- [ ] Every non-everyday term is explained in place or linked, and every link resolves.
- [ ] At least one diagram. Main articles also have at least one interactive widget.
- [ ] `<GoDeeper>` holds the precise version and the analogy caveats. Nothing false anywhere.
- [ ] A `<Remember>` recap, and a quiz where it fits.
- [ ] `<Safety>` notes wherever needed.
- [ ] `meta.yaml`: topics, labels, related, prerequisites, sources and dates are set.
- [ ] Every language version is complete, natural and consistent with the glossary, with its own
      slug.
- [ ] `npm run lint:content` and `npm run build` pass.
- [ ] The page was checked at 360 px and on desktop, in light and dark mode.
