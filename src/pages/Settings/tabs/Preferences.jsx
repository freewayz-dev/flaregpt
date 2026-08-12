import { useTranslation } from "react-i18next";
import { GlobeAltIcon, SparklesIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";

import { loadLanguage } from "@/i18n";
import { useUIStore} from "@/store/useUIStore";
import CustomSelect from "@/components/common/CustomSelect";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";







export default function Preferences() {
  const { t, i18n } = useTranslation();

  const languageOptions = [
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

  const currencyOptions = [
    { value: "AUD", labelKey: "AUD" },
    { value: "EUR", labelKey: "EUR" },
    { value: "GBP", labelKey: "GBP" },
    { value: "RUB", labelKey: "RUB" },
    { value: "USD", labelKey: "USD" },
  ];

  const blueLightOptions = [
    { value: "Off", labelKey: "settings.options.off" },
    { value: "Low", labelKey: "settings.options.low" },
    { value: "Medium", labelKey: "settings.options.medium" },
    { value: "High", labelKey: "settings.options.high" },
  ];

  const currentLanguage =
    languageOptions.find((lang) => lang.code === i18n.language) ||
    languageOptions[0];

  const currencyCode = useUIStore((state) => state.currency);
  const setCurrencyCode = useUIStore((state) => state.setCurrency);
  const currentCurrency =
    currencyOptions.find((c) => c.value === currencyCode) ||
    currencyOptions[currencyOptions.length - 1];

  const blueLightLevel = useUIStore((state) => state.blueLightLevel);
  const updateBlueLightLevel = useUIStore(
    (state) => state.updateBlueLightLevel,
  );

  const currentBlueLight =
    blueLightOptions.find((option) => option.value === blueLightLevel) ||
    blueLightOptions[0];

  // `option.value` is a plain `string` per CustomSelect's own (deliberately
  // shared, non-generic) SelectOption type — narrowed back to
  // BlueLightLevel here since it's guaranteed to be one of this file's own
  // `blueLightOptions` values, never anything CustomSelect invents itself.
  const handleBlueLightChange = (option) =>
    updateBlueLightLevel(option.value);
  const handleLanguageChange = async (selectedOption) => {
    await loadLanguage(selectedOption.code);
    i18n.changeLanguage(selectedOption.code);
    localStorage.setItem("language", selectedOption.code);
  };

  return (
    <Card
      title={t("settings.tabs.Preferences")}
      subtitle={t("settings.subtitles.Preferences")}
    >
      <div className="divide-y divide-divider">
        <RowItem
          icon={GlobeAltIcon}
          title={t("settings.cards.language")}
          description={t("settings.descriptions.language")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={languageOptions}
              selectedValue={currentLanguage}
              onChange={handleLanguageChange}
              aria-label={t("settings.cards.language")}
            />
          </div>
        </RowItem>

        <RowItem
          icon={CurrencyDollarIcon}
          title={t("settings.cards.currency")}
          description={t("settings.descriptions.currency")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={currencyOptions}
              selectedValue={currentCurrency}
              onChange={(option) => setCurrencyCode(option.value)}
              aria-label={t("settings.cards.currency")}
            />
          </div>
        </RowItem>

        <RowItem
          icon={SparklesIcon}
          title={t("settings.cards.blur")}
          description={t("settings.descriptions.blur")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={blueLightOptions}
              selectedValue={currentBlueLight}
              onChange={handleBlueLightChange}
              aria-label={t("settings.cards.blur")}
            />
          </div>
        </RowItem>
      </div>
    </Card>
  );
}
