import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

/** The custom properties declared directly inside the first block that follows `selector`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`No ${selector} block in tokens.css`);
  const open = css.indexOf('{', start);
  const body = css.slice(open + 1, css.indexOf('}', open));
  const vars: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars[name!] = value!.trim();
  return vars;
}

const light = block(':root {');
const themes = {
  light,
  dark: { ...light, ...block(":root[data-theme='dark'] {") },
  'dark (system)': { ...light, ...block(":root:not([data-theme='light']) {") },
};

function resolve(vars: Record<string, string>, name: string): string {
  const value = vars[name];
  if (!value) throw new Error(`${name} is not defined`);
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  return ref ? resolve(vars, ref[1]!) : value;
}

/** WCAG 2 contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('diagram colours', () => {
  // Diagram labels are 15–18 px, so they need the normal-text AA ratio.
  const textTokens = ['--d-ink', '--d-muted', '--d-accent'];
  const backgrounds = ['--d-fill', '--d-fill-alt', '--paper', '--surface'];

  for (const [theme, vars] of Object.entries(themes)) {
    it(`${theme}: text colours reach WCAG AA (4.5:1) on every diagram background`, () => {
      for (const text of textTokens) {
        for (const background of backgrounds) {
          const ratio = contrast(resolve(vars, text), resolve(vars, background));
          expect(ratio, `${text} on ${background}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});
