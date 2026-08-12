import { create } from "zustand";

// Deliberately not persisted — this reflects the freshness of the *current*
// tab's most recent API responses, not something meaningful to remember
// across reloads. A fresh load starts assuming live data until proven
// otherwise, same as before this store existed.


export const useCacheStatusStore = create((set) => ({
  cachedAt: null,
  markCacheHit: () => set({ cachedAt: Date.now() }),
  markFresh: () => set({ cachedAt: null }),
}));
