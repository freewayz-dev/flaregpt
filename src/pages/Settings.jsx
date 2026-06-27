// src/pages/Settings.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";
import {
  Cog8ToothIcon,
  WalletIcon,
  BellIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ArrowRightOnRectangleIcon,
  GlobeAltIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  PaintBrushIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import ThemeToggle from "../components/common/ThemeToggle";
import PageHeader from "../components/common/PageHeader";
// import Footer from "../components/common/Footer";
import CustomSelect from "../components/common/CustomSelect";

// Import your unified Zustand global hooks
import { useUIStore } from "../store/useUIStore";
import { useDerivedWalletHub } from "../store/useWalletHubStore";

// FIXED: Removed border classes to match the sleek borderless card design system
const Card = ({ title, subtitle, children }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#161619]">
    <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#FAFAFA]">{title}</h3>
    <p className="text-[11px] text-[#475569] dark:text-[#A1A1AA] mt-0.5 mb-5">{subtitle}</p>
    {children}
  </div>
);

const RowItem = ({ icon: Icon, title, description, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
    <div className="flex gap-3 items-start">
      {Icon && <Icon className="h-4 w-4 text-slate-400 dark:text-zinc-600 shrink-0 mt-0.5" />}
      <div>
        <h4 className="text-xs font-semibold text-[#0F172A] dark:text-[#FAFAFA]">{title}</h4>
        <p className="text-[11px] text-[#475569] dark:text-[#A1A1AA] mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Toggle = () => (
  <div className="w-8 h-4 rounded-full bg-slate-200 dark:bg-zinc-800 relative cursor-pointer" />
);

const tabs = [
  { id: "Preferences", icon: Cog8ToothIcon },
  { id: "Wallets", icon: WalletIcon },
  { id: "Notifications", icon: BellIcon },
  { id: "Display", icon: ChartBarIcon },
  { id: "Security", icon: ShieldCheckIcon },
  { id: "About", icon: InformationCircleIcon },
];

export default function Settings() {
  // Bind navigation state straight to persistent store selectors
  const activeTab = useUIStore((state) => state.settingsActiveTab);
  const setActiveTab = useUIStore((state) => state.setSettingsActiveTab);
  const { t } = useTranslation();

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 pb-10">
        <div className="pt-3 lg:pt-0">
          <PageHeader
            title={t("settings.title")}
            description={t("settings.description")}
          />
        </div>

        <div className="mx-auto w-full max-w-[1440px]">
          <div className="flex flex-col gap-6 md:flex-row items-start">
            
            {/* Tab Navigation */}
            <aside className="w-full shrink-0 md:w-56 lg:w-64 md:sticky md:top-6 z-10">
              <nav className="flex flex-row gap-1 overflow-x-auto pb-2 md:pb-0 md:flex-col scrollbar-none select-none snap-x mask-gradient-right md:mask-none">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  const isActive = activeTab === tab.id;
                  const tabLabel = t(`settings.tabs.${tab.id}`);

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      data-text={tabLabel}
                      className={`
                        relative flex items-center gap-2.5 px-3.5 py-2.5 md:py-3 text-xs rounded-xl cursor-pointer group shrink-0 snap-center transition-colors duration-150 ease-out outline-none
                        ${
                          isActive
                            ? "bg-[#FFFFFF] dark:bg-[#161619] text-[#E62058] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                            : "text-[#475569] hover:text-[#0F172A] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#1B1B1F] font-medium"
                        } 
                        after:content-[attr(data-text)] after:block after:font-semibold after:h-0 after:overflow-hidden after:visibility-hidden`}
                    >
                      <div
                        className={`
                          absolute inset-0 rounded-xl pointer-events-none index-0 transition-opacity duration-100
                          ${
                            isActive
                              ? "opacity-100"
                              : "opacity-0"
                          }
                        `}
                      />

                      <IconComponent
                        className={`h-4 w-4 shrink-0 index-10 transition-transform duration-200 ease-out group-hover:scale-105 ${
                          isActive
                            ? "text-[#E62058]"
                            : "text-[#94A3B8] dark:text-[#71717A]"
                        }`}
                      />

                      <span className="index-10 pointer-events-none tracking-normal">
                        {tabLabel}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Workspace Canvas Area */}
            <main className="flex-1 w-full max-w-3xl">
              <div className="space-y-6">
                {activeTab === "Preferences" && <Preferences />}
                {activeTab === "Wallets" && <Wallets />}
                {activeTab === "Notifications" && <Notifications />}
                {activeTab === "Display" && <Display />}
                {activeTab === "Security" && <Security />}
                {activeTab === "About" && <About />}
              </div>
            </main>
          </div>
        </div>
      </div>
      {/* <Footer /> */}
    </div>
  );
}

