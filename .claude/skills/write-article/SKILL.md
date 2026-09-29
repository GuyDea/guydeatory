---
name: write-article
description: Use when asked to explain a question or topic on Guydeatory, write a new article, add a missing term article, rewrite or translate an existing article, or fix content validation errors. Covers research, ids, topics, labels, kid-level writing, term links, Slovak translation, diagrams/widgets and validation.
---

# Writing a Guydeatory article

**Before writing anything, read `docs/writing-guide.md` and `docs/translation.md`.** Imitate the
gold-standard example `content/articles/voltage/`.

## 1. Understand the question

- Rephrase it the way a child of 8–10 would ask it. That becomes the title.
- Decide the angle and the label: big picture (`high-level`), mechanism (`low-level`), maths
  (`calculation`), `trivia` or `history`.
- If the question is big, plan several articles, one per angle, linked through `related`.

## 2. Check what already exists

```bash
ls content/articles/
rg -il "^(title|term|keywords):.*<word>" content/articles/*/en.mdx   # synonyms too
```

Reuse and extend existing articles instead of duplicating them. Pick a new id (`docs/taxonomy.md`):
English kebab-case, naming the concept, singular, permanent.

## 3. Research

- Get the facts and numbers from reliable sources.
- Note 1–5 sources for `meta.yaml`.
- If a fact is uncertain, leave it out.

## 4. Plan the explanation (from zero)

1. Write the **short answer** first: 1–2 kid-level sentences.
2. List the **ideas in order**, from what a child already knows to the answer. One idea per section.
3. For each idea, choose an **analogy** (keep them consistent across articles) and a **picture**: a
   diagram, or a widget if interacting helps.
4. List every **term** the text will use that a child might not know. Explain each one in place, or
   link it.
5. For every linked term, check that its article exists. If it doesn't:
   - write it first, depth-first, following this same skill
   - keep term articles focused (about 400–1,100 words of main text), but real

   A term that cannot be explained well yet gets `status: stub`: short, but correct.

## 5. Scaffold and write English

```bash
npm run new:article -- <id> --topic <topic-id> --label <label-id>
```

- Fill in `meta.yaml`:
  - `topics`: the primary topic first
  - `labels`: the main label first
  - `prerequisites`, `related`, `sources`
  - `status: published` once it is done
- Write `en.mdx`, following the writing guide's structure:
  - opening
  - sections
  - `<GoDeeper>` for the precise version
  - `<Remember>`
  - an optional `<Quiz>`
  - `<Safety>` where needed
- Measure the reading level:
  - average sentence ≤ 15 words, none over 25
  - paragraphs of ≤ 4 sentences
  - no unexplained jargon

## 6. Write Slovak

Write `sk.mdx` with the same structure and the same links, in natural Slovak:

- Use *ty* and stay gender-neutral toward the reader.
- Follow the typography and the glossary in `docs/translation.md`.
- Set the Slovak `slug` (ASCII, no diacritics).
- Decline link texts: `[[voltage|napätím]]`.

## 7. Diagrams and widgets

- **Diagrams:** `<Figure caption>` + `<Svg>` with the diagram classes. For a diagram shared by both
  languages, use `content/articles/<id>/diagrams/Name.astro` with a `lang` prop.
- **Widgets:** reuse one from `src/widgets/`, or build a new one with the `create-widget` skill.

## 8. Validate

```bash
npm run lint:content          # fast: schemas, links, translations, MDX syntax, components
npm test                      # if you touched code or widget models
npm run build && npm run check:dist
npm run preview               # read it at 360 px and on desktop, in light and dark mode
```

Fix every problem. The linter says which file is wrong and suggests close ids.

## 9. Finish

- If the article should be featured on the home page, add it to `content/home.yaml`.
- Commit on the working branch, with the article and its new term articles together.
- Deploy only if the owner asked (`npm run deploy`).
