import type { RawContent } from '../../src/lib/content/types.ts';

type Data = Record<string, unknown>;
type RawMeta = RawContent['metas'][number];
type RawText = RawContent['texts'][number];

export function meta(id: string, data: Data = {}): RawMeta {
  return {
    id,
    file: `content/articles/${id}/meta.yaml`,
    data: {
      topics: ['electricity'],
      labels: ['high-level'],
      status: 'published',
      created: '2026-09-28',
      updated: '2026-09-28',
      ...data,
    },
  };
}

export function text(id: string, lang: string, data: Data = {}, body = 'Some words here.'): RawText {
  return {
    id,
    lang,
    entryId: `${id}/${lang}`,
    file: `content/articles/${id}/${lang}.mdx`,
    data: {
      title: `Title of ${id} (${lang})`,
      slug: lang === 'en' ? id : `${id}-${lang}`,
      summary: `A short answer about ${id} that is long enough.`,
      ...data,
    },
    body,
  };
}

interface ArticleSpec {
  meta?: Data;
  en?: Data;
  sk?: Data;
  bodyEn?: string;
  bodySk?: string;
}

/** A complete, valid article in en + sk. */
export function article(id: string, spec: ArticleSpec = {}): { metas: RawMeta[]; texts: RawText[] } {
  return {
    metas: [meta(id, spec.meta)],
    texts: [text(id, 'en', spec.en, spec.bodyEn), text(id, 'sk', spec.sk, spec.bodySk)],
  };
}

const localized = (en: string, sk: string) => ({ en, sk });

export const TOPICS = [
  {
    id: 'science',
    slug: localized('science', 'veda'),
    name: localized('Science', 'Veda'),
    description: localized('How nature works.', 'Ako funguje príroda.'),
    children: [
      {
        id: 'physics',
        slug: localized('physics', 'fyzika'),
        name: localized('Physics', 'Fyzika'),
        description: localized('Matter and energy.', 'Látka a energia.'),
        children: [
          {
            id: 'electricity',
            slug: localized('electricity', 'elektrina'),
            name: localized('Electricity', 'Elektrina'),
            description: localized('Charges and currents.', 'Náboje a prúdy.'),
          },
          {
            id: 'heat',
            slug: localized('heat', 'teplo'),
            name: localized('Heat', 'Teplo'),
            description: localized('Warm and cold.', 'Teplé a studené.'),
          },
        ],
      },
    ],
  },
  {
    id: 'technology',
    slug: localized('technology', 'technika'),
    name: localized('Technology', 'Technika'),
    description: localized('Things people build.', 'Veci, ktoré ľudia stavajú.'),
  },
];

export const LABELS = [
  { id: 'high-level', color: 'sky', name: localized('Big picture', 'Celkový obraz'), description: localized('Intuition first.', 'Najprv intuícia.') },
  { id: 'low-level', color: 'violet', name: localized('Under the hood', 'Pod kapotou'), description: localized('The mechanism.', 'Mechanizmus.') },
  { id: 'trivia', color: 'amber', name: localized('Fun facts', 'Zaujímavosti'), description: localized('Surprises.', 'Prekvapenia.') },
];

interface RawSpec {
  articles?: { metas: RawMeta[]; texts: RawText[] }[];
  metas?: RawMeta[];
  texts?: RawText[];
  topics?: unknown;
  labels?: unknown;
  home?: unknown;
}

export function raw(spec: RawSpec = {}): RawContent {
  const metas = [...(spec.articles ?? []).flatMap((a) => a.metas), ...(spec.metas ?? [])];
  const texts = [...(spec.articles ?? []).flatMap((a) => a.texts), ...(spec.texts ?? [])];
  return {
    metas,
    texts,
    topics: { file: 'content/topics.yaml', data: spec.topics ?? TOPICS },
    labels: { file: 'content/labels.yaml', data: spec.labels ?? LABELS },
    home: { file: 'content/home.yaml', data: spec.home ?? { featured: [] } },
  };
}
