import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GlobeAltIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  PaintBrushIcon,
} from "@heroicons/react/24/outline";

import { loadLanguage } from "@/i18n";
import { useUIStore } from "@/store/useUIStore";
import ThemeToggle from "@/components/common/ThemeToggle";
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
    { value: "ru", code: "ru", labelKey: "Русский", flag: "🇺🇸" },
    { value: "vi", code: "vi", labelKey: "Tiếng Việt", flag: "🇻🇳" },
    { value: "id", code: "id", labelKey: "Bahasa Indonesia", flag: "🇮🇩" },
    { value: "hi", code: "hi", labelKey: "हिन्दी", flag: "🇮🇳" },
    { value: "zh", code: "zh", labelKey: "中文", flag: "🇨🇳" },
    { value: "ja", code: "ja", labelKey: "日本語", flag: "🇯🇵" },
    { value: "ko", code: "ko", labelKey: "한국어", flag: "🇰🇷" },
    { value: "ar", code: "ar", labelKey: "العربية", flag: "🇦🇪" },
  ];

  const regionOptions = [
    { value: "Global", labelKey: "settings.options.global" },
    { value: "Africa", labelKey: "settings.options.africa" },
    { value: "Europe", labelKey: "settings.options.europe" },
    { value: "Asia", labelKey: "settings.options.asia" },
    { value: "America", labelKey: "settings.options.america" },
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
  const [region, setRegion] = useState(regionOptions[0]);
  const [currency, setCurrency] = useState(currencyOptions[0]);

  const blueLightLevel = useUIStore((state) => state.blueLightLevel);
  const updateBlueLightLevel = useUIStore(
    (state) => state.updateBlueLightLevel,
  );

  const currentBlueLight =
    blueLightOptions.find((option) => option.value === blueLightLevel) ||
    blueLightOptions[0];

  const handleBlueLightChange = (option) => updateBlueLightLevel(option.value);
  const handleLanguageChange = async (selectedOption) => {
    await loadLanguage(selectedOption.code);
    i18n.changeLanguage(selectedOption.code);
    localStorage.setItem("language", selectedOption.code);
  };

  const formatOptions = (opts) =>
    opts.map((o) => ({
      ...o,
      label: o.labelKey.includes(".") ? t(o.labelKey) : o.labelKey,
    }));

  const localizedLanguageOptions = languageOptions.map((l) => ({
    ...l,
    label: `${l.flag} ${l.labelKey}`,
  }));

  return (
    <Card
      title={t("settings.tabs.Preferences")}
      subtitle={t("settings.subtitles.Preferences")}
    >
      <div className="divide-y divide-[#E5E7EB] dark:divide-[#262A30]">
        <RowItem
          icon={PaintBrushIcon}
          title={t("settings.cards.theme")}
          description={t("settings.cards.themeMode")}
        >
          <ThemeToggle />
        </RowItem>

        <RowItem
          icon={GlobeAltIcon}
          title={t("settings.cards.language")}
          description={t("settings.descriptions.language")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={localizedLanguageOptions}
              selectedValue={{
                ...currentLanguage,
                label: `${currentLanguage.flag} ${currentLanguage.labelKey}`,
              }}
              onChange={handleLanguageChange}
            />
          </div>
        </RowItem>

        <RowItem
          icon={GlobeAltIcon}
          title={t("settings.cards.region")}
          description={t("settings.descriptions.region")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={formatOptions(regionOptions)}
              selectedValue={{ ...region, label: t(region.labelKey) }}
              onChange={setRegion}
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
              options={formatOptions(currencyOptions)}
              selectedValue={{ ...currency, label: currency.labelKey }}
              onChange={setCurrency}
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
              options={formatOptions(blueLightOptions)}
              selectedValue={{
                ...currentBlueLight,
                label: t(currentBlueLight.labelKey),
              }}
              onChange={handleBlueLightChange}
            />
          </div>
        </RowItem>
      </div>
    </Card>
  );
}
