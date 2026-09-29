import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { batches, pruneAssets, selectStaleAssets } from '../src/lib/prune-assets.ts';
import type { AwsCli } from '../src/lib/prune-assets.ts';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-20T12:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);

describe('selectStaleAssets', () => {
  const built = new Set(['_astro/app.new.js', '_astro/fonts/a.woff2']);

  it('removes assets the build no longer has once they were last uploaded more than 7 days ago', () => {
    const stored = [
      { key: '_astro/app.new.js', lastModified: daysAgo(30) },
      { key: '_astro/fonts/a.woff2', lastModified: daysAgo(400) },
      { key: '_astro/app.old.js', lastModified: daysAgo(8) },
      { key: '_astro/fonts/b.woff2', lastModified: daysAgo(7.01) },
      { key: '_astro/app.recent.js', lastModified: daysAgo(2) },
      { key: '_astro/app.edge.js', lastModified: daysAgo(7) },
    ];
    expect(selectStaleAssets(stored, built, NOW)).toEqual({
      stale: ['_astro/app.old.js', '_astro/fonts/b.woff2'],
      waiting: ['_astro/app.edge.js', '_astro/app.recent.js'],
    });
  });

  it('never touches files outside _astro/', () => {
    const stored = [
      { key: 'en/index.html', lastModified: daysAgo(90) },
      { key: '_astro', lastModified: daysAgo(90) },
      { key: 'pagefind/_astro/x.js', lastModified: daysAgo(90) },
    ];
    expect(selectStaleAssets(stored, built, NOW)).toEqual({ stale: [], waiting: [] });
  });

  it('keeps an asset whose upload date cannot be read', () => {
    expect(selectStaleAssets([{ key: '_astro/x.js', lastModified: new Date('not a date') }], built, NOW)).toEqual({
      stale: [],
      waiting: ['_astro/x.js'],
    });
  });
});

describe('batches', () => {
  it('splits into groups of at most 1,000', () => {
    const keys = Array.from({ length: 2500 }, (_, i) => `k${i}`);
    expect(batches(keys).map((batch) => batch.length)).toEqual([1000, 1000, 500]);
    expect(batches(keys).flat()).toEqual(keys);
    expect(batches([])).toEqual([]);
  });
});

interface StoredObject {
  Key: string;
  LastModified: string;
}

