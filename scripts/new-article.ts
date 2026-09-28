/**
 * npm run new:article -- <id> --topic <topic-id> --label <label-id>
 * Scaffolds content/articles/<id>/ as a draft. Then follow .claude/skills/write-article/SKILL.md.
 */
import { scaffoldArticle } from '../src/lib/scaffold.ts';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const id = args.find((arg, i) => !arg.startsWith('--') && !args[i - 1]?.startsWith('--'));
const topic = flag('topic');
const label = flag('label') ?? 'high-level';

if (!id || !topic) {
  console.error('Usage: npm run new:article -- <id> --topic <topic-id> [--label <label-id>]');
  process.exit(1);
}
try {
  const created = await scaffoldArticle(process.cwd(), id, { topic, label });
  console.log(`Created (status: draft):\n${created.map((f) => `  ${f}`).join('\n')}`);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
