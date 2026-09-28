import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { articleTextSchema, pageTextSchema } from './lib/content/schemas.ts';

/**
 * MDX rendering only. Metadata, validation and cross-links come from the catalog
 * (src/lib/content/catalog.ts), which reads the same files. Entry ids: `<folder>/<lang>`.
 */
const idFromPath = ({ entry }: { entry: string }) => entry.replace(/\.mdx$/, '');

const articleTexts = defineCollection({
  loader: glob({ pattern: '*/*.mdx', base: './content/articles', generateId: idFromPath }),
  schema: articleTextSchema,
});

const pages = defineCollection({
  loader: glob({ pattern: '*/*.mdx', base: './content/pages', generateId: idFromPath }),
  schema: pageTextSchema,
});

export const collections = { articleTexts, pages };
