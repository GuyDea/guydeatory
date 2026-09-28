import { z } from 'astro/zod';
import { LANGUAGES } from '../../i18n/languages.ts';
import { ID_RE } from './wiki-links.ts';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const idSchema = z.string().regex(ID_RE, 'must be lowercase kebab-case, e.g. "electric-current"');
const slugSchema = z.string().regex(SLUG_RE, 'must be lowercase ASCII kebab-case without diacritics, e.g. "elektricky-prud"');
const nonEmpty = z.string().trim().min(1);

/** A value per language: required languages must be present, optional ones may be missing. */
function localized<T extends z.ZodType>(inner: T) {
  const shape: Record<string, z.ZodType> = {};
  for (const language of LANGUAGES) shape[language.code] = language.required ? inner : inner.optional();
  return z.strictObject(shape);
}

/** meta.yaml — language-independent facts about an article. */
export const articleMetaSchema = z.strictObject({
  topics: z.array(idSchema).min(1),
  labels: z.array(idSchema).min(1),
  prerequisites: z.array(idSchema).default([]),
  related: z.array(idSchema).default([]),
  status: z.enum(['published', 'stub', 'draft']),
  created: z.coerce.date(),
  updated: z.coerce.date(),
  sources: z.array(z.strictObject({ title: nonEmpty, url: z.url() })).default([]),
});

/** Frontmatter of one language file (`en.mdx`, `sk.mdx`, …). */
export const articleTextSchema = z.strictObject({
  title: nonEmpty,
  term: nonEmpty.optional(),
  slug: slugSchema,
  summary: z.string().trim().min(20).max(320),
  keywords: z.array(nonEmpty).default([]),
  reviewed: z.boolean().default(false),
});

export const topicNodeSchema = z.strictObject({
  id: idSchema,
  icon: z.string().optional(),
  slug: localized(slugSchema),
  name: localized(nonEmpty),
  description: localized(nonEmpty),
  get children(): z.ZodOptional<z.ZodArray<typeof topicNodeSchema>> {
    return z.array(topicNodeSchema).optional();
  },
});
export type TopicNode = z.infer<typeof topicNodeSchema>;

export const topicsFileSchema = z.array(topicNodeSchema);

export const labelsFileSchema = z.array(
  z.strictObject({
    id: idSchema,
    color: nonEmpty,
    name: localized(nonEmpty),
    description: localized(nonEmpty),
  }),
);

export const homeFileSchema = z.strictObject({
  featured: z.array(idSchema).default([]),
});

/** Pages outside the article graph (e.g. About). */
export const pageTextSchema = z.strictObject({
  title: nonEmpty,
  summary: z.string().trim().min(20).max(320),
});
