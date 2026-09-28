# Translation guide

Guydeatory is written in **English (en)** and **Slovak (sk)**, and both are required. Every article
exists in both, with the same structure. More languages can be added later (see §6).

## 1. Principles

- **Translate the meaning, not the words.** The Slovak text must read as if it had been written in
  Slovak first, for a Slovak child of 8–10.
- **Keep the structure identical.** Same sections, components, widgets, diagrams and links
  (`[[id]]` targets), in the same order. Only the words change.
- **The same reading-level rules apply** (`docs/writing-guide.md` §3). Slovak sentences tend to get
  longer; split them.
- **Analogies may be localised** when a more familiar picture exists, as long as they teach the
  same idea.

## 2. Slovak style

- **Address the reader with *ty*.** Be friendly and direct: "Predstav si…", "Skús…", "Vieš, prečo…?"
- **Stay gender-neutral toward the reader.** Slovak past tense and conditional forms mark gender
  ("keby si rozrezal/rozrezala"). Girls and boys both read this, so:
  - use present or future tense: "Keď kúsok zlata rozrežeš…"
  - or impersonal constructions: "Keby ho niekto rozrezal…", "Dá sa to vyskúšať…"
  - or the plural, where natural: "Všimnime si…"
- Natural word order. Avoid calques ("robí zmysel" → "dáva zmysel").
- Use the terminology taught in Slovak schools (glossary §4). Where a common everyday word exists,
  prefer it in the main text and give the school term once. Example: "prúd", then "elektrický prúd".

## 3. Slovak typography

| What | Rule | Example |
|---|---|---|
| Quotes | low-high quotes | „takto“ |
| Dash | spaced en dash | slovo – slovo |
| Decimal separator | comma | 1,5 A |
| Thousands | non-breaking space | 1 000 W |
| Units | non-breaking space between number and unit | 230 V, 50 Hz, 20 °C, 3 kWh |
| Percent | space before % | 50 % |
| Math (KaTeX) | decimal comma inside braces | `$1{,}5$` |
| Formula symbols | voltage is **U** in Slovak formulas (English uses V); the unit stays volt (V) | `$I = \frac{U}{R}$`, `$P = U \cdot I$` |
| Division, "about" | `:` for division (never ÷) and `≐` (`\doteq` in KaTeX) for "approximately" | `12 : 6 = 2`, `$230 : 26 \doteq 9$` |
| Multiplication | `·` (`\cdot`), not × | `$U = R \cdot I$` |
| Ordinals | number with a period | 1. poschodie |

In MDX, type non-breaking spaces as `&nbsp;` or the real U+00A0 character. English uses "1.5 A",
"1,000 W" and "20 °C".

## 4. Glossary (EN → SK)

Keep terms consistent across all articles. Add new terms here when you introduce them.

### Electricity

| English | Slovenčina | Note |
|---|---|---|
| electricity | elektrina | |
| electric current | elektrický prúd | "prúd" alone once the context is clear |
| direct / alternating current (DC / AC) | jednosmerný / striedavý prúd | keep the abbreviations DC / AC |
| voltage | napätie (elektrické napätie) | |
| resistance | odpor (elektrický odpor) | |
| resistor | rezistor | |
| conductor / insulator | vodič / izolant | "izolátor" = the insulating part, e.g. on a power pole |
| (electric) circuit | (elektrický) obvod | closed / open: uzavretý / otvorený |
| switch | vypínač | |
| battery | batéria | for one cell, "článok" in GoDeeper |
| light bulb | žiarovka | LED = LED dióda / LEDka (colloquial) |
| wire | drôt, vodič | |
| (electric) charge | (elektrický) náboj | |
| atom, nucleus | atóm, jadro | |
| electron, proton, neutron | elektrón, protón, neutrón | |
| electric power | elektrický výkon | |
| energy, work | energia, práca | |
| short circuit | skrat | |
| fuse / circuit breaker | poistka / istič | |
| socket / plug | zásuvka / zástrčka | |
| magnet, magnetic field | magnet, magnetické pole | |
| electromagnet | elektromagnet | |
| ampere, volt, ohm, watt | ampér, volt, ohm, watt | symbols A, V, Ω, W |
| kilowatt-hour | kilowatthodina | kWh |
| coulomb, joule | coulomb, joule | C, J |

