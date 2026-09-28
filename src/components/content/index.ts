import type { GlobalComponentName } from '@lib/content/components';
import Analogy from './Analogy.astro';
import Figure from './Figure.astro';
import FunFact from './FunFact.astro';
import GoDeeper from './GoDeeper.astro';
import Quiz from './Quiz.astro';
import Remember from './Remember.astro';
import Safety from './Safety.astro';
import Term from './Term.astro';

/**
 * Components available in every MDX file without an import. The key set must equal
 * GLOBAL_COMPONENTS (src/lib/content/components.ts), which the content linter also uses.
 */
export const contentComponents: Record<GlobalComponentName, unknown> = {
  Term,
  GoDeeper,
  Analogy,
  FunFact,
  Safety,
  Remember,
  Figure,
  Quiz,
};
