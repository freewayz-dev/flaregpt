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

      toggleTheme: () => {
        const nextMode = !get().darkMode;

        document.documentElement.classList.add("no-transition");
        document.documentElement.classList.toggle("dark", nextMode);

        set({
          darkMode: nextMode,
          hasThemeOverride: true,
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