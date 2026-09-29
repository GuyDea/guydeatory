/**
 * npx tsx scripts/prune-assets.ts <bucket> [--dry-run]
 *
 * Deletes hashed assets (s3://<bucket>/_astro/…) that the current build (dist/_astro) no longer has
 * and that were last uploaded more than 7 days ago. deploy.sh runs it after the CloudFront
 * invalidation. It needs only s3:ListBucket and s3:DeleteObject. See src/lib/prune-assets.ts.
 */
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { GRACE_DAYS, pruneAssets } from '../src/lib/prune-assets.ts';
import type { AwsCli } from '../src/lib/prune-assets.ts';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const bucket = args.find((arg) => !arg.startsWith('--'));
if (!bucket) {
  console.error('Usage: npx tsx scripts/prune-assets.ts <bucket> [--dry-run]');
  process.exit(2);
}

const run = promisify(execFile);
const aws: AwsCli = async (awsArgs) => (await run('aws', awsArgs, { maxBuffer: 256 * 1024 * 1024 })).stdout;

try {
  const { deleted, waiting } = await pruneAssets({ aws, bucket, distDir: join(process.cwd(), 'dist'), now: new Date(), dryRun });
  if (dryRun) {
    console.log(`Would remove ${deleted.length} old asset(s):${deleted.map((key) => `\n  ${key}`).join('')}`);
  } else {
    console.log(`✓ Removed ${deleted.length} old asset(s).`);
  }
  if (waiting.length > 0) console.log(`  ${waiting.length} unused asset(s) stay until they are ${GRACE_DAYS} days old.`);
} catch (error) {
  console.error(`✗ Pruning old assets failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
