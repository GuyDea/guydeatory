import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../src/lib/content/build-catalog.ts';
import { formatProblems, suggest } from '../src/lib/content/problems.ts';
import type { Problem, RawContent } from '../src/lib/content/types.ts';
import { article, LABELS, meta, raw, text, TOPICS } from './fixtures/content.ts';

const build = (content: RawContent, includeDrafts = false) => buildCatalog(content, { includeDrafts });

/** Asserts exactly one problem, in `file`, whose message matches `pattern`. */
function expectOneProblem(problems: Problem[], file: string, pattern: RegExp) {
  expect(problems, JSON.stringify(problems, null, 2)).toHaveLength(1);
  expect(problems[0]!.file).toBe(file);
  expect(problems[0]!.message).toMatch(pattern);
}

describe('buildCatalog — valid content', () => {
  it('produces articles with texts per language and no problems', () => {
    const { catalog, problems } = build(raw({ articles: [article('voltage'), article('atom')] }));
    expect(problems).toEqual([]);
    expect([...catalog.articles.keys()].sort()).toEqual(['atom', 'voltage']);
    const voltage = catalog.articles.get('voltage')!;
    expect(voltage.texts.en?.slug).toBe('voltage');
    expect(voltage.texts.sk?.slug).toBe('voltage-sk');
    expect(voltage.texts.sk?.entryId).toBe('voltage/sk');
    expect(voltage.created).toBeInstanceOf(Date);
  });

  it('defaults term to title', () => {
    const { catalog } = build(raw({ articles: [article('atom', { en: { title: 'What is an atom?' }, sk: { term: 'atóm' } })] }));
    expect(catalog.articles.get('atom')!.texts.en!.term).toBe('What is an atom?');
    expect(catalog.articles.get('atom')!.texts.sk!.term).toBe('atóm');
  });

  it('flattens the topic tree depth-first with parent, children and depth', () => {
    const { catalog } = build(raw());
    expect([...catalog.topics.keys()]).toEqual(['science', 'physics', 'electricity', 'heat', 'technology']);
    expect(catalog.rootTopics).toEqual(['science', 'technology']);
    expect(catalog.topics.get('physics')).toMatchObject({ parent: 'science', children: ['electricity', 'heat'], depth: 1 });
    expect(catalog.topics.get('electricity')).toMatchObject({ parent: 'physics', children: [], depth: 2 });
    expect(catalog.topics.get('science')).toMatchObject({ parent: null, depth: 0 });
  });

  it('keeps labels in file order', () => {
    const { catalog } = build(raw());
    expect([...catalog.labels.keys()]).toEqual(['high-level', 'low-level', 'trivia']);
  });

  it('computes deduplicated backlinks from every language', () => {
    const content = raw({
      articles: [
        article('electric-current', { bodyEn: '[[voltage]] and again [[voltage]]', bodySk: '[[voltage|napätie]] a [[atom]]' }),
        article('atom', { bodyEn: 'An [[voltage]] mention.' }),
        article('voltage'),
      ],
    });
    const { catalog, problems } = build(content);
    expect(problems).toEqual([]);
    expect(catalog.backlinks.get('voltage')).toEqual(['atom', 'electric-current']);
    expect(catalog.backlinks.get('atom')).toEqual(['electric-current']);
    expect(catalog.backlinks.get('electric-current') ?? []).toEqual([]);
  });

  it('counts words without code, math, JSX tags or imports', () => {
    const body = [
      "import X from './x.svelte';",
      '',
      'Hello brave world.',
      '',
      '```js',
      'const ignored = 1;',
      '```',
      '',
      '<GoDeeper title="Not counted">',
      'Deep text here with $$I = V / R$$ math and `code`.',
      '</GoDeeper>',
      '',
      '<X client:visible />',
      'See [[voltage|the push]].',
    ].join('\n');
    const { catalog } = build(raw({ articles: [article('atom', { bodyEn: body }), article('voltage')] }));
    // Hello brave world (3) + Deep text here with math and (6) + See the push (3)
    expect(catalog.articles.get('atom')!.texts.en!.wordCount).toBe(12);
  });

  it('excludes drafts unless asked to include them', () => {
    const content = raw({ articles: [article('atom', { meta: { status: 'draft' } }), article('voltage')] });
    expect(build(content, false).catalog.articles.has('atom')).toBe(false);
    expect(build(content, true).catalog.articles.has('atom')).toBe(true);
  });

  it('reads featured articles from home data', () => {
    const { catalog, problems } = build(raw({ articles: [article('atom')], home: { featured: ['atom'] } }));
    expect(problems).toEqual([]);
    expect(catalog.featured).toEqual(['atom']);
  });
});

