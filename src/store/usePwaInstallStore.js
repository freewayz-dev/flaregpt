import { create } from "zustand";
import { persist } from "zustand/middleware";

// "Snooze," not "dismiss forever" — a gentle reminder that backs off for a
// while rather than disappearing for good. Three days covers a typical
// return visit; three visits covers someone who comes back more often but
// wouldn't otherwise see three days pass. Whichever comes first ends the
// snooze, and the banner behaves exactly as if it had never been
// dismissed until the next time it actually is.
const SNOOZE_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
const SNOOZE_VISIT_THRESHOLD = 3;



export const usePwaInstallStore = create()(
  persist(
    (set, get) => ({
      deferredPrompt: null,
      isInstalled: false,
      installBannerDismissedAt: null,
      installBannerVisitsSinceDismiss: 0,

      setDeferredPrompt: (event) => set({ deferredPrompt: event }),

      setInstalled: (installed) =>
        set({ isInstalled: installed, deferredPrompt: installed ? null : get().deferredPrompt }),

      dismissInstallBanner: () =>
        set({ installBannerDismissedAt: Date.now(), installBannerVisitsSinceDismiss: 0 }),

      // Called once per app launch (see InstallAppBanner's mount effect) —
      // a no-op unless the banner is currently snoozed. Counts this visit
      // and, the moment either exit condition is met, clears the snooze
      // entirely rather than just resetting the counter — so the banner
      // goes back to behaving exactly like a never-dismissed one (shown on
      // this and every later visit) until the user dismisses it again.
      registerInstallBannerVisit: () => {
        const { installBannerDismissedAt } = get();
        if (installBannerDismissedAt === null) return;

        const visits = get().installBannerVisitsSinceDismiss + 1;
        const elapsed = Date.now() - installBannerDismissedAt;
        const snoozeExpired = elapsed >= SNOOZE_DURATION_MS || visits >= SNOOZE_VISIT_THRESHOLD;

        set(
          snoozeExpired
            ? { installBannerDismissedAt: null, installBannerVisitsSinceDismiss: 0 }
            : { installBannerVisitsSinceDismiss: visits },
        );
      },

      promptInstall: async () => {
        const { deferredPrompt } = get();
        if (!deferredPrompt) return "unavailable";

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        // Spent either way — a `BeforeInstallPromptEvent` can only be
        // prompted once; the browser fires a fresh `beforeinstallprompt`
        // later if the user declines and becomes eligible again.
        set({ deferredPrompt: null, isInstalled: outcome === "accepted" ? true : get().isInstalled });
        return outcome;
      },
    }),
    {
      name: "flaregpt_pwa_install",
      // `isInstalled` is deliberately re-derived fresh on every launch
      // (see usePwaInstallListeners.ts) rather than trusted from a stale
      // persisted value — the same browser profile can have the app
      // uninstalled between sessions, and a stale "true" would hide the
      // install banner forever with no way for the app to notice.
      partialize: (state) => ({
        installBannerDismissedAt: state.installBannerDismissedAt,
        installBannerVisitsSinceDismiss: state.installBannerVisitsSinceDismiss,
      }),
    },
  ),
);
