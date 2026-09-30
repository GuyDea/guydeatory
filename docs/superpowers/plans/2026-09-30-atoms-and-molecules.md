# Atoms and molecules — section plan

**Owner's request (2026-09-30):** "add a section about atoms and molecules, explain all that comes
into how they function, what defines them, how they connect into molecules. And most importantly,
also add a interactive showcase — almost game-like, that would depict all these interactions. You
can be fancy here — this can also be for regular adults. Also dig into isotopes, ions… when you're
finished you can deploy."

**Decisions:**
- **Branch:** `feat/atoms-and-molecules`, on top of `feat/platform-foundation`.
- **Deploy:** when finished, push both branches to `main`. The deploy workflow publishes them.

## What the section contains

A new topic, **Chemistry** (`chemistry`, under Science), sits next to Atoms & matter (`matter`).
Stubs for every article below already exist, so links between them resolve from the start. Each
group replaces its stubs with full articles and removes `status: stub`.

| Id | EN title | SK title / slug | Topics | Group |
|---|---|---|---|---|
| `chemical-bond` | How do atoms join into molecules? (**main article**) | Ako sa atómy spájajú do molekúl? / `chemicka-vazba` | chemistry | C2 |
| `molecule` | What is a molecule? | Čo je molekula? / `molekula` | chemistry, matter | C2 |
| `chemical-reaction` | What is a chemical reaction? | Čo je chemická reakcia? / `chemicka-reakcia` | chemistry | C2 |
| `chemical-element` | What is a chemical element? | Čo je chemický prvok? / `chemicky-prvok` | matter, chemistry | C1 |
| `periodic-table` | How does the periodic table work? | Ako funguje periodická tabuľka? / `periodicka-tabulka` | chemistry, matter | C1 |
| `electron-shell` | What are electron shells? | Čo sú elektrónové vrstvy? / `elektronova-vrstva` | matter, chemistry | C1 |
| `isotope` | What is an isotope? | Čo je izotop? / `izotop` | matter | C1 |
| `radioactivity` | What is radioactivity? | Čo je rádioaktivita? / `radioaktivita` | matter | C1 |
| `ion` | What is an ion? | Čo je ión? / `ion` | matter, chemistry | C1 |

The existing `atom` article gets links to the new articles (C1). Where natural, `electron`,
`electric-charge` and `conductors-and-insulators` link to `ion` or `chemical-bond` too (C1).

### What each article must explain

Main text for a child of 8–10, reading alone. Precise detail goes in `<GoDeeper>` for grown-ups.
Every number is checked against a reliable source, listed in `meta.yaml`.

- **`chemical-bond` (main).**
  - Main text:
    - why atoms bond: a full outer shell is a settled, low-energy state (H needs 2, most others 8)
    - sharing electrons (covalent): H₂, water, methane
    - double and triple bonds: O₂, and N₂, which is why air's nitrogen hardly reacts
    - giving and taking (ionic): Na + Cl → salt, a crystal rather than separate molecules
    - metals share an "electron sea", which links to conductors and insulators
    - shapes: water is bent, CO₂ is straight, methane is a triangular pyramid
    - uneven sharing: polar water, dissolving salt, why ice floats (hydrogen bonds)
    - making bonds releases energy and breaking them costs energy
  - Go deeper: electronegativity (Pauling scale), VSEPR, bond energies (H–H about 436 kJ/mol,
    N≡N about 945 kJ/mol), exceptions to the octet rule, van der Waals forces.
  - About 1,200–2,000 words of main text. Labels: high-level, then low-level.
- **`molecule`.**
  - A group of atoms held by bonds, and how to read a formula (H₂O).
  - Molecules of elements (O₂) and of compounds (H₂O).
  - Sizes, from water to DNA.
  - What is *not* molecules: salt and metals are crystals, and noble gases are single atoms.
- **`chemical-reaction`.**
  - Bonds break and new ones form, and atoms are rearranged, never made or destroyed (Lavoisier).
  - Signs of a reaction: gas, colour, heat, light.
  - Examples: burning methane, rust, baking soda with vinegar, photosynthesis.
  - Energy given out or taken in, which links to `energy` and `conservation-of-energy`.
  - **Safety:** never mix household cleaners (bleach with acids or ammonia gives toxic gases), and
    do experiments with an adult.
  - Go deeper: balancing equations, activation energy, catalysts.
