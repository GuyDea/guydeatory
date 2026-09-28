---
name: add-language
description: Use when adding a new language (beyond English and Slovak) to Guydeatory, or when making an optional language required.
---

# Adding a language to Guydeatory

Follow `docs/translation.md` §6. The steps:

1. **`src/i18n/languages.ts`**: add `{ code, name, nativeName, required: false, dateLocale,
   ogLocale, sections: { topics, explore, search, about } }`. The section slugs are localized,
   ASCII and kebab-case.
2. **`src/i18n/ui/<code>.ts`**: copy `en.ts` and translate every key, including the plural forms
   the language needs (`Intl.PluralRules`). Register it in `DICTIONARIES` in `src/i18n/t.ts`.
   `npm test` checks completeness.
3. **Content data:** in `content/topics.yaml` and `content/labels.yaml`, add `<code>` to every
   `name`, `description` and `slug` (topics). In `content/pages/about/`, add `<code>.mdx`. Add the
   404 copy in `src/pages/404.astro`.
4. **Widgets:** add the language to every `src/widgets/*/strings.ts` and to `src/widgets/kit/strings.ts`.
5. **Fonts:** check that the self-hosted fonts cover the script. Update `subsets` in
   `astro.config.mjs` if needed.
6. **Glossary:** add a section for the language to `docs/translation.md`.
7. **Translate articles** (`content/articles/<id>/<code>.mdx`), starting with the most linked ones.
   Until the language is required:
   - untranslated articles simply have no page in it
   - links fall back to English, with a language badge
8. **Validate:** `npm run check`. Then view the home page, an article, Explore and search in the
   new language.
9. When every article is translated, set `required: true`.
10. **Deploy when asked:** `npm run infra:deploy`, so the CloudFront router learns the language,
    then `npm run deploy`.
