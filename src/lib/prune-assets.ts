/**
 * Removes old hashed assets (`_astro/…`) from the site bucket, but only after a grace period.
 *
 * A reader who opened a page before a deploy can still load that page's old widget chunks lazily,
 * so an asset is deleted only when the current build no longer has it *and* it was last uploaded
 * more than GRACE_DAYS days ago. Every deploy uploads the current assets again (the build writes
 * fresh files and `aws s3 sync` uploads anything newer than the stored copy), so an asset's
 * LastModified is the last deploy that shipped it.
 *
 * Used by scripts/prune-assets.ts. It runs only `s3api list-objects-v2` (s3:ListBucket) and
 * `s3api delete-objects` (s3:DeleteObject).
 */
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';

export const ASSET_PREFIX = '_astro/';
export const GRACE_DAYS = 7;
/** The most keys one DeleteObjects request accepts. */
export const DELETE_BATCH = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface StoredAsset {
  key: string;
  lastModified: Date;
}

/** Runs the AWS CLI with these arguments and resolves to what it printed. */
export type AwsCli = (args: string[]) => Promise<string>;

/**
 * Sorts the stored assets the build no longer has into those to delete now (`stale`: last uploaded
 * more than `graceDays` days ago) and those that wait for a later deploy (`waiting`). Assets the
 * build still has, and keys outside `_astro/`, are never in either list.
 */
export function selectStaleAssets(
  stored: readonly StoredAsset[],
  built: ReadonlySet<string>,
  now: Date,
  graceDays = GRACE_DAYS,
): { stale: string[]; waiting: string[] } {
  const cutoff = now.getTime() - graceDays * DAY_MS;
  const unused = stored.filter(({ key }) => key.startsWith(ASSET_PREFIX) && key.length > ASSET_PREFIX.length && !built.has(key));
  // An unreadable date gives NaN, which is never older than the cutoff: such an asset is kept.
  const isStale = ({ lastModified }: StoredAsset) => lastModified.getTime() < cutoff;
  return {
    stale: unused.filter(isStale).map(({ key }) => key).sort(),
    waiting: unused.filter((asset) => !isStale(asset)).map(({ key }) => key).sort(),
  };
}

export function batches<T>(items: readonly T[], size = DELETE_BATCH): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += size) result.push(items.slice(start, start + size));
  return result;
}

/** The asset keys of the current build: dist/_astro/x.js → _astro/x.js. */
async function listBuiltAssets(distDir: string): Promise<Set<string>> {
  const dir = join(distDir, '_astro');
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  return new Set(
    entries.filter((entry) => entry.isFile()).map((entry) => ASSET_PREFIX + relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/')),
  );
}

interface ListPage {
  IsTruncated?: boolean;
  NextContinuationToken?: string;
  Contents?: { Key: string; LastModified: string }[];
}

/** Every stored object under `_astro/`, one page (up to 1,000 keys) per request. */
async function listStoredAssets(aws: AwsCli, bucket: string): Promise<StoredAsset[]> {
  const assets: StoredAsset[] = [];
  let token: string | undefined;
  do {
    const args = ['s3api', 'list-objects-v2', '--bucket', bucket, '--prefix', ASSET_PREFIX, '--no-paginate', '--output', 'json'];
    if (token) args.push('--continuation-token', token);
    const output = await aws(args);
    const page = (output.trim() ? JSON.parse(output) : {}) as ListPage;
    for (const object of page.Contents ?? []) assets.push({ key: object.Key, lastModified: new Date(object.LastModified) });
    if (page.IsTruncated && !page.NextContinuationToken) throw new Error('S3 listing is truncated but has no continuation token');
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return assets;
}

/** Deletes the keys with DeleteObjects, up to 1,000 per request. Fails if S3 reports any key it could not delete. */
async function deleteAssets(aws: AwsCli, bucket: string, keys: readonly string[]): Promise<void> {
  // The request goes through a file: 1,000 keys on the command line could pass the argument size limit.
  const dir = await mkdtemp(join(tmpdir(), 'guydeatory-prune-'));
  try {
    for (const [index, batch] of batches(keys).entries()) {
      const file = join(dir, `delete-${index}.json`);
      await writeFile(file, JSON.stringify({ Objects: batch.map((Key) => ({ Key })), Quiet: true }));
      const output = await aws(['s3api', 'delete-objects', '--bucket', bucket, '--delete', `file://${file}`, '--output', 'json']);
      const { Errors = [] } = (output.trim() ? JSON.parse(output) : {}) as { Errors?: { Key: string; Code: string; Message?: string }[] };
      if (Errors.length > 0) {
        const detail = Errors.slice(0, 5).map((error) => `${error.Key}: ${error.Code}${error.Message ? ` (${error.Message})` : ''}`);
        throw new Error(`S3 could not delete ${Errors.length} of ${batch.length} assets:\n  ${detail.join('\n  ')}`);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export interface PruneOptions {
  aws: AwsCli;
  bucket: string;
  /** The built site; its `_astro/` folder holds the assets the current pages use. */
  distDir: string;
  now: Date;
  graceDays?: number;
  /** List what would be deleted, but delete nothing. */
  dryRun?: boolean;
}

/** Deletes the stale assets (see selectStaleAssets). Resolves to the deleted keys and those still waiting. */
export async function pruneAssets({ aws, bucket, distDir, now, graceDays = GRACE_DAYS, dryRun = false }: PruneOptions) {
  const built = await listBuiltAssets(distDir);
  // Without the build's asset list every stored asset would look unused.
  if (built.size === 0) throw new Error(`No built assets in ${join(distDir, '_astro')}: run the build first. Nothing was deleted.`);
  const { stale, waiting } = selectStaleAssets(await listStoredAssets(aws, bucket), built, now, graceDays);
  if (!dryRun && stale.length > 0) await deleteAssets(aws, bucket, stale);
  return { deleted: stale, waiting };
}
