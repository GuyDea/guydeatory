/** npm run check:dist — post-build checks on dist/ (run after `npm run build`). */
import { join } from 'node:path';
import { checkDist } from '../src/lib/check-dist.ts';
import { formatProblems } from '../src/lib/content/problems.ts';

const problems = await checkDist(join(process.cwd(), 'dist'));
if (problems.length > 0) {
  console.error(formatProblems(problems).replace('Content validation failed', 'Built site check failed'));
  process.exit(1);
}
console.log('✓ Built site OK');
