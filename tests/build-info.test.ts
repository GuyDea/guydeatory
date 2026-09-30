import { describe, expect, it } from 'vitest';
import { buildVersion } from '../src/lib/build-info.ts';

const SHA = '0123456789abcdef0123456789abcdef01234567';
const neverGit = () => {
  throw new Error('git must not run when GitHub Actions names the commit');
};

describe('buildVersion', () => {
  it('uses the commit GitHub Actions is building', () => {
    expect(buildVersion({ GITHUB_SHA: SHA }, neverGit)).toEqual({
      sha: SHA,
      short: '0123456',
      url: `https://github.com/GuyDea/guydeatory/commit/${SHA}`,
      dirty: false,
    });
  });

  it('asks git for the commit of a local build, and marks uncommitted changes', () => {
    const git = (args: string) => (args === 'rev-parse HEAD' ? SHA : ' M src/views/HomeView.astro');
    expect(buildVersion({}, git)).toMatchObject({ short: '0123456', dirty: true });
  });

  it('calls a local build clean when git reports no changes', () => {
    const git = (args: string) => (args === 'rev-parse HEAD' ? SHA : '');
    expect(buildVersion({}, git)?.dirty).toBe(false);
  });

  it('gives no version without a commit to name', () => {
    expect(buildVersion({}, () => null)).toBeNull();
    expect(buildVersion({ GITHUB_SHA: '' }, () => 'not a sha')).toBeNull();
  });
});
