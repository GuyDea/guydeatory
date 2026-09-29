import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import ArticleFooter from '../src/components/article/ArticleFooter.astro';
import { getCatalog } from '../src/lib/content/catalog.ts';
import { formatDate } from '../src/lib/dates.ts';

// Content dates are calendar days: `updated: 2026-09-29` becomes midnight UTC. A build machine west
// of UTC is still on the 28th at that moment, so these tests run on Los Angeles time.
const WEST_OF_UTC = 'America/Los_Angeles';
const DAY = new Date('2026-09-29');
let originalTz: string | undefined;

beforeAll(() => {
  originalTz = process.env.TZ;
  process.env.TZ = WEST_OF_UTC;
});

afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe('formatDate', () => {
  it('runs where local time is still the day before', () => {
    expect(DAY.getDate()).toBe(28);
  });

  it('writes the calendar day of the content date, in every language', () => {
    expect(formatDate(DAY, 'en-GB')).toBe('29 September 2026');
    expect(formatDate(DAY, 'sk-SK')).toBe('29. septembra 2026');
  });
});

describe('ArticleFooter', () => {
  it('shows the day the article was updated', async () => {
    const catalog = await getCatalog();
    const article = { ...[...catalog.articles.values()][0]!, updated: DAY };
    const container = await AstroContainer.create();
    const updatedLine = async (lang: 'en' | 'sk') => {
      const html = await container.renderToString(ArticleFooter, { props: { lang, article, catalog } });
      return /<p class="updated"[^>]*>([^<]*)<\/p>/.exec(html)?.[1];
    };
    expect(await updatedLine('en')).toContain('29 September 2026');
    expect(await updatedLine('sk')).toContain('29. septembra 2026');
  });
});
