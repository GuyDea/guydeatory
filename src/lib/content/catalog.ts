import { buildCatalog } from './build-catalog.ts';
import { loadRawContent } from './fs-loader.ts';
import { ContentValidationError } from './problems.ts';
import type { Catalog } from './types.ts';

/** In dev, content changes while the server runs: reuse a catalog only briefly (one page render). */
const DEV_TTL_MS = 1500;

let cached: { promise: Promise<Catalog>; at: number } | undefined;

async function load(): Promise<Catalog> {
  const raw = await loadRawContent(process.cwd());
  const { catalog, problems } = buildCatalog(raw, { includeDrafts: import.meta.env.DEV });
  if (problems.length > 0) throw new ContentValidationError(problems);
  return catalog;
}

/** The validated content catalog. Throws ContentValidationError listing every problem. */
export function getCatalog(): Promise<Catalog> {
  const now = Date.now();
  if (!cached || (import.meta.env.DEV && now - cached.at > DEV_TTL_MS)) {
    cached = { promise: load(), at: now };
    cached.promise.catch(() => {
      cached = undefined;
    });
  }
  return cached.promise;
}
