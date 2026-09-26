import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enResources from "@/locales/en/common.json";

// English is a real static import, not a dynamic one like every other
// locale below — Vite still splits a dynamic import into its own chunk
// file even for the fallback language, which meant `initI18n()` (see
// below, awaited before the app's very first render) was blocking first
// paint on a genuine extra network round-trip for *every* visitor,
// English speakers included, not just the ones switching languages.
// Statically importing it folds those bytes into the main bundle instead
// (confirmed via a production build: every locale, including `en`, was
// previously its own separate `common-*.js` chunk fetched at runtime) —
// a real, measurable FCP/LCP cost removed for the common case, while the
// other 14 languages keep loading on demand exactly as before so a user
// who only ever reads English still never downloads the rest.


const localeLoaders = {
  tr: () => import("@/locales/tr/common.json"),
  es: () => import("@/locales/es/common.json"),
  pt: () => import("@/locales/pt/common.json"),
  zh: () => import("@/locales/zh/common.json"),
  fr: () => import("@/locales/fr/common.json"),
  de: () => import("@/locales/de/common.json"),
  ja: () => import("@/locales/ja/common.json"),
  ko: () => import("@/locales/ko/common.json"),
  ar: () => import("@/locales/ar/common.json"),
  it: () => import("@/locales/it/common.json"),
  ru: () => import("@/locales/ru/common.json"),
  vi: () => import("@/locales/vi/common.json"),
  id: () => import("@/locales/id/common.json"),
  hi: () => import("@/locales/hi/common.json"),
};

// Every supported code — "en" plus whatever's in localeLoaders — shared by
// both the saved-language check below and detectBrowserLanguage, so a
// locale added to one is automatically recognized by the other.
const SUPPORTED_LANGUAGES = new Set(["en", ...Object.keys(localeLoaders)]);

// Step 3 of this app's language priority (saved -> browser -> supported? ->
// English): `navigator.language` is a full BCP-47 tag ("fr-FR", "pt-BR"),
// so only its base subtag is compared against what this app actually
// ships. Never itself written to localStorage — an auto-detected guess
// only ever drives the in-memory `initialLanguage` below; it becomes
// "saved" only once a real explicit choice goes through `changeLanguage`.
function detectBrowserLanguage() {
  const raw = typeof navigator !== "undefined" ? navigator.language : undefined;
  if (!raw) return "en";
  const base = raw.split("-")[0].toLowerCase();
  return SUPPORTED_LANGUAGES.has(base) ? base : "en";
}

const savedLanguage = localStorage.getItem("language");
const initialLanguage =
  savedLanguage && SUPPORTED_LANGUAGES.has(savedLanguage)
    ? savedLanguage
    : detectBrowserLanguage();

export async function loadLanguage(lng) {
  if (i18n.hasResourceBundle(lng, "translation")) return;

  const loader = localeLoaders[lng];
  if (!loader) {
    // Unrecognized code, or "en" itself — both resolve to the same
    // already-in-memory resources, no network fetch needed either way.
    i18n.addResourceBundle("en", "translation", enResources);
    return;
  }
  const { default: resources } = await loader();
  i18n.addResourceBundle(lng, "translation", resources);
}

// The one place a language change is actually committed — loads its
// bundle, switches i18next over to it, and persists the choice, in that
// order. Every language-selection UI in the app (Settings > Preferences,
// the landing page's LanguageSelector, DevQuickSettings) calls this
// instead of repeating the same three calls, so there is exactly one
// mechanism and one persisted preference shared across all of them — never
// a per-surface language state.
export async function changeLanguage(lng) {
  await loadLanguage(lng);
  await i18n.changeLanguage(lng);
  localStorage.setItem("language", lng);
}

export async function initI18n() {
  const resources = {
    en: { translation: enResources },
  };

  if (initialLanguage !== "en") {
    const { default: initialResources } = await localeLoaders[initialLanguage]();
    resources[initialLanguage] = { translation: initialResources };
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: "en",
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
  });

  return i18n;
}

export default i18n;