/** Stands in for the AWS CLI: serves a paged listing and records what delete-objects was asked to delete. */
function fakeAws(objects: StoredObject[], { pageSize = 1000, errors = [] as object[], dropToken = false } = {}) {
  const calls: string[][] = [];
  const deleteRequests: { Objects: { Key: string }[]; Quiet?: boolean }[] = [];
  const aws: AwsCli = async (args) => {
    calls.push(args);
    const flag = (name: string) => {
      const index = args.indexOf(name);
      return index === -1 ? undefined : args[index + 1];
    };
    const [service, command] = args;
    if (service === 's3api' && command === 'list-objects-v2') {
      const matching = objects.filter((object) => object.Key.startsWith(flag('--prefix') ?? ''));
      const token = flag('--continuation-token');
      const start = token ? Number(token.replace('opaque-', '')) : 0;
      const next = start + pageSize;
      const truncated = next < matching.length;
      return JSON.stringify({
        IsTruncated: truncated,
        KeyCount: Math.min(pageSize, matching.length - start),
        ...(matching.length > start ? { Contents: matching.slice(start, next) } : {}),
        ...(truncated && !dropToken ? { NextContinuationToken: `opaque-${next}` } : {}),
      });
    }
    if (service === 's3api' && command === 'delete-objects') {
      const request = flag('--delete')!;
      expect(request).toMatch(/^file:\/\//);
      deleteRequests.push(JSON.parse(await readFile(request.slice('file://'.length), 'utf8')));
      return errors.length ? JSON.stringify({ Errors: errors }) : '';
    }
    throw new Error(`unexpected command: aws ${args.join(' ')}`);
  };
  return { aws, calls, deleteRequests };
}

describe('pruneAssets', () => {
  let dist: string;

  beforeEach(async () => {
    dist = await mkdtemp(join(tmpdir(), 'guydeatory-prune-'));
    await mkdir(join(dist, '_astro', 'fonts'), { recursive: true });
    await writeFile(join(dist, '_astro', 'app.new.js'), 'js');
    await writeFile(join(dist, '_astro', 'fonts', 'a.woff2'), 'font');
    await writeFile(join(dist, 'index.html'), 'html');
  });

  afterEach(async () => {
    await rm(dist, { recursive: true, force: true });
  });

  const old = Array.from({ length: 2500 }, (_, i) => ({ Key: `_astro/old-${String(i).padStart(4, '0')}.js`, LastModified: daysAgo(10).toISOString() }));
  const current = [
    { Key: '_astro/app.new.js', LastModified: daysAgo(60).toISOString() },
    { Key: '_astro/fonts/a.woff2', LastModified: daysAgo(60).toISOString() },
  ];
  // The CLI prints timestamps like this; recent assets stay for the grace period.
  const recent = [{ Key: '_astro/recent.js', LastModified: '2026-10-18T09:30:00+00:00' }];

  it('pages through the listing and deletes stale assets in batches of up to 1,000', async () => {
    const { aws, calls, deleteRequests } = fakeAws([...current, ...recent, ...old]);
    const result = await pruneAssets({ aws, bucket: 'site-bucket', distDir: dist, now: NOW });

    const lists = calls.filter((args) => args[1] === 'list-objects-v2');
    expect(lists).toHaveLength(3);
    for (const args of lists) {
      expect(args).toEqual(expect.arrayContaining(['--bucket', 'site-bucket', '--prefix', '_astro/', '--no-paginate', '--output', 'json']));
    }
    // The first request starts at the beginning; each next one continues where S3 said to.
    expect(lists[0]).not.toContain('--continuation-token');
    expect(lists.slice(1).map((args) => args[args.indexOf('--continuation-token') + 1])).toEqual(['opaque-1000', 'opaque-2000']);

    expect(deleteRequests.map((request) => request.Objects.length)).toEqual([1000, 1000, 500]);
    expect(deleteRequests.every((request) => request.Quiet === true)).toBe(true);
    expect(deleteRequests.flatMap((request) => request.Objects.map((object) => object.Key))).toEqual(old.map((object) => object.Key));
    for (const args of calls.filter((a) => a[1] === 'delete-objects')) {
      expect(args).toEqual(expect.arrayContaining(['--bucket', 'site-bucket', '--output', 'json']));
    }

    expect(result).toEqual({ deleted: old.map((object) => object.Key), waiting: ['_astro/recent.js'] });
  });

  it('needs only ListBucket and DeleteObject: it runs list-objects-v2 and delete-objects, nothing else', async () => {
    const { aws, calls } = fakeAws([...current, ...old.slice(0, 3)]);
    await pruneAssets({ aws, bucket: 'site-bucket', distDir: dist, now: NOW });
    expect(new Set(calls.map((args) => args.slice(0, 2).join(' ')))).toEqual(new Set(['s3api list-objects-v2', 's3api delete-objects']));
  });

  it('deletes nothing when nothing is stale', async () => {
    const { aws, calls } = fakeAws([...current, ...recent]);
    expect(await pruneAssets({ aws, bucket: 'site-bucket', distDir: dist, now: NOW })).toEqual({ deleted: [], waiting: ['_astro/recent.js'] });
    expect(calls.filter((args) => args[1] === 'delete-objects')).toEqual([]);
  });

  it('only reports what it would delete in a dry run', async () => {
    const { aws, calls } = fakeAws([...current, ...old.slice(0, 3)]);
    const result = await pruneAssets({ aws, bucket: 'site-bucket', distDir: dist, now: NOW, dryRun: true });
    expect(result.deleted).toEqual(old.slice(0, 3).map((object) => object.Key));
    expect(calls.filter((args) => args[1] === 'delete-objects')).toEqual([]);
  });

  it('refuses to run without built assets, so a wrong folder can never empty the bucket', async () => {
    const { aws, calls } = fakeAws(old);
    await rm(join(dist, '_astro'), { recursive: true });
    await expect(pruneAssets({ aws, bucket: 'site-bucket', distDir: dist, now: NOW })).rejects.toThrow(/no built assets/i);
    expect(calls).toEqual([]);
  });

  it('fails when S3 reports keys it could not delete', async () => {
    const { aws } = fakeAws([...current, ...old.slice(0, 2)], { errors: [{ Key: old[0]!.Key, Code: 'AccessDenied', Message: 'Access Denied' }] });
    await expect(pruneAssets({ aws, bucket: 'site-bucket', distDir: dist, now: NOW })).rejects.toThrow(/AccessDenied/);
  });

  it('stops when a truncated listing has no continuation token', async () => {
    const { aws } = fakeAws(old, { pageSize: 1000, dropToken: true });
    await expect(pruneAssets({ aws, bucket: 'site-bucket', distDir: dist, now: NOW })).rejects.toThrow(/continuation token/i);
  });
});

describe('deploy.sh', () => {
  it('uploads assets without deleting any, and prunes through the script after the invalidation', async () => {
    const script = await readFile('scripts/deploy.sh', 'utf8');
    const commands = script
      .replace(/\\\n\s*/g, ' ')
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('#'));
    const assetSyncs = commands.filter((command) => command.includes('aws s3 sync') && command.includes('/_astro"'));
    expect(assetSyncs.length).toBeGreaterThan(0);
    for (const command of assetSyncs) expect(command).not.toContain('--delete');

    const prune = commands.findIndex((command) => /npx tsx scripts\/prune-assets\.ts "\$BUCKET"/.test(command));
    const invalidated = commands.findIndex((command) => command.includes('wait invalidation-completed'));
    expect(prune).toBeGreaterThan(invalidated);
    expect(invalidated).toBeGreaterThan(-1);
  });
});
