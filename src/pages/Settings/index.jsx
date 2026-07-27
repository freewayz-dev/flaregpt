import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AdjustmentsHorizontalIcon,
  PaintBrushIcon,
  ChartBarIcon,
  EyeIcon,
  WalletIcon,
  SparklesIcon,
  CircleStackIcon,
  BellIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

import { useUIStore } from "@/store/useUIStore";
import PageHeader from "@/components/common/PageHeader";
import Preferences from "@/pages/Settings/tabs/Preferences";
import Appearance from "@/pages/Settings/tabs/Appearance";
import Dashboard from "@/pages/Settings/tabs/Dashboard";
import AccessibilityTab from "@/pages/Settings/tabs/Accessibility";
import Wallets from "@/pages/Settings/tabs/Wallets";
import FlareGpt from "@/pages/Settings/tabs/FlareGpt";
import DataStorage from "@/pages/Settings/tabs/DataStorage";
import Notifications from "@/pages/Settings/tabs/Notifications";
import Security from "@/pages/Settings/tabs/Security";
import About from "@/pages/Settings/tabs/About";

// Tab `id`s deliberately keep their original values where a tab already
// existed ("Preferences", "Display") even though their *displayed* label
// changed (to "General"/"Dashboard", via the i18n string, not the key) —
// `settingsActiveTab` is a persisted zustand field, and renaming the id
// itself would strand any returning user's saved tab on a value that no
// longer matches anything. Only genuinely new tabs get new ids, since
// there's no prior persisted value that could collide with them anyway.
//
// Grouped into three labeled sections rather than one flat list of ten —
// this is exactly the "won't scale past a handful of tabs" ceiling flagged
// in the earlier review; doubling the tab count is the point at which
// grouping earns its keep rather than reading as unnecessary structure.
const groups = [
  {
    labelKey: "settings.groups.personalization",
    tabs: [
      { id: "Preferences", icon: AdjustmentsHorizontalIcon, Component: Preferences },
      { id: "Appearance", icon: PaintBrushIcon, Component: Appearance },
      { id: "Display", icon: ChartBarIcon, Component: Dashboard },
      { id: "Accessibility", icon: EyeIcon, Component: AccessibilityTab },
    ],
  },
  {
    labelKey: "settings.groups.walletsAndData",
    tabs: [
      { id: "Wallets", icon: WalletIcon, Component: Wallets },
      { id: "FlareGpt", icon: SparklesIcon, Component: FlareGpt },
      { id: "DataStorage", icon: CircleStackIcon, Component: DataStorage },
    ],
  },
  {
    labelKey: "settings.groups.account",
    tabs: [
      { id: "Notifications", icon: BellIcon, Component: Notifications },
      { id: "Security", icon: ShieldCheckIcon, Component: Security },
      { id: "About", icon: InformationCircleIcon, Component: About },
    ],
  },
];

const allTabs = groups.flatMap((g) => g.tabs);

// A fade at whichever edge still has more tabs beyond it — the classic
// "this scrolls" affordance (iOS Settings, most native tab bars) rather
// than a static arrow icon competing for attention. Masks the row's own
// content to transparent (matching MessageList's technique elsewhere in
// this app) instead of painting a solid-color overlay, so it never needs
// to guess the exact background color behind it and can't visibly seam
// against it. Recomputed on scroll/resize so each fade disappears exactly
// once its side is fully scrolled into view.
function buildEdgeFadeMask({ atStart, atEnd }, fadeSize = "28px") {
  const leftStop = atStart ? "0px" : fadeSize;
  const rightStop = atEnd ? "0px" : fadeSize;
  return `linear-gradient(to right, ${
    atStart ? "black" : "transparent"
  }, black ${leftStop}, black calc(100% - ${rightStop}), ${atEnd ? "black" : "transparent"})`;
}

export default function Settings() {
  // Bind navigation state straight to persistent store selectors
  const activeTab = useUIStore((state) => state.settingsActiveTab);
  const setActiveTab = useUIStore((state) => state.setSettingsActiveTab);
  const { t } = useTranslation();

  const ActiveComponent = allTabs.find((tab) => tab.id === activeTab)?.Component ?? Preferences;

  const mobileNavRef = useRef(null);
  const [mobileScrollEdges, setMobileScrollEdges] = useState({ atStart: true, atEnd: false });

  useEffect(() => {
    const el = mobileNavRef.current;
    if (!el) return;

    const updateEdges = () => {
      setMobileScrollEdges({
        atStart: el.scrollLeft <= 4,
        atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      });
    };

    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, []);

  const renderTabButton = (tab) => {
    const isActive = activeTab === tab.id;
    const tabLabel = t(`settings.tabs.${tab.id}`);
    const IconComponent = tab.icon;

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
              : "text-[#475569] hover:text-ink-primary dark:text-[#6D7A86] dark:hover:text-white hover:bg-surface-card-hover font-medium"
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
            isActive ? "text-brand" : "text-[#94A3B8] dark:text-[#6D7A86]"
          }`}
        />

        <span className="index-10 pointer-events-none tracking-normal">{tabLabel}</span>
      </button>
    );
  };

  return (
    <div className="pb-14">
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
            {/* Mobile: flat horizontal scroll, group order preserved but
                no header labels — a scrolling strip doesn't have the
                vertical room to show them without adding a second row.
                The edge fade (see buildEdgeFadeMask) is what actually
                signals "more tabs this way" — a static class name here
                once existed for this but was never backed by real CSS,
                which is exactly why the scrollability wasn't obvious. */}
            <nav
              ref={mobileNavRef}
              className="flex md:hidden flex-row gap-1 overflow-x-auto pb-2 scrollbar-none select-none snap-x"
              style={{
                WebkitMaskImage: buildEdgeFadeMask(mobileScrollEdges),
                maskImage: buildEdgeFadeMask(mobileScrollEdges),
              }}
            >
              {allTabs.map(renderTabButton)}
            </nav>

            {/* Desktop: grouped vertical list with section labels. */}
            <nav className="hidden md:flex md:flex-col md:gap-4">
              {groups.map((group) => (
                <div key={group.labelKey} className="space-y-1">
                  <p className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    {t(group.labelKey)}
                  </p>
                  {group.tabs.map(renderTabButton)}
                </div>
              ))}
            </nav>
          </aside>

          {/* Workspace Canvas Area — a plain div, not a second <main>: this
              already sits inside DashboardLayout's own <main>, and two
              <main> landmarks in one document is invalid, unlike every
              sibling page (Overview, Wallet Activity, DeFi Protocols,
              Donate, Help), none of which nest one here either. */}
          <div className="flex-1 w-full max-w-3xl">
            <div className="space-y-6">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
