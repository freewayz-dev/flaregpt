import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useQueryClient } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";

import BlueLightOverlay from "./components/common/BlueLightOverlay";
import ErrorFallback from "./components/common/ErrorFallback";
import AppRoutes from "./routes/AppRoutes";
import { useUIStore } from "./store/useUIStore";
import { useAuthSync } from "./hooks/useAuthSync";
import { useWatchlistSync } from "./hooks/useWatchlistSync";

function App() {
  const reduceMotionOverride = useUIStore((state) => state.reduceMotionOverride);
  const queryClient = useQueryClient();

  // Mounted at the app root, not inside DashboardLayout: wagmi's connection
  // state is global, and a wallet can be connected from the landing page
  // (before DashboardLayout ever renders) just as easily as from inside
  // the dashboard. Scoping this to DashboardLayout would leave the sign-in
  // flow un-mounted for that entire path, relying on the landing page's
  // own post-connect redirect to eventually reach it rather than reacting
  // the moment a wallet actually connects.
  useAuthSync();
  // Same mount point as useAuthSync — the guest -> account watchlist merge
  // (see useWatchlistSync.js) needs to react to a sign-in wherever it
  // happens, not just from inside the dashboard.
  useWatchlistSync();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      const { hasThemeOverride } = useUIStore.getState();

      // Follow OS only until the user manually changes the theme.
      if (!hasThemeOverride) {
        document.documentElement.classList.toggle("dark", e.matches);

        useUIStore.setState({
          darkMode: e.matches,
        });
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return (
    // This is the last-resort boundary — anything that crashes above
    // DashboardLayout's own page-level boundary (see there for the more
    // common case) lands here, so recovery has to assume the *entire*
    // React tree's state is suspect, not just one page's data.
    //
    // `resetErrorBoundary` by itself only clears this boundary's own
    // caught-error flag and remounts the same children — it does nothing
    // about whatever state actually caused the crash. If a stale/corrupt
    // react-query cache entry was the culprit, the remounted tree reads
    // the exact same bad entry and crashes again immediately, which reads
    // as "the recovery button doesn't do anything" (the reported bug this
    // is fixing). `onReset` clears the query cache first, so "Try again"
    // gets a genuinely fresh start instead of re-triggering the same crash.
    <ErrorBoundary
      FallbackComponent={(props) => <ErrorFallback {...props} variant="root" />}
      onReset={() => queryClient.clear()}
      onError={(error, info) => {
        console.error("[ErrorBoundary:root]", error, info?.componentStack);
      }}
    >
      {/* "user" (the default) makes every Framer Motion animation app-wide
          respect the OS's prefers-reduced-motion automatically, rather
          than each accordion/transition needing its own opt-in.
          `reduceMotionOverride` (Settings > Accessibility) forces "always"
          on top of that for someone whose OS has no such preference set
          but still wants this app specifically to cut its animations —
          additive to the OS default, not a replacement for it. */}
      <MotionConfig reducedMotion={reduceMotionOverride ? "always" : "user"}>
        <BlueLightOverlay />
        <AppRoutes />
      </MotionConfig>
    </ErrorBoundary>
  );
}

export default App;