### Heat, matter, energy

| English | Slovenčina | Note |
|---|---|---|
| heat | teplo | |
| temperature | teplota | |
| thermometer | teplomer | |
| pressure | tlak | |
| state of matter | skupenstvo | solid / liquid / gas = pevné / kvapalné / plynné |
| evaporation / condensation | vyparovanie / kondenzácia | "skvapalňovanie" in school contexts |
| boiling point | bod varu (teplota varu) | |
| latent heat | skupenské teplo | |
| conservation of energy | zákon zachovania energie | |
| particle | častica, čiastočka | "čiastočka" is friendlier for kids |
| transformer | transformátor | |
| frequency, hertz | frekvencia, hertz (Hz) | |
| sine wave, amplitude, period | sínusoida, amplitúda, perióda | |
| RMS value | efektívna hodnota | |
| resistivity | merný elektrický odpor (rezistivita) | |
| superconductor | supravodič | |
| thermocouple | termočlánok | |
| horsepower | konská sila | |
| rated power (on a label) | príkon | the power a device draws; "výkon" is what it delivers |
| power station, power line, pylon | elektráreň, elektrické vedenie, stožiar | |
| extension lead | predlžovačka | feminine: "v jednej predlžovačke" |
| heating element | ohrevné teleso | |
| war of the currents | vojna prúdov | |
| friction | trenie | |
| conduction / convection / radiation (of heat) | vedenie / prúdenie / žiarenie tepla | |
| thermal insulator | tepelný izolant | |
| specific heat capacity | merná tepelná kapacita | |
| internal energy | vnútorná energia | |
| kinetic / potential energy | pohybová / polohová energia | "kinetická / potenciálna" in GoDeeper |
| absolute zero | absolútna nula | |
| perpetual motion machine | perpetuum mobile | |
| vacuum flask (thermos) | termoska | |
| vacuum | vákuum | |

### Heat pumps and air conditioning

| English | Slovenčina | Note |
|---|---|---|
| heat pump | tepelné čerpadlo | |
| air conditioner / air conditioning | klimatizácia | |
| refrigerant | chladivo | |
| compressor | kompresor | |
| evaporator | výparník | |
| condenser | kondenzátor | in electronics this also means "capacitor"; in heat-pump context write "kondenzátor (tá časť, kde chladivo kondenzuje)" on first use |
| expansion valve | expanzný ventil | |
| reversing valve | štvorcestný ventil | |
| outdoor / indoor unit | vonkajšia / vnútorná jednotka | |
| coefficient of performance (COP) | vykurovací faktor (COP) | |
| energy efficiency ratio (EER) | chladiaci faktor (EER) | |
| refrigerator | chladnička | |

## 5. Slugs and links

- **Slugs:** ASCII kebab-case from the Slovak term, without diacritics, for example
  `elektricky-prud` or `tepelne-cerpadlo`. A slug is permanent once published.
- **Wiki-link text** must be declined correctly: `[[voltage|napätím]]`, `[[electron|elektróny]]`,
  `[[atom|atómu]]`. The id before the `|` never changes.
- **Summaries, titles and keywords** are translated. Keywords should include the common synonyms
  people type: "klíma", "klimoška", "tepelko".

## 6. Adding a language

Use the `add-language` skill. In short:

1. Add the language to `src/i18n/languages.ts` with its native name, date locale, OG locale and
   localized section slugs. Set `required: false` at first.
2. Add `src/i18n/ui/<code>.ts`. TypeScript forces every key.
3. Add the language to every entry in `content/topics.yaml` and `content/labels.yaml` (name,
   description, slug).
4. Add strings to every widget's `strings.ts`, the About page (`content/pages/about/<code>.mdx`)
   and the 404 page copy.
5. Add a glossary section to this file.
6. Translate articles. While the language is optional:
   - pages exist only for translated articles
   - links to untranslated articles fall back to English and show a small language badge
7. When everything is translated, set `required: true`. The build then enforces completeness.
8. Deploy. The CloudFront router picks up the language list automatically on `npm run infra:deploy`.
