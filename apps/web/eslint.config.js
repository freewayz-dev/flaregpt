import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
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
    plugins: { react },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Base ESLint's `no-unused-vars` (the JS/JSX block's own rule above,
      // via js.configs.recommended) has no idea a JSXIdentifier like
      // `<Dashboard />` references the `Dashboard` binding — that
      // understanding used to come for free from the .tsx side (TS's own
      // checker natively treats JSX element names as real references,
      // which is what typescript-eslint's no-unused-vars relied on). This
      // is the standard, minimal fix: it only marks JSX-referenced
      // bindings as used, it adds no other opinions.
      'react/jsx-uses-vars': 'error',
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
    // jsdom, which mirrors one) and gets `globals.browser` instead. `process`,
    // `__dirname`-equivalents, etc. now resolve as real Node globals here
    // regardless of which rule ends up checking for them.
    files: [
      'vite.config.js',
      'playwright.config.js',
      'eslint.config.js',
      'tailwind.config.js',
      'postcss.config.js',
      'i18next-parser.config.js',
      'prerender.js',
      'translate-locales.js',
      'e2e/static-server.js',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // `__SW_BUILD_ID__` is injected purely at build time by vite.config.js's
    // `define` (see resolveBuildId()) — there's no source-level declaration
    // of it to teach ESLint about, the same way there's no source-level
    // declaration of any other build-time-substituted constant. Previously
    // covered by `declare const __SW_BUILD_ID__: string;` in sw.ts, which
    // also had the side effect of exempting this file from `no-undef`
    // entirely under typescript-eslint's recommended config; this is the
    // narrower, JS-native equivalent — just the one real global, `no-undef`
    // still fully on for everything else in the file.
    files: ['src/sw.js'],
    languageOptions: {
      globals: { __SW_BUILD_ID__: 'readonly' },
    },
  },
])
