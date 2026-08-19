import { create } from "zustand";
import { persist } from "zustand/middleware";

import { THEME_SURFACE_COLOR } from "@/config/theme";





// Named `SpectraMarketSlug`, not `SpectraMarket` — defiProtocolsService.ts
// already exports a `SpectraMarket` interface for the API's own market
// object shape (maturity, contracts, position, ...), a different concept
// from this store's persisted "which market slug is selected" preference.








const getSystemPreference = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;

// Matches DashboardLayout.tsx's own root background classes
// (`bg-[#F0F4F9] dark:bg-[#101115]`) and public/theme-init.js's identical
// pre-paint logic — kept as one shared function (not copy-pasted at each
// of this file's two call sites plus App.tsx's OS-preference listener)
// specifically so the three can't drift to different colors from each
// other the way theme-init.js's own history already shows duplicated
// theme logic tends to. A native app's status bar/task-switcher chrome
// blends into its current background; this is what keeps that true here
// too instead of leaving it a fixed brand color regardless of theme.
export function applyThemeColorMeta(isDark) {
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", isDark ? THEME_SURFACE_COLOR.dark : THEME_SURFACE_COLOR.light);
}

// See useAuthStore.ts for why the state creator and `partialize`/
// `onRehydrateStorage` below need explicit parameter/return type
// annotations — the same `persist` generic-inference gap, not anything
// specific to this store.
export const useUIStore = create()(
  persist(
    (set) => ({
      // Theme
      darkMode: getSystemPreference(),
      hasThemeOverride: false,

      // Other UI settings
      blueLightLevel: "Off",
      settingsActiveTab: "Preferences",
      sidebarCollapsed: false,

      currency: "USD",
      chartType: "Area",
      timeframe: "7D",
      spectraMarket: "stxrp-2026-08-27",

      defaultLandingPage: "overview",
      tableDensity: "comfortable",

      reduceMotionOverride: false,

      hideBalances: false,

      hasSeenWelcome: false,

      // Same three-state model the FOUC-prevention script in index.html
      // and this store's own onRehydrateStorage already read — this just
      // exposes it as an explicit, re-selectable action instead of the
      // binary toggleTheme, which could only ever move *away* from
      // "System" and had no path back. `hasThemeOverride: false` again
      // means "follow the OS," so a user is never stuck having to guess
      // their own OS setting to get back to it.
      setAppearance: (mode) => {
        const nextDarkMode = mode === "system" ? getSystemPreference() : mode === "dark";

        document.documentElement.classList.add("no-transition");
        document.documentElement.classList.toggle("dark", nextDarkMode);
        applyThemeColorMeta(nextDarkMode);

        set({
          darkMode: nextDarkMode,
          hasThemeOverride: mode !== "system",
        });

        setTimeout(() => {
          document.documentElement.classList.remove("no-transition");
        }, 50);
      },

      updateBlueLightLevel: (level) =>
        set({ blueLightLevel: level }),

      setSettingsActiveTab: (tabId) =>
        set({ settingsActiveTab: tabId }),

      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setCurrency: (currency) => set({ currency }),
      setChartType: (chartType) => set({ chartType }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setSpectraMarket: (spectraMarket) => set({ spectraMarket }),
      setDefaultLandingPage: (page) => set({ defaultLandingPage: page }),
      setTableDensity: (density) => set({ tableDensity: density }),
      // `MotionConfig` in App.jsx only ever governs framer-motion-driven
      // animation — every plain CSS `transition-*`/`animate-*` utility
      // elsewhere (the sidebar's width transition, drawer/dropdown/modal
      // slide-and-fade transitions, `animate-pulse` skeletons,
      // `animate-spin` spinners) is untouched by that and previously kept
      // animating at full speed regardless of this setting. Toggling a
      // class here — covered by the blanket rule in index.css — is what
      // actually makes this setting apply everywhere it claims to, not
      // just to the one library's own animations.
      setReduceMotionOverride: (value) => {
        document.documentElement.classList.toggle("reduce-motion", value);
        set({ reduceMotionOverride: value });
      },
      toggleHideBalances: () => set((state) => ({ hideBalances: !state.hideBalances })),
      markWelcomeSeen: () => set({ hasSeenWelcome: true }),
    }),
    {
      name: "flaregpt_ui_preferences",

      // `settingsActiveTab` deliberately excluded — Settings should always
      // open on its default tab for a new visit, never resume wherever the
      // user last left it (e.g. Security) days later. Every other field
      // here stays persisted exactly as before; this is the one exclusion.
      partialize: (state) => {
        // eslint-disable-next-line no-unused-vars -- rest-sibling exclusion, not a genuinely unused binding
        const { settingsActiveTab, ...rest } = state;
        return rest;
      },

      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const isDark = state.hasThemeOverride ? state.darkMode : getSystemPreference();

        document.documentElement.classList.toggle("dark", isDark);
        applyThemeColorMeta(isDark);
        document.documentElement.classList.toggle("reduce-motion", Boolean(state.reduceMotionOverride));

        // Keep Zustand in sync
        state.darkMode = isDark;
      },
    }
  )
);
