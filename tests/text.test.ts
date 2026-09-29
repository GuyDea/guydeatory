import { describe, expect, it } from 'vitest';
import { foldDiacritics, scriptJson } from '../src/lib/text.ts';

describe('foldDiacritics', () => {
  it('strips Slovak diacritics in both cases', () => {
    expect(foldDiacritics('Elektrický prúd')).toBe('Elektricky prud');
    expect(foldDiacritics('ľščťžýáíéúäôňĺŕď ĽŠČŤŽÝÁÍÉÚÄÔŇĹŔĎ')).toBe('lsctzyaieuaonlrd LSCTZYAIEUAONLRD');
  });

  it('leaves plain ASCII untouched', () => {
    expect(foldDiacritics('Heat pump 101')).toBe('Heat pump 101');
  });
});

describe('scriptJson', () => {
  const LINE_SEPARATOR = '\u{2028}';
  const PARAGRAPH_SEPARATOR = '\u{2029}';

  it('escapes <, >, & and the line and paragraph separators as \\u escapes', () => {
    expect(scriptJson({ title: '</script><!-- a & b -->' })).toBe('{"title":"\\u003c/script\\u003e\\u003c!-- a \\u0026 b --\\u003e"}');
    expect(scriptJson(`line${LINE_SEPARATOR}paragraph${PARAGRAPH_SEPARATOR}`)).toBe('"line\\u2028paragraph\\u2029"');
  });

  it('leaves nothing that could end the script or open a comment', () => {
    const json = scriptJson(['</script>', '<!--', '</SCRIPT >', '<script>', ']]>', LINE_SEPARATOR + PARAGRAPH_SEPARATOR]);
    expect(json).not.toMatch(/[<>&]/);
    expect(json).not.toContain(LINE_SEPARATOR);
    expect(json).not.toContain(PARAGRAPH_SEPARATOR);
  });

  it('still parses back to the same value', () => {
    const value = { name: 'Ohm’s law <3 & more', list: [`a${LINE_SEPARATOR}b`, 'č'], n: 1.5, ok: true, none: null };
    expect(JSON.parse(scriptJson(value))).toEqual(value);
  });
});