- **`chemical-element`.**
  - An element is defined by its number of protons (atomic number).
  - 118 are known, and about 90 occur naturally (check the figure you use).
  - Symbols, including Latin ones (Fe, Au, Na).
  - The most common elements in the universe, in the Earth's crust and in the human body.
- **`periodic-table`.**
  - Elements are ordered by protons. A row is a period (shells being filled). A column is a group:
    same outer electrons, so similar behaviour.
  - Alkali metals react with water, halogens are eager, noble gases hardly react at all.
  - Metals sit on the left and nonmetals on the right.
  - Go deeper: Mendeleev's predicted elements (gallium, germanium), and the lanthanide/actinide
    rows.
- **`electron-shell`.**
  - Electrons sit in shells: 2, 8, 8 for the first 20 elements.
  - The outer (valence) electrons decide the chemistry, and a full outer shell means a noble gas.
  - Flame colours and fireworks come from electrons jumping between levels.
  - Go deeper: orbitals (s, p, d), why the third shell can really hold 18, and why 4s fills
    before 3d.
- **`isotope`.**
  - Same protons, different neutrons. Mass number, and names like carbon-14.
  - Isotopes have nearly the same chemistry.
  - Hydrogen, deuterium (heavy water) and tritium.
  - Stable or radioactive. Carbon-14 dating (half-life about 5,700 years). Medical uses.
  - Go deeper: uranium-235 and uranium-238, and why the neutron-to-proton ratio matters.
- **`radioactivity`.**
  - Unstable nuclei change by themselves and give off radiation (alpha, beta, gamma).
  - Half-life, with a picture that halves.
  - Natural radioactivity: potassium-40 in bananas, rocks, radon.
  - Uses: medicine, smoke detectors, dating, nuclear power. Marie Curie.
  - **Safety:** the radiation sign, and never touching unknown objects.
  - Go deeper: N = N₀·(½)^(t/T), types of decay, sieverts. A banana gives about 0.1 µSv; check
    the figure.
- **`ion`.**
  - An atom that gained or lost electrons: positive cations, negative anions, notation Na⁺, Cl⁻,
    Ca²⁺, O²⁻.
  - Salt dissolving into ions, and salty water conducting electricity.
  - Ions in the body (nerves, "electrolytes") and in batteries (lithium ions).

Slovak terms follow the new glossary section, "Atoms and chemistry", in `docs/translation.md`.
Formulas use Unicode subscripts and superscripts (H₂O, Na⁺). The plain forms go in `keywords`.

### Where the widgets go (the controller embeds them after merging)

| Article | Widget |
|---|---|
| `atom` | `AtomLab` with `quests="atoms"`, after "What is inside an atom?" |
| `isotope` | `AtomLab` with `quests="isotopes"` |
| `ion` | `AtomLab` with `quests="ions"` |
| `chemical-bond` | `MoleculeLab`, after the kinds of bonds |

The content groups write complete articles that don't mention the widgets. The controller adds
each `<Figure>` with its caption and a lead-in sentence.

## The widgets

Both widgets follow `docs/widgets.md` and the `create-widget` skill:
- model in `model.ts` (pure, tested); strings in `strings.ts` (EN + SK, typed)
- kit controls: `Button`, `Toggle`, `Readout`, and `hotspot()` for clickable SVG
- inert until hydration, and a meaningful server-rendered first frame
- `--d-*` colours; works in dark mode, with reduced motion, at 360 px and with a keyboard
- touch targets of at least 44 px
- at most 30 KB gzipped each
- listed on the widget lab page

"Game-like" means clear goals, instant feedback and a sense of progress. It also has to stay calm
enough for an article page:
- a quest list with ticks and a progress count
- a short celebration when a quest is done (only a tick and text with reduced motion)
- a collection to fill

No scores, timers or sound. Nothing is saved between visits: the privacy promise allows no new
storage.

### W1 — `AtomLab` (`src/widgets/atom-lab/`)

