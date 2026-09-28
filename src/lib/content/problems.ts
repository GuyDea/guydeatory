import type { z } from 'astro/zod';
import type { Problem } from './types.ts';

/** Turns a Zod error into one problem per issue, prefixed with the field path. */
export function zodProblems(file: string, error: z.ZodError): Problem[] {
  return error.issues.map((issue) => {
    const path = issue.path.map(String).join('.');
    return { file, message: path ? `${path}: ${issue.message}` : issue.message };
  });
}

function levenshtein(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0]!;
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j]!;
      previous[j] = Math.min(above + 1, previous[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length]!;
}

/** The closest candidate within edit distance 3, for "did you mean" hints. */
export function suggest(target: string, candidates: Iterable<string>): string | undefined {
  let best: string | undefined;
  let bestDistance = 4;
  for (const candidate of [...candidates].sort()) {
    const distance = levenshtein(target, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

export function didYouMean(target: string, candidates: Iterable<string>): string {
  const hint = suggest(target, candidates);
  return hint ? ` — did you mean "${hint}"?` : '';
}

/** Human-readable report, grouped by file in first-seen order. */
export function formatProblems(problems: Problem[]): string {
  const byFile = new Map<string, string[]>();
  for (const { file, message } of problems) {
    byFile.set(file, [...(byFile.get(file) ?? []), message]);
  }
  const noun = problems.length === 1 ? 'problem' : 'problems';
  const sections = [...byFile].map(([file, messages]) => [file, ...messages.map((m) => `  • ${m}`)].join('\n'));
  return [`Content validation failed — ${problems.length} ${noun}:`, '', sections.join('\n\n')].join('\n');
}

export class ContentValidationError extends Error {
  readonly problems: Problem[];

  constructor(problems: Problem[]) {
    super(formatProblems(problems));
    this.name = 'ContentValidationError';
    this.problems = problems;
  }
}
