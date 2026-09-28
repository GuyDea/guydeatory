import type { GlobalComponentName } from '@lib/content/components';
import Term from './Term.astro';

/**
 * Components available in every MDX file without an import (names in src/lib/content/components.ts).
 * Passed to <Content components={contentComponents} />.
 */
export const contentComponents: Partial<Record<GlobalComponentName, unknown>> = {
  Term,
};
