import type { UserConfig } from "i18next-parser";

const config: UserConfig = {
  // Tells the parser what your 15 language locales are
  locales: ['en', 'tr', 'es', 'pt', 'zh', 'fr', 'de', 'ja', 'ko', 'ar', 'it', 'ru', 'vi', 'id', 'hi'],

  // Scans all your React files for t() or <Trans> items
  input: ['src/**/*.{js,jsx,ts,tsx}'],

  // Places the new keys exactly where your file paths are located
  output: 'src/locales/$LOCALE/common.json',

  // Crucial: keeps your existing translations completely safe
  keepRemoved: true,

  keySeparator: '.',
  namespaceSeparator: false,

  // Alphabetizes your keys so your JSON files stay clean and organized
  sort: true,

  // Fills new keys in your non-English files with a blank string or the key name
  defaultValue: (locale, _namespace, key, value) => {
    return locale === 'en' ? value || key || '' : '';
  },
};

export default config;
