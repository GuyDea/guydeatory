/**
 * Which commit a build comes from, so the footer can show the version that is live.
 * GitHub Actions names the commit it checked out; local builds ask git.
 */
import { execSync } from 'node:child_process';

export const REPOSITORY_URL = 'https://github.com/GuyDea/guydeatory';

export interface BuildVersion {
  sha: string;
  /** The first 7 characters, as GitHub shows them. */
  short: string;
  url: string;
  /** Built from a local checkout with uncommitted changes. */
  dirty: boolean;
}

type Git = (args: string) => string | null;

const runGit: Git = (args) => {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

export function buildVersion(env: Record<string, string | undefined> = process.env, git: Git = runGit): BuildVersion | null {
  const sha = env.GITHUB_SHA || git('rev-parse HEAD');
  if (!sha || !/^[0-9a-f]{40}$/.test(sha)) return null;
  const changes = env.GITHUB_SHA ? '' : git('status --porcelain');
  return { sha, short: sha.slice(0, 7), url: `${REPOSITORY_URL}/commit/${sha}`, dirty: Boolean(changes) };
}

let cached: BuildVersion | null | undefined;

/** This build's version, worked out once rather than for every page. */
export function currentBuildVersion(): BuildVersion | null {
  if (cached === undefined) cached = buildVersion();
  return cached;
}