describe('buildCatalog — validation rules', () => {
  it('1a. rejects meta that fails its schema', () => {
    const bad = article('atom', { meta: { labels: [] } });
    const { problems } = build(raw({ articles: [bad] }));
    expectOneProblem(problems, 'content/articles/atom/meta.yaml', /labels/);
  });

  it('1b. rejects unknown frontmatter keys (typos)', () => {
    const bad = article('atom', { en: { titel: 'Oops' } });
    const { problems } = build(raw({ articles: [bad] }));
    expectOneProblem(problems, 'content/articles/atom/en.mdx', /titel/);
  });

  it('2. rejects a language file without meta.yaml', () => {
    const { problems } = build(raw({ texts: [text('orphan', 'en'), text('orphan', 'sk')] }));
    expect(problems.map((p) => p.file).sort()).toEqual(['content/articles/orphan/en.mdx', 'content/articles/orphan/sk.mdx']);
    expect(problems[0]!.message).toMatch(/meta\.yaml/);
  });

  it('3. rejects a missing required language', () => {
    const { problems } = build(raw({ metas: [meta('atom')], texts: [text('atom', 'en')] }));
    expectOneProblem(problems, 'content/articles/atom/meta.yaml', /Slovak.*sk\.mdx/);
  });

  it('4. rejects a file for an unconfigured language', () => {
    const { problems } = build(raw({ articles: [article('atom')], texts: [text('atom', 'de')] }));
    expectOneProblem(problems, 'content/articles/atom/de.mdx', /unknown language "de"/);
  });

  it('5a. rejects an unknown topic', () => {
    const { problems } = build(raw({ articles: [article('atom', { meta: { topics: ['electricty'] } })] }));
    expectOneProblem(problems, 'content/articles/atom/meta.yaml', /unknown topic "electricty".*did you mean "electricity"/);
  });

  it('5b. rejects an unknown label', () => {
    const { problems } = build(raw({ articles: [article('atom', { meta: { labels: ['funfacts'] } })] }));
    expectOneProblem(problems, 'content/articles/atom/meta.yaml', /unknown label "funfacts"/);
  });

  it('6a. rejects unknown prerequisites and related articles with a suggestion', () => {
    const { problems } = build(
      raw({ articles: [article('atom', { meta: { prerequisites: ['electrons'], related: ['voltage'] } }), article('electron')] }),
    );
    expect(problems.map((p) => p.message).sort()).toEqual([
      expect.stringMatching(/prerequisites.*unknown article "electrons".*did you mean "electron"/),
      expect.stringMatching(/related.*unknown article "voltage"/),
    ]);
  });

  it('6b. rejects unknown featured articles', () => {
    const { problems } = build(raw({ articles: [article('atom')], home: { featured: ['atoms'] } }));
    expectOneProblem(problems, 'content/home.yaml', /unknown article "atoms".*did you mean "atom"/);
  });

  it('7. rejects a wiki-link to an unknown article, naming the link and a suggestion', () => {
    const { problems } = build(raw({ articles: [article('atom', { bodySk: 'Tu je [[voltag|napätie]].' }), article('voltage')] }));
    expectOneProblem(problems, 'content/articles/atom/sk.mdx', /\[\[voltag\|napätie\]\].*unknown article "voltag".*did you mean "voltage"/);
  });

  it('8. rejects a wiki-link to a draft when drafts are excluded', () => {
    const content = raw({ articles: [article('atom', { bodyEn: 'See [[voltage]].' }), article('voltage', { meta: { status: 'draft' } })] });
    expectOneProblem(build(content, false).problems, 'content/articles/atom/en.mdx', /draft/);
    expect(build(content, true).problems).toEqual([]);
  });

  it('9. rejects malformed wiki-links', () => {
    const { problems } = build(raw({ articles: [article('atom', { bodyEn: 'Bad [[Voltage]] link.' }), article('voltage')] }));
    expectOneProblem(problems, 'content/articles/atom/en.mdx', /malformed.*\[\[Voltage\]\]/);
  });

  it('10. rejects a slug used twice in one language', () => {
    const { problems } = build(raw({ articles: [article('atom'), article('electron', { sk: { slug: 'atom-sk' } })] }));
    expectOneProblem(problems, 'content/articles/electron/sk.mdx', /slug "atom-sk".*content\/articles\/atom\/sk\.mdx/);
  });

  it('11. rejects a slug equal to a section name of its language', () => {
    const { problems } = build(raw({ articles: [article('atom', { sk: { slug: 'objavuj' } })] }));
    expectOneProblem(problems, 'content/articles/atom/sk.mdx', /reserved/);
  });

  it('12a. rejects a duplicate topic id', () => {
    const topics = [...TOPICS, { ...TOPICS[1]!, slug: { en: 'tech', sk: 'tech' } }];
    const { problems } = build(raw({ topics }));
    expectOneProblem(problems, 'content/topics.yaml', /duplicate topic id "technology"/);
  });

  it('12b. rejects a duplicate topic slug within a language', () => {
    const topics = [...TOPICS, { ...TOPICS[1]!, id: 'engineering', slug: { en: 'engineering', sk: 'technika' } }];
    const { problems } = build(raw({ topics }));
    expectOneProblem(problems, 'content/topics.yaml', /slug "technika".*"technology"/);
  });

  it('13a. rejects a topic without a required-language name', () => {
    const topics = [{ ...TOPICS[1]!, name: { en: 'Technology' } }];
    const { problems } = build(raw({ topics }));
    expectOneProblem(problems, 'content/topics.yaml', /name\.sk/);
  });

  it('13b. rejects a label without a required-language description', () => {
    const labels = [{ ...LABELS[0]!, description: { en: 'Intuition first.' } }];
    const { problems } = build(raw({ labels }));
    expectOneProblem(problems, 'content/labels.yaml', /description\.sk/);
  });

  it('14. rejects an article that lists itself', () => {
    const { problems } = build(raw({ articles: [article('atom', { meta: { related: ['atom'] } })] }));
    expectOneProblem(problems, 'content/articles/atom/meta.yaml', /itself/);
  });
});

describe('suggest', () => {
  it('returns the closest candidate within edit distance 3', () => {
    expect(suggest('voltag', ['atom', 'voltage', 'volume'])).toBe('voltage');
    expect(suggest('electrons', ['electron', 'electric-charge'])).toBe('electron');
  });

  it('returns undefined when nothing is close', () => {
    expect(suggest('heat-pump', ['atom', 'voltage'])).toBeUndefined();
  });
});

describe('formatProblems', () => {
  it('groups problems under their file, one heading per file', () => {
    const out = formatProblems([
      { file: 'content/a.mdx', message: 'first' },
      { file: 'content/b.yaml', message: 'other' },
      { file: 'content/a.mdx', message: 'second' },
    ]);
    expect(out.match(/content\/a\.mdx/g)).toHaveLength(1);
    expect(out.indexOf('first')).toBeLessThan(out.indexOf('second'));
    expect(out).toMatch(/3 problems/);
  });
});
