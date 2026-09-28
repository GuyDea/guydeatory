/**
 * Authoring components available in every MDX file without an import.
 * The Astro map in src/components/content/index.ts must provide exactly these (enforced by its type).
 */
export const GLOBAL_COMPONENTS = ['Term', 'GoDeeper', 'Analogy', 'FunFact', 'Safety', 'Remember', 'Figure', 'Quiz'] as const;
export type GlobalComponentName = (typeof GLOBAL_COMPONENTS)[number];
