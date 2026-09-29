import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import { t } from '../src/i18n/t.ts';
import type { LangCode } from '../src/i18n/languages.ts';
import { sectionUrl } from '../src/lib/urls.ts';
import SearchView from '../src/views/SearchView.astro';

describe('the search page without JavaScript', () => {
  it.each<LangCode>(['en', 'sk'])('%s: says that search needs JavaScript and links to Explore', async (lang) => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SearchView, { props: { lang } });
    const noscript = parse(html).querySelector('[data-search-page] noscript');
    expect(noscript, 'a <noscript> message').not.toBeNull();

    // A <noscript> holds raw text until a browser without scripting parses it.
    const message = parse(noscript!.innerHTML);
    expect(message.textContent).toContain(t(lang, 'search.noScript'));
    const link = message.querySelector('a')!;
    expect(link.getAttribute('href')).toBe(sectionUrl(lang, 'explore'));
    expect(link.textContent).toBe(t(lang, 'search.noScriptLink'));
  });
});
