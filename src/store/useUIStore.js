import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUIStore = create()(
  persist(
    (set, get) => ({
      darkMode: false,
      blueLightLevel: "Off",
      settingsActiveTab: "Preferences",

      toggleTheme: () => {
        const nextMode = !get().darkMode;

        // 1. Add a class that disables transitions globally
        document.documentElement.classList.add("no-transition");

        // 2. Toggle the dark mode
        document.documentElement.classList.toggle("dark", nextMode);

        // 3. Update state
        set({ darkMode: nextMode });

        // 4. Force a repaint and remove the class
        // setTimeout ensures the browser finishes the class swap before re-enabling transitions
        setTimeout(() => {
          document.documentElement.classList.remove("no-transition");
        }, 50);
      },

      updateBlueLightLevel: (level) => set({ blueLightLevel: level }),
      setSettingsActiveTab: (tabId) => set({ settingsActiveTab: tabId }),
    }),
    {
      name: "flaregpt_ui_preferences",
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle("dark", state.darkMode);
        }
      },
    },
  ),
);
