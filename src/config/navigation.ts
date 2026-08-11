import type { ComponentType, SVGProps } from "react";
import {
  WalletIcon,
  SparklesIcon,
  CalendarDateRangeIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  Square3Stack3DIcon,
  Squares2X2Icon,
  ArrowPathIcon,
  TrophyIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

import { ROUTES } from "@/config/routes";

export interface NavLink {
  translationKey: string;
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  // Both optional the same way the entries below actually use them — a
  // "coming soon" stub has neither, a shipped page usually has both.
  prefetch?: () => Promise<unknown>;
  hideOnMobile?: boolean;
  guideDescriptionKey?: string;
}

// Asynchronous route code chunk-splitting anchors
const prefetchDashboard = () => import("@/pages/Dashboard");
const prefetchFlareGPT = () => import("@/pages/Flrgpt");
const prefetchSettings = () => import("@/pages/Settings");
const prefetchHelp = () => import("@/pages/Help");
const prefetchDonate = () => import("@/pages/Donate");
const prefetchDefiProtocols = () => import("@/pages/DefiProtocols");
const prefetchWalletActivity = () => import("@/pages/WalletActivity");

// The single source of truth for every top-level page — both Sidebar's nav
// list and the Help Center's Feature Guides are derived from this one
// array, rather than each maintaining their own copy. That's the direct
// fix for how Help's guides previously drifted from reality (a "Yield"
// guide for a page that no longer exists, DeFi Protocols and Donate never
// added). `guideDescriptionKey` is deliberately only set on pages with
// real, shipped functionality — Settings, Help, and a few pages that
// simply haven't had a guide written yet (FTSO Rewards, Loops, rFLR
// Vesting) don't have one, which is what keeps them out of the guides
// list without needing a second flag to track separately from this one.
//
// Ordered by expected importance/frequency: the home view, then the
// fully-functional core features (AI chat, wallet tracking, reward
// claiming, governance), then the not-yet-built "coming soon" stubs grouped
// together, then the utility pages (settings/help) that convention places
// last in most dashboard products.
export const NAV_LINKS: NavLink[] = [
  {
    translationKey: "overview",
    path: ROUTES.app,
    icon: Squares2X2Icon,
    prefetch: prefetchDashboard,
    guideDescriptionKey: "dashboard.description",
  },
  {
    translationKey: "FlareGPT",
    path: ROUTES.flareGpt,
    icon: SparklesIcon,
    prefetch: prefetchFlareGPT,
    // The mobile FAB (see Navbar.jsx) is a full parity entry point to the
    // exact same experience — on mobile the widget renders full-screen,
    // identical to this page, so a second nav row to it is pure
    // redundancy there. Desktop's widget stays a compact floating panel
    // (a genuinely different shape than the full page), so both entry
    // points earn their place there.
    hideOnMobile: true,
    guideDescriptionKey: "help.flareGptGuideDescription",
  },
  {
    translationKey: "walletActivity",
    path: ROUTES.walletActivity,
    icon: WalletIcon,
    prefetch: prefetchWalletActivity,
    guideDescriptionKey: "wallet.activity.description",
  },
  {
    translationKey: "ftsoRewards",
    path: ROUTES.ftsoRewards,
    // Label shortened from "FTSO Rewards" to "FTSO" — the page itself is
    // still entirely about delegation rewards you've earned, not a gift
    // someone gave you, so a trophy reads as the actually-earned-it
    // reward this represents rather than the more generic gift box.
    icon: TrophyIcon,
  },
  {
    translationKey: "defiProtocols",
    path: ROUTES.defiProtocols,
    icon: Square3Stack3DIcon,
    prefetch: prefetchDefiProtocols,
    guideDescriptionKey: "defiProtocols.description",
  },
  {
    translationKey: "loops",
    path: ROUTES.loops,
    icon: ArrowPathIcon,
  },
  {
    translationKey: "rflrTracker",
    path: ROUTES.rflrTracker,
    // Label shortened from "rFLR Vesting"/"$rFLR Vesting" to "$rFLR", but
    // the page itself is still the melt/unlock timeline (see
    // RflrVesting/index.tsx's own Unlock Timeline card) — a schedule
    // unlocking gradually across a start-to-end date range, which this
    // icon depicts directly, rather than a plain clock face's "current
    // time"/countdown connotation.
    icon: CalendarDateRangeIcon,
  },
  {
    translationKey: "governance",
    path: ROUTES.governance,
    icon: ShieldCheckIcon,
  },
  {
    translationKey: "donate",
    path: ROUTES.donate,
    icon: HeartIcon,
    prefetch: prefetchDonate,
    guideDescriptionKey: "donate.description",
  },
  {
    translationKey: "settings",
    path: ROUTES.settings,
    icon: Cog6ToothIcon,
    prefetch: prefetchSettings,
  },
  {
    translationKey: "helpCenter",
    path: ROUTES.help,
    icon: QuestionMarkCircleIcon,
    prefetch: prefetchHelp,
  },
];
