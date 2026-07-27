import { create } from "zustand";
import { persist } from "zustand/middleware";

const getSystemPreference = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;

export const useUIStore = create()(
  persist(
    (set, get) => ({
      // Theme
      darkMode: getSystemPreference(),
      hasThemeOverride: false,

      // Other UI settings
      blueLightLevel: "Off",
      settingsActiveTab: "Preferences",
      sidebarCollapsed: false,

      // Display preferences — drive the dashboard's charts and currency
      // formatting everywhere a USD-denominated value is shown.
      currency: "USD",
      chartType: "Area",
      timeframe: "7D",

      // Personalization additions: which route the index route lands on
      // ("overview" = today's default, unchanged behavior), and a global
      // row-density knob every dense table (GenericTable, Wallet Activity's
      // feed) reads rather than each maintaining its own.
      defaultLandingPage: "overview",
      tableDensity: "comfortable",

      // Off by default — framer-motion's own `reducedMotion="user"`
      // (see App.jsx) already defers to the OS's prefers-reduced-motion,
      // which covers most people who want less motion. This is only for
      // someone whose OS has no such preference set but who still wants
      // this app specifically to cut its animations — a narrower,
      // additive override, not a replacement for the OS-level default.
      reduceMotionOverride: false,

      // A quick, reversible privacy screen for shoulder-surfing situations
      // (a shared desk, a screen share) — not a security boundary, so it's
      // a single global flag rather than a per-field reveal. Toggled from
      // an eye icon in the navbar (the point-of-need location) and mirrored
      // in Settings for discoverability; both drive the same value.
      hideBalances: false,

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
      setDefaultLandingPage: (page) => set({ defaultLandingPage: page }),
      setTableDensity: (density) => set({ tableDensity: density }),
      setReduceMotionOverride: (value) => set({ reduceMotionOverride: value }),
      toggleHideBalances: () => set((state) => ({ hideBalances: !state.hideBalances })),
    }),
    {
      name: "flaregpt_ui_preferences",

      onRehydrateStorage: () => (state) => {
        const isDark = state?.hasThemeOverride
          ? state.darkMode
          : getSystemPreference();

        document.documentElement.classList.toggle("dark", isDark);

        // Keep Zustand in sync
        state.darkMode = isDark;
      },
    }
  )
);