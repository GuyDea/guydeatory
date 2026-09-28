import type { APIRoute } from 'astro';
import { LANG_CODES } from '@i18n/languages';
import { getCatalog } from '@lib/content/catalog';
import { topicHasContent } from '@lib/content/queries';
import { absolute, articleAlternates, homeAlternates, sectionAlternates, topicUrl } from '@lib/urls';
import type { Alternate } from '@lib/urls';

interface Entry {
  alternates: Alternate[];
  lastmod?: Date;
}

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function render(entries: Entry[]): string {
  const urls = entries.flatMap(({ alternates, lastmod }) => {
    const available = alternates.filter((alt): alt is { lang: Alternate['lang']; href: string } => alt.href !== null);
    const links = available.map((alt) => `<xhtml:link rel="alternate" hreflang="${alt.lang}" href="${escape(absolute(alt.href))}"/>`).join('');
    return available.map(
      (alt) =>
        `<url><loc>${escape(absolute(alt.href))}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}${links}</url>`,
    );
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

export const GET: APIRoute = async () => {
  const catalog = await getCatalog();
  const entries: Entry[] = [
    { alternates: homeAlternates() },
    { alternates: sectionAlternates('explore') },
    { alternates: sectionAlternates('about') },
    ...[...catalog.topics.values()].map((topic) => ({
      alternates: LANG_CODES.map((lang) => ({ lang, href: topicHasContent(catalog, topic.id, lang) ? topicUrl(topic, lang) : null })),
    })),
    ...[...catalog.articles.values()].map((article) => ({ alternates: articleAlternates(article), lastmod: article.updated })),
  ];
  return new Response(render(entries), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
