import { create } from "zustand";

// Deliberately not persisted — this reflects the freshness of the *current*
// tab's most recent API responses, not something meaningful to remember
// across reloads. A fresh load starts assuming live data until proven
// otherwise, same as before this store existed.
interface CacheStatusState {
  // `null` = last relevant response was live. A timestamp = the service
  // worker served a cached financial-data response instead (see
  // src/sw.ts's `cacheHitMarkerPlugin` and apiClient.ts's response
  // interceptor, which is the only writer of this state) — the app must
  // never show that data without this being visible somewhere (see
  // StaleDataBanner.tsx).
  cachedAt: number | null;
  markCacheHit: () => void;
  markFresh: () => void;
}

export const useCacheStatusStore = create<CacheStatusState>((set) => ({
  cachedAt: null,
  markCacheHit: () => set({ cachedAt: Date.now() }),
  markFresh: () => set({ cachedAt: null }),
}));
