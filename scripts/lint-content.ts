/**
 * npm run lint:content — validates all content without building the site:
 * schemas, translations, links, slugs, topics, labels, MDX syntax and components.
 * Safe to run while another build is running (it writes nothing).
 */
import { loadRawContent } from '../src/lib/content/fs-loader.ts';
import { lintContent } from '../src/lib/content/lint.ts';
import { formatProblems } from '../src/lib/content/problems.ts';

const root = process.cwd();
const problems = await lintContent(root);
if (problems.length > 0) {
  console.error(formatProblems(problems));
  process.exit(1);
}
const raw = await loadRawContent(root);
console.log(`✓ Content OK — ${raw.metas.length} articles, ${raw.texts.length} language files`);
