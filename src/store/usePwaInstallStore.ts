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

interface PwaInstallState {
  // The captured `beforeinstallprompt` event — genuinely only exists for
  // the lifetime of one page load and can't be serialized, so it's
  // deliberately excluded from persistence below (see `partialize`).
  // `.prompt()` can only ever be called once per captured event; after
  // that the browser requires a fresh one, which is exactly the shape
  // `promptInstall` below relies on (clears it after use).
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  // null = not currently snoozed — either never dismissed, or a previous
  // snooze already ran out and was cleared (see registerInstallBannerVisit
  // below). Non-null = dismissed at this timestamp; still snoozed until
  // either SNOOZE_DURATION_MS has elapsed or
  // installBannerVisitsSinceDismiss reaches SNOOZE_VISIT_THRESHOLD. The
  // Settings > About row (always present, never auto-shown) remains the
  // permanent fallback for anyone who wants to install sooner than that.
  installBannerDismissedAt: number | null;
  installBannerVisitsSinceDismiss: number;

  setDeferredPrompt: (event: BeforeInstallPromptEvent | null) => void;
  setInstalled: (installed: boolean) => void;
  dismissInstallBanner: () => void;
  registerInstallBannerVisit: () => void;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

export const usePwaInstallStore = create<PwaInstallState>()(
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
