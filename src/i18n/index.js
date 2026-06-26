import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/en/common.json";
import tr from "../locales/tr/common.json";
import es from "../locales/es/common.json";
import pt from "../locales/pt/common.json";
import zh from "../locales/zh/common.json";
import fr from "../locales/fr/common.json";
import de from "../locales/de/common.json";
import ja from "../locales/ja/common.json";
import ko from "../locales/ko/common.json";
import ar from "../locales/ar/common.json";
import it from "../locales/it/common.json";
import ru from "../locales/ru/common.json";
import vi from "../locales/vi/common.json";
import id from "../locales/id/common.json";
import hi from "../locales/hi/common.json";

const savedLanguage = localStorage.getItem("language") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
    es: { translation: es },
    pt: { translation: pt },
    zh: { translation: zh },
    fr: { translation: fr },
    de: { translation: de },
    ja: { translation: ja },
    ko: { translation: ko },
    ar: { translation: ar },
    it: { translation: it },
    ru: { translation: ru },
    vi: { translation: vi },
    id: { translation: id },
    hi: { translation: hi },
  },

  lng: savedLanguage,
  fallbackLng: "en",
  
  // ─── ADD THIS LINE RIGHT HERE ──────────────────────────────────────
  returnEmptyString: false, 
  // ───────────────────────────────────────────────────────────────────

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;