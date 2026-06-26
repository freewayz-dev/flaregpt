// src/store/useUIStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { startTransition } from "react";
import { flushSync } from "react-dom";

export const useUIStore = create()(
  persist(
    (set, get) => ({
      darkMode: false,
      blueLightLevel: "Off",
      settingsActiveTab: "Preferences",

      toggleTheme: () => {
        const nextMode = !get().darkMode;

        // 1. Force the DOM transition class and classList toggle synchronously
        // This prevents the visual flicker of the wrong theme
        flushSync(() => {
          document.documentElement.classList.add("no-transition");
          document.documentElement.classList.toggle("dark", nextMode);
        });

        // 2. Use startTransition to update React state
        // This prevents the "Suspense/Sync Input" error during navigation
        startTransition(() => {
          set({ darkMode: nextMode });
        });

        // 3. Remove the CSS class after the paint
        setTimeout(() => {
          document.documentElement.classList.remove("no-transition");
        }, 20);
      },

      updateBlueLightLevel: (level) => set({ blueLightLevel: level }),
      setSettingsActiveTab: (tabId) => {
        startTransition(() => {
          set({ settingsActiveTab: tabId });
        });
      },
    }),
    {
      name: "flaregpt_ui_preferences",
      onRehydrateStorage: () => (state) => {
        const isDark = state ? state.darkMode : false;
        document.documentElement.classList.toggle("dark", isDark);
      },
    }
  )
);