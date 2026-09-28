# Taxonomy: ids, topics, labels, statuses

The site has to stay navigable at thousands of articles about *anything*. Three independent
structures make that work:

| Structure | Purpose | Where |
|---|---|---|
| **Article ids** | A permanent, language-independent key for every article | folder names in `content/articles/` |
| **Topics** | Where an article lives in the library, for browsing | `content/topics.yaml` |
| **Labels** | The kind of explanation, for filtering | `content/labels.yaml` |

Links between articles (`[[id]]`), plus `prerequisites` and `related`, form a fourth structure:
the knowledge graph. It is computed; nothing is stored separately.

## Article ids

- **Format:** English, lowercase, kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`).
- **Permanent:** the id is how every other article links to this one. Renaming breaks every
  `[[link]]`, and the build will say so.
- **Name the concept, not the sentence:** `heat-pump`, not `how-do-heat-pumps-work`. Use singular
  nouns: `electron`, not `electrons`.
- **Angles of one subject** get descriptive ids: `electric-current`,
  `calculating-electric-current`, `how-electric-current-behaves`, `history-of-electricity`,
  `why-birds-on-wires-dont-get-shocked`.
- **Disambiguation:** add a natural qualifier, such as `electric-current` vs `ocean-current`, or
  `electric-power` vs `political-power`. Keep it readable.
- **Flat folders:** no topic subfolders. An article can sit in several topics and be moved without
  changing its path or URL. Wikipedia works the same way.

## Topics

- A **topic** is an area someone would *browse*, like Electricity or Heat & temperature. A single
  concept, like Voltage, is an **article**, not a topic.
- **Depth:** keep the tree shallow, at most 4 levels (domain › field › area › sub-area).
- **Articles per topic:** each article has 1–3 topics, **primary first**. The primary topic drives
  the breadcrumb.
- **Ids and slugs** follow the article rules and are permanent. Each language has its own slug.
- **Empty topics** (no published articles, directly or below) are hidden automatically. They may be
  defined in advance.
- **Order in the file = order in the UI.** Put the most approachable topics first.

### Planned top-level domains

Add these when the first article needs them, so the tree grows the same way everywhere:

| id | EN | SK | Examples |
|---|---|---|---|
| `science` | Science | Veda | physics (electricity, energy, heat, matter, light, sound, forces), chemistry, biology |
| `space` | Space | Vesmír | planets, stars, rockets |
| `earth-and-nature` | Earth & nature | Zem a príroda | weather, volcanoes, oceans, plants, animals |
| `human-body` | Human body | Ľudské telo | senses, heart, food, sleep |
| `technology` | Technology | Technika | home technology, transport, computers, communication, energy systems |
| `everyday-life` | Everyday life | Každodenný život | money, cooking, sport |
| `history-and-society` | History & society | História a spoločnosť | inventions, how cities work |
| `math` | Math | Matematika | numbers, shapes, probability |

## Labels (kind of explanation)

Labels describe *how* an article explains, not *what* it is about.

| id | EN | SK | Meaning |
|---|---|---|---|
| `high-level` | Big picture | Celkový obraz | What it is and why, intuition first, little or no math |
| `low-level` | Under the hood | Pod kapotou | The detailed mechanism, precise words |
| `calculation` | Numbers & formulas | Čísla a vzorce | How to calculate it, worked examples |
| `trivia` | Fun facts | Zaujímavosti | Surprising facts, myths, curious questions |
| `history` | History | História | Who discovered or invented it, and how |

- An article has 1–3 labels, **main label first**. Topic pages group articles by it.
- Adding a label means one entry in `labels.yaml`: id, colour token, and names and descriptions in
  every language. Pick a colour token that already exists in `src/styles/tokens.css`
  (`--label-<color>`), or add a new pair with both light and dark values.
- Change labels rarely. Readers learn them.

## Status

| status | Built in production? | Use |
|---|---|---|
| `draft` | no (dev only) | Work in progress. May contain `TODO` placeholders. Others may not link to it in production. |
| `stub` | yes, with a "short version" note | A real, correct but short explanation. Better than a missing term. |
| `published` | yes | Complete. Must contain no `TODO`. |

## Scale notes

- **Validation** of links, slugs, topics and labels runs on the whole catalog in milliseconds,
  even at thousands of articles.
- **Explore** renders the full tree on the server. Beyond about 5,000 articles, switch it to lazy
  per-topic data (see `docs/architecture.md`).
- **Search** (Pagefind) loads index chunks on demand, so it scales to tens of thousands of pages.