**Build any atom up to calcium from protons, neutrons and electrons.**
- **Props:** `lang` and `quests: 'atoms' | 'isotopes' | 'ions'` (default `'atoms'`). The quest set
  also picks the starting atom: carbon-12 for atoms and isotopes, sodium-23 for ions.
- **Drawing (SVG):**
  - Protons and neutrons are packed into a nucleus. Protons are `--d-positive` with a "+", and
    neutrons use a muted token, as in the `atom` article's AtomParts diagram.
  - Electron shells are rings with electrons (`--d-electron`) that gently orbit, via
    `visibleLoop`.
  - The outer shell's empty places show as faint dots.
  - An unstable nucleus visibly jitters, but not with reduced motion. It also gets a text label.
- **Controls:** − and + for protons (0–20), neutrons (0–30) and electrons (0–20), with the
  counts. Plus a mini periodic table of elements 1–20:
  - compact, 8 columns: groups 1, 2 and 13–18; H and He in their real places
  - tapping a cell builds that element's most common isotope as a neutral atom
  - the current element is highlighted
- **Readouts:**
  - **element:** name, symbol and Z ("Nothing yet" with no protons)
  - **isotope:** name-A, then stable, radioactive with its half-life in words ("about 5,700
    years"), or "falls apart almost at once"
  - **charge:** neutral, or the ion with its notation (Na⁺, O²⁻) and whether it is common
  - **outer shell:** "4 of 8" and what the atom tends to do (give away 1, share 4, take 1, full)
- **Data:**
  - elements 1–20: symbol, EN/SK names, most common isotope, tendency
  - every nuclide with Z ≤ 20 that is stable or has a half-life of at least one day
  - Any other combination with Z ≥ 1 is correctly "falls apart quickly: within a day, usually in
    a fraction of a second". Check the list against NuDat/NUBASE2020. The long-lived radioactive
    ones are H-3, Be-7, Be-10, C-14, Na-22, Al-26, Si-32, P-32, P-33, S-35, Cl-36, Ar-37, Ar-39,
    Ar-42, K-40, Ca-41, Ca-45 and Ca-47. Ca-48's double-beta half-life is about 6·10¹⁹ years.
  - Neutrons alone: "a lone neutron decays in about 10 minutes (half-life)", and several neutrons
    don't stick together.
- **Shells:** fill 2, 8, 8, 2 (correct for up to 20 electrons).
- **Quests:**
  - **atoms:** hydrogen; helium-4; carbon-12; nitrogen-14 (most of the air); oxygen-16; any noble
    gas as a neutral atom; calcium-40
  - **isotopes:** hydrogen-1; deuterium; tritium (radioactive); carbon-12; carbon-14; a nucleus
    that falls apart at once; potassium-40 (in bananas)
  - **ions:** Na⁺; Cl⁻; Mg²⁺; O²⁻; H⁺ (a bare proton); Ca²⁺ (in bones); any ion with a noble-gas
    shell
- **Screen readers:** settled readouts, and each completed quest is announced.

### W2 — `MoleculeLab` (`src/widgets/molecule-lab/`)

**Put atoms on a board and bond them.**
- **Palette:** H, C, N, O, F, Na, Mg, S, Cl. Each has a colour inspired by the CPK convention. The
  widget may add `--d-el-*` tokens to `src/styles/tokens.css` for light and both dark blocks, and
  must document them in `docs/widgets.md`.
- **Rules:**
  - Covalent bonds join nonmetals, up to their valence: H 1, C 4, N 3, O 2, F 1, S 2, Cl 1.
  - Bonding an already bonded pair again raises the bond order, up to 3 (C, N), 2 (O, S) or 1
    (H, F, Cl).
  - Ionic bonds join a metal (Na gives 1, Mg gives 2) to a nonmetal, which takes electrons up to
    its valence, so the ions get charges: MgCl₂ is Mg²⁺ with two Cl⁻.
  - Metal with metal: no molecule, with a short explanation (the electron sea).
  - Show every atom's free valence, so you can see what still "wants" to bond.
  - Limit: 12 atoms on the board.
- **Interaction:** tap an atom to select it, then tap another to bond them. Tap a bond to break it
  (lower its order).
  - Selected atoms can be removed, and the board cleared.
  - Dragging to move is optional.
  - Everything works with a keyboard: atoms are `hotspot()`s; describe the keys.
- **Recognition:**
  - For each connected cluster: its formula in Hill order, whether it is complete (every valence
    filled), and a hint when it isn't ("carbon still has 2 free bonds").
  - A dictionary of about 25–35 known molecules and ionic compounds, with EN/SK names from the
    glossary, the shape (VSEPR on the central atom), polarity and a one-line true fact:
    - H₂, O₂, N₂, F₂, Cl₂, HF, HCl, H₂O, H₂O₂, H₂S, NH₃, CH₄, CO₂, HCN
    - C₂H₆, C₂H₄, C₂H₂, methanol, ethanol, dimethyl ether, CH₂O, CCl₄, CHCl₃, CH₃Cl
    - NaCl, NaF, NaOH, MgO, MgCl₂, MgF₂, Na₂O, Na₂S, MgS
  - Isomers are told apart by structure, not formula alone (ethanol vs dimethyl ether), for
    example with a canonical graph hash.
- **Drawing:**
  - atoms as coloured discs with their symbol, and free valence as small "hands" or dots
  - bonds as 1–3 lines; ionic pairs with +/− badges and a dotted attraction
  - δ+ and δ− on polar molecules
  - a finished molecule gets a soft highlight and its name
  - layout: templates or VSEPR-like angles for known molecules (water 104.5°), and a gentle
    force-directed layout otherwise; animated with `visibleLoop`, instant with reduced motion
- **Quests:** H₂; water; carbon dioxide (two double bonds); methane; ammonia; N₂ (a triple bond);
  table salt (an ionic bond); sodium hydroxide (ionic and covalent at once).
- **Collection:** "Discovered: n of N" with the names found.
- **First frame:** a finished water molecule, and one carbon and four hydrogens ready to become
  methane.

### Tests for both widgets

- Models tested with hand-checked values:
  - AtomLab identities: C-12, C-14, H-3, Na⁺, Cl⁻, O²⁻, He-2 falling apart, a lone neutron
  - AtomLab: shell filling
  - AtomLab: half-life wording in EN and SK
  - AtomLab: the long-lived list is complete
  - MoleculeLab: valence and bond order limits, ionic transfer (MgCl₂), Hill formulas
  - MoleculeLab: recognition of water, CO₂ and ethanol vs dimethyl ether
  - MoleculeLab: shapes (H₂O bent, CO₂ linear, CH₄ tetrahedral, NH₃ trigonal pyramidal) and
    completeness hints
- `tests/widgets/server-render.test.ts` picks up new widgets automatically. It requires inert
  controls and identical output across renders.

## Work split

| Group | Owns |
|---|---|
| W1 | `src/widgets/atom-lab/**`, its tests, its lab-page entry |
| W2 | `src/widgets/molecule-lab/**`, `--d-el-*` tokens, its tests, its lab-page entry, its row in `docs/widgets.md` |
| C1 | the six atom-structure articles, plus links in `atom`, `electron`, `electric-charge` and `conductors-and-insulators` |
| C2 | `chemical-bond`, `molecule` and `chemical-reaction` |
| Controller | merging; embedding the widgets; the home page; known issues; review; deploy |

- Lab-page entries: W1 and W2 both add one to `src/pages/lab/[lang].astro`, each next to the other
  entries. Small merge conflicts there are expected; the controller resolves them.
- Content groups: follow `.claude/skills/write-article/SKILL.md` completely. That includes
  diagrams (static Astro SVG in `diagrams/`), sources, quizzes, Remember boxes, Safety, identical
  EN/SK structure and `npm run lint:content`.

## Global constraints

- Worktrees may start at `main` (`23c6170`, README only). Fast-forward to the base commit named in
  the brief first.
- Write the test first where a test makes sense. Commit after each piece of work: an imperative
  subject and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `npm run check` must
  pass before you report.
- Never push, deploy or run AWS commands. Don't edit `CLAUDE.md`, `docs/known-issues.md`, `infra/`,
  `.github/` or the dependencies in `package.json`.
- Browser checks: use your own preview port and a fresh Playwright context. Stop the server when
  you're done.
- Report every judgement call as `Ruling: <decision> — <why> — <cost if wrong>`.
