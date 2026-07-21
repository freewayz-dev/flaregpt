import { useTranslation } from "react-i18next";
import {
  Cog8ToothIcon,
  WalletIcon,
  BellIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

import { useUIStore } from "@/store/useUIStore";
import PageHeader from "@/components/common/PageHeader";
import Preferences from "@/pages/Settings/tabs/Preferences";
import Wallets from "@/pages/Settings/tabs/Wallets";
import Notifications from "@/pages/Settings/tabs/Notifications";
import Display from "@/pages/Settings/tabs/Display";
import Security from "@/pages/Settings/tabs/Security";
import About from "@/pages/Settings/tabs/About";

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
                            ? "bg-surface-card text-brand font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                            : "text-[#475569] hover:text-ink-primary dark:text-[#6D7A86] hover:bg-surface-subtle font-medium"
                        }
                        after:content-[attr(data-text)] after:block after:font-semibold after:h-0 after:overflow-hidden after:visibility-hidden`}
                    >
                      <div
                        className={`
                          absolute inset-0 rounded-xl pointer-events-none index-0 transition-opacity duration-100
                          ${isActive ? "opacity-100" : "opacity-0"}
                        `}
                      />

                      <IconComponent
                        className={`h-4 w-4 shrink-0 index-10 transition-transform duration-200 ease-out group-hover:scale-105 ${
                          isActive
                            ? "text-brand"
                            : "text-[#94A3B8] dark:text-[#6D7A86]"
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
    </div>
  );
}
