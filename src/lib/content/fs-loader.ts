import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { parse as parseYaml } from 'yaml';
import type { Problem, RawContent } from './types.ts';

export const CONTENT_DIR = 'content';
export const ARTICLES_DIR = `${CONTENT_DIR}/articles`;

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function listDir(path: string) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/**
 * Reads everything under `<root>/content` into RawContent (unvalidated).
 * File paths in the result are project-relative with forward slashes, for error messages.
 * Syntax errors (YAML, frontmatter) become problems in `loadProblems`.
 */
export async function loadRawContent(root: string): Promise<RawContent> {
  const loadProblems: Problem[] = [];

  const yamlFile = async (file: string) => {
    const source = await readOptional(join(root, file));
    if (source === undefined) return { file, data: undefined };
    try {
      return { file, data: parseYaml(source) as unknown };
    } catch (error) {
      loadProblems.push({ file, message: `invalid YAML: ${(error as Error).message}` });
      return { file, data: null };
    }
  };

  const metas: RawContent['metas'] = [];
  const texts: RawContent['texts'] = [];
  const dirs = (await listDir(join(root, ARTICLES_DIR))).filter((d) => d.isDirectory()).map((d) => d.name).sort();

  for (const id of dirs) {
    const files = (await listDir(join(root, ARTICLES_DIR, id))).filter((f) => f.isFile()).map((f) => f.name).sort();
    if (files.includes('meta.yaml')) {
      const { file, data } = await yamlFile(`${ARTICLES_DIR}/${id}/meta.yaml`);
      metas.push({ id, file, data });
    }
    for (const name of files.filter((f) => f.endsWith('.mdx'))) {
      const lang = name.slice(0, -'.mdx'.length);
      const file = `${ARTICLES_DIR}/${id}/${name}`;
      const source = await readFile(join(root, file), 'utf8');
      try {
        const parsed = matter(source);
        texts.push({ id, lang, entryId: `${id}/${lang}`, file, data: parsed.data, body: parsed.content });
      } catch (error) {
        loadProblems.push({ file, message: `invalid frontmatter: ${(error as Error).message}` });
        // Keep the file in the list (it exists), so it is not also reported as a missing translation.
        texts.push({ id, lang, entryId: `${id}/${lang}`, file, data: null, body: '' });
      }
    }
  }

  return {
    metas,
    texts,
    topics: await yamlFile(`${CONTENT_DIR}/topics.yaml`),
    labels: await yamlFile(`${CONTENT_DIR}/labels.yaml`),
    home: await yamlFile(`${CONTENT_DIR}/home.yaml`),
    loadProblems,
  };
}
