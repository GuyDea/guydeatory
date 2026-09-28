/**
 * Renders infra/.build/site.yml: the CloudFormation template with the CloudFront router inlined and
 * configured from src/i18n/languages.ts (so adding a language needs no infra edits).
 * Run: npx tsx infra/render.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LANG, LANG_CODES } from '../src/i18n/languages.ts';
import { LANGUAGE_ALIASES } from '../src/lib/language-pick.ts';

const here = dirname(fileURLToPath(import.meta.url));
export const APEX_DOMAIN = 'theguydea.com';

export function renderRouter(source: string): string {
  return source
    .replace('__LANGS__', JSON.stringify(LANG_CODES))
    .replace('__DEFAULT_LANG__', JSON.stringify(DEFAULT_LANG))
    .replace('__ALIASES__', JSON.stringify(LANGUAGE_ALIASES))
    .replace('__APEX__', JSON.stringify(APEX_DOMAIN));
}

export function renderTemplate(): string {
  const template = readFileSync(join(here, 'site.template.yml'), 'utf8');
  const router = renderRouter(readFileSync(join(here, 'cloudfront/router.js'), 'utf8'));
  const marker = /^( *)__ROUTER_CODE__$/m;
  const indent = marker.exec(template)?.[1];
  if (indent === undefined) throw new Error('site.template.yml has no __ROUTER_CODE__ line');
  const code = router
    .trimEnd()
    .split('\n')
    .map((line) => (line ? indent + line : ''))
    .join('\n');
  return template.replace(marker, () => code);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = join(here, '.build/site.yml');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderTemplate());
  console.log(`Wrote ${out}`);
}
