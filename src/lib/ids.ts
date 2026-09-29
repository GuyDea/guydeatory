import { foldDiacritics } from './text.ts';

const MAX_SLUG = 40;
const issued = new WeakMap<object, Set<string>>();

/** "Časti atómu hélia" → "casti-atomu-helia", at most MAX_SLUG characters, ending on a whole word. */
function slugify(label: string): string {
  const slug = foldDiacritics(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= MAX_SLUG) return slug;
  return slug.slice(0, MAX_SLUG + 1).replace(/-[^-]*$/, '').slice(0, MAX_SLUG);
}

/**
 * An element id made from a label, such as a diagram's title. The same page gets the same ids on
 * every build, so builds are reproducible, and a label used again on the page gets -2, -3… so ids
 * stay unique. `page` is anything unique to one page render: components pass `Astro.request`.
 */
export function pageId(page: object, prefix: string, label: string): string {
  let used = issued.get(page);
  if (!used) issued.set(page, (used = new Set()));
  const slug = slugify(label);
  const base = slug ? `${prefix}-${slug}` : prefix;
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}
