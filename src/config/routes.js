// Single source of truth for every route path string in the app. Anywhere
// that navigates, links, or compares against a route should import from
// here instead of retyping the string — the previous version of this app
// had "/app/wallet", "/app/defi", etc. duplicated across navigation.js,
// AppRoutes.jsx, Sidebar.jsx, Navbar.jsx, and half a dozen `navigate(...)`
// call sites, any one of which could silently drift from the others on a
// rename (exactly what happened when "/app/fxrp" became "/app/defi").

const APP_ROOT = "/app";

// The relative segments as they appear directly under the `/app` layout
// route in AppRoutes.jsx — kept separate from the absolute ROUTES below so
// the route *definitions* and every absolute reference to them are built
// from the exact same string, rather than being two independently-typed
// values that just happen to agree today.
// `as const` on both: every value stays its exact string literal instead of
// widening to `string`, so a call site typed against these (e.g. a future
// `route: keyof typeof ROUTES`) gets real autocomplete and a compiler error
// on a typo'd route name, not just at the string-concatenation call sites
// below.
export const APP_SEGMENTS = {
  flareGpt: "flare-gpt",
  walletActivity: "wallet",
  ftsoRewards: "ftso",
  governance: "governance",
  loops: "loops",
  rflrTracker: "rflr",
  defiProtocols: "defi",
  donate: "donate",
  settings: "settings",
  help: "help",
};

export const ROUTES = {
  landing: "/",
  terms: "/terms",
  app: APP_ROOT,
  flareGpt: `${APP_ROOT}/${APP_SEGMENTS.flareGpt}`,
  walletActivity: `${APP_ROOT}/${APP_SEGMENTS.walletActivity}`,
  ftsoRewards: `${APP_ROOT}/${APP_SEGMENTS.ftsoRewards}`,
  governance: `${APP_ROOT}/${APP_SEGMENTS.governance}`,
  loops: `${APP_ROOT}/${APP_SEGMENTS.loops}`,
  rflrTracker: `${APP_ROOT}/${APP_SEGMENTS.rflrTracker}`,
  defiProtocols: `${APP_ROOT}/${APP_SEGMENTS.defiProtocols}`,
  donate: `${APP_ROOT}/${APP_SEGMENTS.donate}`,
  settings: `${APP_ROOT}/${APP_SEGMENTS.settings}`,
  help: `${APP_ROOT}/${APP_SEGMENTS.help}`,
};
