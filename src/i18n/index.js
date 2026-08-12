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

const savedLanguage = localStorage.getItem("language") || "en";
const initialLanguage =
  savedLanguage === "en" || localeLoaders[savedLanguage] ? savedLanguage : "en";

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