function Preferences() {
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
    { value: "USD", labelKey: "USD" },
    { value: "EUR", labelKey: "EUR" },
    { value: "NGN", labelKey: "NGN" },
    { value: "GBP", labelKey: "GBP" },
    { value: "JPY", labelKey: "JPY" },
  ];

  const blueLightOptions = [
    { value: "Off", labelKey: "settings.options.off" },
    { value: "Low", labelKey: "settings.options.low" },
    { value: "Medium", labelKey: "settings.options.medium" },
    { value: "High", labelKey: "settings.options.high" },
  ];

  const currentLanguage = languageOptions.find((lang) => lang.code === i18n.language) || languageOptions[0];
  const [region, setRegion] = useState(regionOptions[0]);
  const [currency, setCurrency] = useState(currencyOptions[0]);

  const blueLightLevel = useUIStore((state) => state.blueLightLevel);
  const updateBlueLightLevel = useUIStore((state) => state.updateBlueLightLevel);

  const currentBlueLight = blueLightOptions.find((option) => option.value === blueLightLevel) || blueLightOptions[0];

  const handleBlueLightChange = (option) => updateBlueLightLevel(option.value);
  const handleLanguageChange = (selectedOption) => {
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
    <Card title={t("settings.tabs.Preferences")} subtitle={t("settings.subtitles.Preferences")}>
      <div className="divide-y divide-[#E5E7EB] dark:divide-[#1D1D20]">
        <RowItem icon={PaintBrushIcon} title={t("settings.cards.theme")} description={t("settings.cards.themeMode")}>
          <ThemeToggle />
        </RowItem>

        <RowItem icon={GlobeAltIcon} title={t("settings.cards.language")} description={t("settings.descriptions.language")}>
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

        <RowItem icon={GlobeAltIcon} title={t("settings.cards.region")} description={t("settings.descriptions.region")}>
          <div className="w-full sm:w-56">
            <CustomSelect
              options={formatOptions(regionOptions)}
              selectedValue={{ ...region, label: t(region.labelKey) }}
              onChange={setRegion}
            />
          </div>
        </RowItem>

        <RowItem icon={CurrencyDollarIcon} title={t("settings.cards.currency")} description={t("settings.descriptions.currency")}>
          <div className="w-full sm:w-56">
            <CustomSelect
              options={formatOptions(currencyOptions)}
              selectedValue={{ ...currency, label: currency.labelKey }}
              onChange={setCurrency}
            />
          </div>
        </RowItem>

        <RowItem icon={SparklesIcon} title={t("settings.cards.blur")} description={t("settings.descriptions.blur")}>
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

function Wallets() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useAccount();
  
  const { 
    allWallets, 
    trackedWallets, 
    addTrackedWallet, 
    removeTrackedWallet, 
    maxSlots, 
    remainingSlots 
  } = useDerivedWalletHub(connectedAddress, isConnected);
  
  const [inputAddress, setInputAddress] = useState("");
  const [inputLabel, setInputLabel] = useState("");
  const [errorText, setErrorText] = useState("");

  const totalCount = trackedWallets.length;

  const handleSave = (e) => {
    e.preventDefault();
    setErrorText("");

    if (!inputAddress.startsWith("0x") || inputAddress.length !== 42) {
      setErrorText("Please enter a valid Flare EVM network address (starting with 0x).");
      return;
    }

    const success = addTrackedWallet(
      inputAddress.trim(), 
      inputLabel.trim() || "Watchlist Wallet",
      connectedAddress,
      isConnected
    );
    
    if (!success) {
      setErrorText("Address registration failed. Check if it is a duplicate or if slots are filled.");
      return;
    }

    setInputAddress("");
    setInputLabel("");
  };

  return (
    <div className="space-y-6">
      <Card title={t("settings.cards.connectedWallets")} subtitle="Manage your active Web3 connections and read-only portfolio tracking accounts.">
        {allWallets.length === 0 ? (
          <div className="py-8 text-center rounded-2xl bg-[#F3F4F6] dark:bg-[#1B1B1F] px-4">
            <WalletIcon className="h-8 w-8 mx-auto text-[#94A3B8] dark:text-[#71717A] mb-2" />
            <p className="text-sm font-medium text-[#0F172A] dark:text-[#FAFAFA]">
              {t("settings.wallets.emptyTerminal")}
            </p>
            <p className="mt-0.5 text-xs text-[#475569] dark:text-[#A1A1AA]">
              {t("settings.wallets.limit", { max: maxSlots })}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allWallets.map((wallet) => (
              <div
                key={wallet.address}
                className="flex items-center justify-between gap-4 rounded-xl bg-[#F3F4F6] dark:bg-[#1B1B1F] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-[#121214] text-[#475569] dark:text-[#A1A1AA]">
                    <WalletIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] dark:text-[#FAFAFA] truncate">
                      {wallet.label}
                    </p>
                    <p className="text-xs font-mono text-[#94A3B8] dark:text-[#71717A] mt-0.5 truncate">
                      {wallet.address}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    wallet.type === "connected" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {wallet.type === "connected" ? "Live Connected" : "Read-Only"}
                  </span>
                  
                  {wallet.type === "tracked" && (
                    <button
                      type="button"
                      onClick={() => removeTrackedWallet(wallet.address, connectedAddress, isConnected)}
                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#E62058] hover:bg-[#E62058]/10 dark:text-[#71717A] dark:hover:text-[#E62058] dark:hover:bg-[#E62058]/10 transition-colors duration-150 cursor-pointer"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 pt-6 border-t border-[#E5E7EB] dark:border-[#1D1D20] space-y-3">
          <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#FAFAFA]">Add Watchlist Portfolio Account</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Account Name Label (e.g., Cold Storage)"
              value={inputLabel}
              onChange={(e) => setInputLabel(e.target.value)}
              className="w-full bg-[#F3F4F6] dark:bg-[#1B1B1F] px-3 py-2 text-xs rounded-xl border border-transparent focus:border-[#E62058]/30 outline-none text-[#0F172A] dark:text-[#FAFAFA]"
            />
            <input
              type="text"
              placeholder="0x... Flare Wallet Address"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              className="w-full bg-[#F3F4F6] dark:bg-[#1B1B1F] px-3 py-2 text-xs font-mono rounded-xl border border-transparent focus:border-[#E62058]/30 outline-none text-[#0F172A] dark:text-[#FAFAFA]"
            />
          </div>

          {errorText && <p className="text-[10px] text-[#E62058] tracking-wide font-medium">{errorText}</p>}

          <button
            type="submit"
            disabled={remainingSlots === 0}
            className={`
              mt-2 w-full rounded-xl py-2.5 text-sm font-medium transition duration-200 cursor-pointer shadow-sm text-center
              ${
                remainingSlots === 0
                  ? "bg-[#F3F4F6] text-[#94A3B8] cursor-not-allowed dark:bg-[#1B1B1F] dark:text-[#71717A]"
                  : "bg-[#E62058] text-white hover:bg-[#F03A6F] hover:shadow-[0_4px_12px_rgba(230,32,88,0.2)]"
              }
            `}
          >
            {remainingSlots === 0
              ? t("settings.wallets.limitReached", { current: totalCount, max: maxSlots })
              : t("settings.wallets.connectAction", { current: totalCount, remaining: remainingSlots })}
          </button>
        </form>
      </Card>

      <Card title={t("settings.cards.walletCapacity")} subtitle={t("settings.descriptions.walletCapacity")}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="p-2 sm:p-3 rounded-xl bg-[#F3F4F6] dark:bg-[#1B1B1F]">
              <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] dark:text-[#71717A]">
                {t("settings.wallets.maximum")}
              </p>
              <p className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#FAFAFA] mt-0.5">
                {maxSlots}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-[#F3F4F6] dark:bg-[#1B1B1F]">
              <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] dark:text-[#71717A]">
                Pasted
              </p>
              <p className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#FAFAFA] mt-0.5">
                {totalCount}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-[#F3F4F6] dark:bg-[#1B1B1F]">
              <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] dark:text-[#71717A]">
                {t("settings.wallets.remainingSlots")}
              </p>
              <p className="text-base sm:text-lg font-semibold text-[#E62058] mt-0.5">
                {remainingSlots}
              </p>
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-[#F3F4F6] dark:bg-[#1B1B1F] overflow-hidden">
            <div
              className="h-2 rounded-full bg-[#E62058] transition-all duration-500 ease-out"
              style={{ width: `${(totalCount / maxSlots) * 100}%` }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Notifications() {
  const { t } = useTranslation();
  return (
    <Card title={t("settings.tabs.Notifications")} subtitle={t("settings.subtitles.Notifications")}>
      <div className="divide-y divide-[#E5E7EB] dark:divide-[#1D1D20]">
        <RowItem title={t("settings.cards.rewardsAlerts")} description={t("settings.notifications.rewards")}>
          <Toggle />
        </RowItem>
        <RowItem title={t("settings.cards.governanceAlerts")} description={t("settings.notifications.governance")}>
          <Toggle />
        </RowItem>
      </div>
    </Card>
  );
}

function Display() {
  const { t } = useTranslation();

  const chartOptions = [
    { value: "Line", labelKey: "settings.options.line" },
    { value: "Candlestick", labelKey: "settings.options.candlestick" },
    { value: "Area", labelKey: "settings.options.area" },
  ];

  const timeframeOptions = [
    { value: "1D", labelKey: "1D" },
    { value: "7D", labelKey: "7D" },
    { value: "30D", labelKey: "30D" },
    { value: "1Y", labelKey: "1Y" },
  ];

  const [chart, setChart] = useState(chartOptions[0]);
  const [timeframe, setTimeframe] = useState(timeframeOptions[0]);

  const formatOptions = (opts) =>
    opts.map((o) => ({
      ...o,
      label: o.labelKey.includes(".") ? t(o.labelKey) : o.labelKey,
    }));

  return (
    <Card title={t("settings.tabs.Display")} subtitle={t("settings.subtitles.Display")}>
      <div className="divide-y divide-[#E5E7EB] dark:divide-[#1D1D20]">
        <RowItem title={t("settings.cards.chartType")} description={t("settings.descriptions.chartType")}>
          <div className="w-full sm:w-56">
            <CustomSelect options={formatOptions(chartOptions)} selectedValue={{ ...chart, label: t(chart.labelKey) }} onChange={setChart} />
          </div>
        </RowItem>
        <RowItem title={t("settings.cards.timeframe")} description={t("settings.descriptions.timeframe")}>
          <div className="w-full sm:w-56">
            <CustomSelect options={formatOptions(timeframeOptions)} selectedValue={{ ...timeframe, label: timeframe.labelKey }} onChange={setTimeframe} />
          </div>
        </RowItem>
      </div>
    </Card>
  );
}

function Security() {
  const { t } = useTranslation();
  const timeoutOptions = [
    { value: "15 min", labelKey: "settings.options.15m" },
    { value: "30 min", labelKey: "settings.options.30m" },
    { value: "1 hour", labelKey: "settings.options.1h" },
    { value: "Never", labelKey: "settings.options.never" },
  ];
  const [timeout, setTimeoutState] = useState(timeoutOptions[1]);
  const formatOptions = (opts) => opts.map((o) => ({ ...o, label: t(o.labelKey) }));

  return (
    <Card title={t("settings.tabs.Security")} subtitle={t("settings.subtitles.Security")}>
      <div className="divide-y divide-[#E5E7EB] dark:divide-[#1D1D20]">
        <RowItem title={t("settings.cards.sessionTimeout")} description={t("settings.descriptions.sessionTimeout")}>
          <div className="w-full sm:w-56">
            <CustomSelect options={formatOptions(timeoutOptions)} selectedValue={{ ...timeout, label: t(timeout.labelKey) }} onChange={setTimeoutState} />
          </div>
        </RowItem>
        <RowItem title={t("settings.cards.logout")} description={t("settings.descriptions.logout")}>
          <button className="flex items-center gap-2 justify-center w-full sm:w-auto rounded-xl bg-[#F3F4F6] dark:bg-[#121214] px-4 py-2 text-sm font-medium text-[#0F172A] dark:text-[#FAFAFA] hover:bg-[#E5E7EB] dark:hover:bg-[#1B1B1F] transition duration-150 cursor-pointer select-none">
            <ArrowRightOnRectangleIcon className="h-4 w-4 text-[#94A3B8] dark:text-[#71717A]" />
            <span>{t("settings.security.logoutAll")}</span>
          </button>
        </RowItem>
      </div>
    </Card>
  );
}

function About() {
  const { t } = useTranslation();
  return (
    <Card title={t("settings.tabs.About")} subtitle={t("settings.subtitles.About")}>
      <div className="divide-y divide-[#E5E7EB] dark:divide-[#1D1D20]">
        <RowItem title={t("settings.cards.app")} description={t("settings.descriptions.app")}>
          <span className="text-sm font-mono bg-[#F3F4F6] dark:bg-[#1B1B1F] px-2.5 py-1 rounded-lg text-[#475569] dark:text-[#A1A1AA]">
            v1.0.0
          </span>
        </RowItem>
        <RowItem title={t("settings.cards.links")} description={t("settings.descriptions.links")}>
          <div className="flex gap-4 text-sm text-[#E62058] font-medium select-none">
            <a className="hover:text-[#F03A6F] cursor-pointer transition-colors duration-150">Twitter</a>
            <span className="text-[#E5E7EB] dark:text-[#1D1D20]">•</span>
            <a className="hover:text-[#F03A6F] cursor-pointer transition-colors duration-150">Docs</a>
            <span className="text-[#E5E7EB] dark:text-[#1D1D20]">•</span>
            <a className="hover:text-[#F03A6F] cursor-pointer transition-colors duration-150">GitHub</a>
          </div>
        </RowItem>
      </div>
    </Card>
  );
}