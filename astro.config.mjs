// @ts-check
import { defineConfig } from 'astro/config';
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
});
