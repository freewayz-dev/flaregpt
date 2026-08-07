import { useEffect } from "react";

import { usePwaInstallStore } from "@/store/usePwaInstallStore";
import { isStandaloneDisplayMode } from "@/utils/platform";

// Mounted once from App.tsx — same reasoning as useAuthSync/
// useWatchlistSync there: `beforeinstallprompt` can fire at any point
// during this SPA's one real page load, on the landing page just as
// easily as inside /app, so the listener has to exist for the whole
// session rather than only while some particular route is mounted, or
// the event (which the browser only offers once per eligible page load)
// would be missed entirely for a user who lands anywhere else first.
export function usePwaInstallListeners() {
  useEffect(() => {
    const { setDeferredPrompt, setInstalled } = usePwaInstallStore.getState();

    // Covers the case where the app is already installed and launched
    // from its home-screen/app-list icon — `beforeinstallprompt` never
    // fires at all in that case (there's nothing left to install), so
    // this is the only signal this state exists.
    setInstalled(isStandaloneDisplayMode());

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      // The browser's own mini-infobar/install-UI is suppressed by
      // default here — this app shows its own (InstallAppBanner.tsx +
      // the Settings > About row) so the moment and styling of the
      // prompt matches the rest of the product instead of a bare browser
      // chrome element.
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
    };

    // Chromium fires `beforeinstallprompt` again for browsers that support
    // it, but window-controls-overlay/standalone can also become true via
    // an OS-level install path this app never showed UI for (e.g. Chrome's
    // own omnibox install icon) — the media-query listener catches that
    // regardless of which path the user took.
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    displayModeQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      displayModeQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);
}
