import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Only English ships in the main bundle as the guaranteed fallback. Every
// other language is fetched on demand (see loadLanguage below) so a user who
// only ever reads English never downloads the other 14 locale files.
const localeLoaders = {
  en: () => import("@/locales/en/common.json"),
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
const initialLanguage = localeLoaders[savedLanguage] ? savedLanguage : "en";

export async function loadLanguage(lng) {
  if (i18n.hasResourceBundle(lng, "translation")) return;

  const loader = localeLoaders[lng] ?? localeLoaders.en;
  const { default: resources } = await loader();
  i18n.addResourceBundle(lng, "translation", resources);
}

export async function initI18n() {
  const { default: enResources } = await localeLoaders.en();
  const resources = { en: { translation: enResources } };

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
