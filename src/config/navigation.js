
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
  LinkIcon,
} from "@heroicons/react/24/outline";

import { ROUTES } from "@/config/routes";



// Asynchronous route code chunk-splitting anchors
const prefetchDashboard = () => import("@/pages/Dashboard");
const prefetchFlareGPT = () => import("@/pages/Flrgpt");
const prefetchSettings = () => import("@/pages/Settings");
const prefetchHelp = () => import("@/pages/Help");
const prefetchDonate = () => import("@/pages/Donate");
const prefetchDefiProtocols = () => import("@/pages/DefiProtocols");
const prefetchWalletActivity = () => import("@/pages/WalletActivity");
const prefetchLinks = () => import("@/pages/Links");

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
// `group` is Sidebar-only — Help's own guide grid ignores it entirely and
// just keeps reading this array flat, in order, same as before. Entries
// with no `group` (Overview, FlareGPT) render pinned above every section,
// ungrouped: they're the two default entry points, not really "a
// category," so a label over them would just add a scan-step to the two
// things people click most. Everything below is grouped into three
// sections once flat-list length actually earns it — the same "won't
// scale past a handful" threshold Settings' own tab grouping was added
// for (see Settings/index.jsx's `groups`) — grouped by what the page is
// *about* rather than by build status: "portfolio" is everything that
// tracks or grows what's in your wallet, "ecosystem" is wallet-independent
// Flare-wide activity, "general" is about the app itself, not a Flare
// feature. Order within the array is still each group's own display
// order — `group` only tags membership, Sidebar.jsx preserves this
// array's relative order when it buckets by group rather than resorting.
export const NAV_LINKS = [
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
    group: "portfolio",
  },
  {
    translationKey: "ftsoRewards",
    path: ROUTES.ftsoRewards,
    // Full "FTSO Rewards" label, not the shorter "FTSO" this used to show
    // — grouped under "Portfolio" now, sitting right next to Wallet
    // Activity/DeFi Protocols/$rFLR, so it needs to read as a destination
    // on its own rather than assuming the page it opens will explain
    // itself. The page itself is still entirely about delegation rewards
    // you've earned, not a gift someone gave you, so a trophy reads as the
    // actually-earned-it reward this represents rather than the more
    // generic gift box.
    icon: TrophyIcon,
    group: "portfolio",
  },
  {
    translationKey: "defiProtocols",
    path: ROUTES.defiProtocols,
    icon: Square3Stack3DIcon,
    prefetch: prefetchDefiProtocols,
    guideDescriptionKey: "defiProtocols.description",
    group: "portfolio",
  },
  {
    translationKey: "loops",
    path: ROUTES.loops,
    icon: ArrowPathIcon,
    group: "portfolio",
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
    group: "portfolio",
  },
  {
    translationKey: "governance",
    path: ROUTES.governance,
    icon: ShieldCheckIcon,
    group: "ecosystem",
  },
  {
    translationKey: "links",
    path: ROUTES.links,
    icon: LinkIcon,
    prefetch: prefetchLinks,
    guideDescriptionKey: "links.description",
    group: "ecosystem",
  },
  {
    translationKey: "donate",
    path: ROUTES.donate,
    icon: HeartIcon,
    prefetch: prefetchDonate,
    guideDescriptionKey: "donate.description",
    group: "general",
  },
  {
    translationKey: "settings",
    path: ROUTES.settings,
    icon: Cog6ToothIcon,
    prefetch: prefetchSettings,
    group: "general",
  },
  {
    translationKey: "helpCenter",
    path: ROUTES.help,
    icon: QuestionMarkCircleIcon,
    prefetch: prefetchHelp,
    group: "general",
  },
];

// Display order + i18n key for each Sidebar section header — kept
// separate from the items themselves (`group` above only tags
// membership) so this is the one place that defines both the section
// order and its label, rather than inferring order from array position.
export const NAV_GROUPS = [
  { id: "portfolio", labelKey: "sidebar.groups.portfolio" },
  { id: "ecosystem", labelKey: "sidebar.groups.ecosystem" },
  { id: "general", labelKey: "sidebar.groups.general" },
];
