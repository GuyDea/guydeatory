import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import { pageId } from '../src/lib/ids.ts';
import TwoDiagrams from './fixtures/TwoDiagrams.astro';

describe('pageId', () => {
  it('makes a readable id from the label, without diacritics', () => {
    expect(pageId({}, 'd', 'The parts of a helium atom')).toBe('d-the-parts-of-a-helium-atom');
    expect(pageId({}, 'd', 'Časti atómu hélia')).toBe('d-casti-atomu-helia');
    expect(pageId({}, 'd', 'Ohm’s law: I = V ÷ R')).toBe('d-ohm-s-law-i-v-r');
  });

  it('gives a page the same ids every time', () => {
    const labels = ['A circuit', 'A circuit', 'Ohm’s law'];
    const render = () => {
      const page = {};
      return labels.map((label) => pageId(page, 'd', label));
    };
    expect(render()).toEqual(render());
  });

  it('keeps ids unique on a page', () => {
    const page = {};
    const ids = ['A circuit', 'A circuit', 'A circuit 2', 'A circuit', '', '???'].map((label) => pageId(page, 'd', label));
    expect(ids).toEqual(['d-a-circuit', 'd-a-circuit-2', 'd-a-circuit-2-2', 'd-a-circuit-3', 'd', 'd-2']);
  });

  it('starts afresh on every page', () => {
    expect(pageId({}, 'd', 'A circuit')).toBe('d-a-circuit');
    expect(pageId({}, 'd', 'A circuit')).toBe('d-a-circuit');
  });

  it('keeps long labels short, ending on a whole word', () => {
    expect(pageId({}, 'd', 'Water flowing through a narrow pipe compared with electricity in a thin wire')).toBe(
      'd-water-flowing-through-a-narrow-pipe',
    );
    expect(pageId({}, 'd', 'x'.repeat(60))).toBe(`d-${'x'.repeat(40)}`);
  });
});

describe('Svg', () => {
  it('labels diagrams with ids that are unique on the page and the same on every build', async () => {
    const container = await AstroContainer.create();
    const first = await container.renderToString(TwoDiagrams);
    const second = await container.renderToString(TwoDiagrams);
    expect(first).toBe(second);
    expect([...first.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])).toEqual(['d-a-circuit-t', 'd-a-circuit-d', 'd-a-circuit-2-t', 'd-a-circuit-2-d']);
    expect(first).toContain('aria-labelledby="d-a-circuit-t d-a-circuit-d"');
    expect(first).toContain('aria-labelledby="d-a-circuit-2-t d-a-circuit-2-d"');
  });
});
