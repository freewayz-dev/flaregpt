// Kept .js, not .ts, even though every other tooling config in this repo
// (tailwind/postcss/i18next-parser) converted cleanly — verified empirically
// that ESLint 9's own .ts config loading needs jiti >=2, while the jiti
// actually resolved in this tree (deduped across eslint/tailwindcss/vite)
// is 1.21.7, satisfying Tailwind/Vite's older requirement. Forcing a newer
// jiti here would mean either a second copy in the tree or bumping the
// shared, deduped one project-wide on the strength of one small config
// file — not worth it for a file that's just an array of plugin configs
// with little real typing to gain.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Mirrors the .js/.jsx block above exactly (same React rules, same
    // globals) so a file behaves identically whichever side of a rename it
    // ends up on — deliberately the non-type-checked `recommended` preset,
    // not `recommendedTypeChecked`, for two reasons: it needs no
    // `parserOptions.project` wiring (tsconfig.json's `include` covers all
    // of src/, but nothing here asks ESLint to build a full type-checked
    // program yet, which is real cost across ~190 files for a project
    // that's still 100% .js/.jsx), and it keeps this phase's linting
    // strictness matched to the tsconfig's own Stage 1 (noImplicitAny
    // only, not strict) rather than jumping ahead of it. Moving to
    // type-checked rules is a deliberate later-phase decision, not a side
    // effect of this file existing.
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // `react-refresh/only-export-components` exists to protect Vite's Fast
    // Refresh, which only ever runs against the actual app bundle — test
    // files and test infrastructure (src/test/**, *.test.js(x)/ts(x)) are
    // never part of that bundle (Vitest imports them directly, HMR never
    // touches them), so the rule has nothing real to protect here and only
    // produces false positives against normal test-helper patterns (e.g.
    // test-utils.jsx intentionally exporting both a render helper and
    // re-exporting Testing Library).
    files: ['src/test/**/*.{js,jsx,ts,tsx}', '**/*.test.{js,jsx,ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Genuinely Node-context files (build/tooling scripts and configs) —
    // distinct from the app/test code above, which runs in a browser (or
    // jsdom, which mirrors one) and gets `globals.browser` instead. This is
    // a real fix, not just relying on typescript-eslint's `no-undef` being
    // off by default for .ts files to mask the symptom: `process`,
    // `__dirname`-equivalents, etc. now resolve as real Node globals here
    // regardless of which rule ends up checking for them — including this
    // file itself, the one Node-context file that's still .js.
    files: [
      'vite.config.ts',
      'playwright.config.ts',
      'eslint.config.js',
      'tailwind.config.ts',
      'postcss.config.ts',
      'i18next-parser.config.ts',
      'prerender.ts',
      'translate-locales.ts',
      'e2e/static-server.ts',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
])
