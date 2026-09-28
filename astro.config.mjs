// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import svelte from '@astrojs/svelte';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkWikiLinks } from './src/lib/markdown/remark-wiki-links.ts';
import { remarkInjectLang } from './src/lib/markdown/remark-inject-lang.ts';
import { rehypePagefindIgnoreMath } from './src/lib/markdown/rehype-pagefind-ignore-math.ts';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://theguydea.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Astro 7 defaults to 'jsx', which strips spaces between inline elements.
  compressHTML: true,
  markdown: {
    processor: unified({
      // Order matters: wiki-links create <Term> elements that inject-lang then gives a `lang`.
      remarkPlugins: [remarkMath, remarkWikiLinks, remarkInjectLang],
      rehypePlugins: [rehypeKatex, rehypePagefindIgnoreMath],
    }),
  },
  integrations: [mdx(), svelte()],
  vite: {
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Astro's own MDX asset-propagation directive; harmless, and it would print once per article.
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('astro:head-inject')) return;
          warn(warning);
        },
      },
    },
  },
  // Downloaded at build time and self-hosted: no third-party requests from readers' browsers.
  fonts: [
    {
      // SIL's literacy typeface: single-storey a/g like children learn to write, clear I/l/1.
      provider: fontProviders.google(),
      name: 'Andika',
      cssVariable: '--font-body',
      weights: [400, 700],
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Bricolage Grotesque',
      cssVariable: '--font-display',
      weights: ['500 800'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
