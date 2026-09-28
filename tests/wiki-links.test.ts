import { describe, expect, it } from 'vitest';
import { extractWikiLinks, findMalformedWikiLinks } from '../src/lib/content/wiki-links.ts';

describe('extractWikiLinks', () => {
  it('extracts targets with and without custom text, in order', () => {
    expect(extractWikiLinks('The [[voltage]] pushes the [[electric-current|elektrický prúd]].')).toEqual([
      { target: 'voltage' },
      { target: 'electric-current', text: 'elektrický prúd' },
    ]);
  });

  it('accepts Unicode display text', () => {
    expect(extractWikiLinks('s [[voltage|napätím]] a')).toEqual([{ target: 'voltage', text: 'napätím' }]);
  });

  it('accepts display text that wraps onto the next line, normalising the whitespace', () => {
    expect(extractWikiLinks('see [[conservation-of-energy|energy can never be\nmade from nothing]].')).toEqual([
      { target: 'conservation-of-energy', text: 'energy can never be made from nothing' },
    ]);
  });

  it('ignores links inside fenced and inline code', () => {
    const md = 'Real [[atom]].\n\n```md\n[[electron]]\n```\n\nand `[[proton]]` too.';
    expect(extractWikiLinks(md)).toEqual([{ target: 'atom' }]);
  });
});

describe('findMalformedWikiLinks', () => {
  it('reports bracket pairs that are not valid links', () => {
    expect(findMalformedWikiLinks('[[Voltage]] [[voltage |x]] [[ atom]] [[atom|]] [[ok-link]] [[x|fine text]]')).toEqual([
      '[[Voltage]]',
      '[[voltage |x]]',
      '[[ atom]]',
      '[[atom|]]',
    ]);
  });

  it('reports malformed links even when they span lines', () => {
    expect(findMalformedWikiLinks('text [[Voltage|the\npush]] more')).toEqual(['[[Voltage|the\npush]]']);
  });

  it('ignores code', () => {
    expect(findMalformedWikiLinks('`[[Bad]]`\n\n```\n[[Bad]]\n```')).toEqual([]);
  });
});
