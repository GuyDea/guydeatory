/**
 * Creates the files for a new article as a draft: meta.yaml plus one language file per language,
 * each full of TODO placeholders. The catalog refuses to publish anything that still contains TODO.
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LANG_CODES } from '../i18n/languages.ts';
import type { LangCode } from '../i18n/languages.ts';
import { ARTICLES_DIR } from './content/fs-loader.ts';
import { ID_RE } from './content/wiki-links.ts';

export interface ScaffoldOptions {
  topic: string;
  label: string;
  /** ISO date for created/updated; defaults to today. */
  today?: string;
}

function metaTemplate({ topic, label, today }: Required<ScaffoldOptions>): string {
  return `# Language-independent facts about this article. Guide: docs/writing-guide.md (Metadata).
topics: [${topic}] # topic ids from content/topics.yaml, primary first
labels: [${label}] # high-level | low-level | calculation | trivia | history, main first
prerequisites: [] # article ids worth reading first
related: [] # article ids for "Where to next?", best first
status: draft # draft → published (or stub for a short-but-real version)
created: ${today}
updated: ${today}
sources: [] # - { title: "…", url: "https://…" }
`;
}

const TEXT_TEMPLATES: Record<LangCode, (id: string) => string> = {
  en: (id) => `---
title: 'TODO: the question, the way a child would ask it'
term: ${id.replace(/-/g, ' ')}
slug: ${id}
summary: 'TODO: one or two sentences that answer the question on their own.'
keywords: []
---

TODO: start from something the reader already knows, then build up one idea at a time.
Link terms on first use with double square brackets around an article id. See docs/writing-guide.md.

## TODO: first section, ideally phrased as a question

<Remember>
- TODO: three to five key ideas
</Remember>
`,
  sk: (id) => `---
title: 'TODO: otázka tak, ako by sa opýtalo dieťa'
term: 'TODO: pojem po slovensky'
slug: ${id} # zmeň na slovenský slug bez diakritiky, napr. tepelne-cerpadlo
summary: 'TODO: jedna alebo dve vety, ktoré samy odpovedia na otázku.'
keywords: []
---

TODO: začni niečím, čo čitateľ pozná, a potom pridávaj jednu myšlienku za druhou.
Pojmy prepoj pri prvom použití dvojitými hranatými zátvorkami okolo id článku. Pozri docs/translation.md.

## TODO: prvá časť, ideálne ako otázka

<Remember>
- TODO: tri až päť hlavných myšlienok
</Remember>
`,
};

export async function scaffoldArticle(root: string, id: string, options: ScaffoldOptions): Promise<string[]> {
  if (!ID_RE.test(id)) throw new Error(`"${id}" is not a valid article id: use lowercase kebab-case, e.g. heat-pump`);
  const dir = join(root, ARTICLES_DIR, id);
  const exists = await access(dir).then(
    () => true,
    () => false,
  );
  if (exists) throw new Error(`Article "${id}" already exists in ${ARTICLES_DIR}/${id}`);

  const today = options.today ?? new Date().toISOString().slice(0, 10);
  await mkdir(dir, { recursive: true });
  const files: [string, string][] = [
    ['meta.yaml', metaTemplate({ ...options, today })],
    ...LANG_CODES.map((lang): [string, string] => [`${lang}.mdx`, TEXT_TEMPLATES[lang](id)]),
  ];
  for (const [name, body] of files) await writeFile(join(dir, name), body, { flag: 'wx' });
  return files.map(([name]) => `${ARTICLES_DIR}/${id}/${name}`);
}
