// The one list of supported locales, in the same shape CustomSelect's
// options already expect (value/code/labelKey/flag) — extracted from
// Settings > Preferences (its own original home) once a second real
// consumer (DevQuickSettings) needed the identical 15-entry list, rather
// than duplicating it.
export const LANGUAGE_OPTIONS = [
  { value: "en", code: "en", labelKey: "English", flag: "🇺🇸" },
  { value: "tr", code: "tr", labelKey: "Türkçe", flag: "🇹🇷" },
  { value: "es", code: "es", labelKey: "Español", flag: "🇪🇸" },
  { value: "pt", code: "pt", labelKey: "Português", flag: "🇧🇷" },
  { value: "it", code: "it", labelKey: "Italiano", flag: "🇮🇹" },
  { value: "fr", code: "fr", labelKey: "Français", flag: "🇫🇷" },
  { value: "de", code: "de", labelKey: "Deutsch", flag: "🇩🇪" },
  { value: "ru", code: "ru", labelKey: "Русский", flag: "🇷🇺" },
  { value: "vi", code: "vi", labelKey: "Tiếng Việt", flag: "🇻🇳" },
  { value: "id", code: "id", labelKey: "Bahasa Indonesia", flag: "🇮🇩" },
  { value: "hi", code: "hi", labelKey: "हिन्दी", flag: "🇮🇳" },
  { value: "zh", code: "zh", labelKey: "中文", flag: "🇨🇳" },
  { value: "ja", code: "ja", labelKey: "日本語", flag: "🇯🇵" },
  { value: "ko", code: "ko", labelKey: "한국어", flag: "🇰🇷" },
  { value: "ar", code: "ar", labelKey: "العربية", flag: "🇦🇪" },
];
