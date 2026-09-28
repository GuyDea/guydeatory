import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderRouter, renderTemplate } from '../infra/render.ts';
import { pickLanguage } from '../src/lib/language-pick.ts';

interface CfRequest {
  uri: string;
  headers: Record<string, { value: string }>;
  cookies?: Record<string, { value: string }>;
  querystring?: Record<string, { value: string }>;
}
type CfResponse = { statusCode: number; headers: Record<string, { value: string }> };

const handler = new Function(`${renderRouter(readFileSync('infra/cloudfront/router.js', 'utf8'))}; return handler;`)() as (event: {
  request: CfRequest;
}) => CfRequest | CfResponse;

function request(uri: string, extra: Partial<CfRequest> = {}): CfRequest {
  return { uri, headers: { host: { value: 'theguydea.com' }, ...extra.headers }, cookies: extra.cookies ?? {}, querystring: extra.querystring ?? {} };
}
const run = (req: CfRequest) => handler({ request: req });
const location = (res: CfRequest | CfResponse) => (res as CfResponse).headers.location?.value;

describe('CloudFront router', () => {
  it('redirects www to the apex, keeping path and query (301)', () => {
    const res = run(request('/en/voltage/', { headers: { host: { value: 'www.theguydea.com' } }, querystring: { q: { value: 'volt' } } }));
    expect((res as CfResponse).statusCode).toBe(301);
    expect(location(res)).toBe('https://theguydea.com/en/voltage/?q=volt');
  });

  it('sends / to the language saved in the lang cookie (302)', () => {
    const res = run(request('/', { cookies: { lang: { value: 'sk' } }, headers: { 'accept-language': { value: 'en-US' } } }));
    expect((res as CfResponse).statusCode).toBe(302);
    expect(location(res)).toBe('/sk/');
  });

  it('otherwise picks the best supported browser language, honouring q-values', () => {
    expect(location(run(request('/', { headers: { 'accept-language': { value: 'sk-SK,sk;q=0.9,en;q=0.8' } } })))).toBe('/sk/');
    expect(location(run(request('/', { headers: { 'accept-language': { value: 'en;q=0.3, sk;q=0.9' } } })))).toBe('/sk/');
    expect(location(run(request('/', { headers: { 'accept-language': { value: 'cs-CZ,cs;q=0.9' } } })))).toBe('/sk/');
  });

  it('falls back to English for unsupported or missing languages', () => {
    expect(location(run(request('/', { headers: { 'accept-language': { value: 'de-DE,de;q=0.9' } } })))).toBe('/en/');
    expect(location(run(request('/')))).toBe('/en/');
  });

  it('serves directory index files for paths ending in a slash', () => {
    expect((run(request('/en/voltage/')) as CfRequest).uri).toBe('/en/voltage/index.html');
    expect((run(request('/sk/')) as CfRequest).uri).toBe('/sk/index.html');
  });

  it('adds the trailing slash to extensionless paths (301)', () => {
    const res = run(request('/en/voltage', { querystring: { a: { value: '1' } } }));
    expect((res as CfResponse).statusCode).toBe(301);
    expect(location(res)).toBe('/en/voltage/?a=1');
  });

  it('passes files through untouched', () => {
    expect((run(request('/_astro/app.1a2b.css')) as CfRequest).uri).toBe('/_astro/app.1a2b.css');
    expect((run(request('/sitemap.xml')) as CfRequest).uri).toBe('/sitemap.xml');
    expect((run(request('/pagefind/pagefind.js')) as CfRequest).uri).toBe('/pagefind/pagefind.js');
  });

  it('chooses the same language as the site’s own picker', () => {
    const cases = ['sk', 'en-GB,en;q=0.9', 'cs', 'de,sk;q=0.5', 'fr', ''];
    for (const accept of cases) {
      const headers: Record<string, { value: string }> = accept ? { 'accept-language': { value: accept } } : {};
      const viaRouter = location(run(request('/', { headers })))!.slice(1, -1);
      const viaSite = pickLanguage({ cookie: '', accept: accept ? accept.split(',').map((p) => p.split(';')[0]!.trim()) : [] });
      expect(viaRouter, accept).toBe(viaSite);
    }
  });
});

describe('renderTemplate', () => {
  it('inlines the router with the configured languages and leaves no placeholders', () => {
    const template = renderTemplate();
    expect(template).toContain('FunctionCode: |');
    expect(template).toContain('var LANGS = ["en","sk"];');
    expect(template).not.toMatch(/__[A-Z_]+__/);
  });
});
