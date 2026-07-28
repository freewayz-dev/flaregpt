import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { MotionConfig } from "framer-motion";

import BlueLightOverlay from "./components/common/BlueLightOverlay";
import AppRoutes from "./routes/AppRoutes";
import { useUIStore } from "./store/useUIStore";
import { useAuthSync } from "./hooks/useAuthSync";
import { useWatchlistSync } from "./hooks/useWatchlistSync";

function App() {
  const reduceMotionOverride = useUIStore((state) => state.reduceMotionOverride);

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

    const handleChange = (e) => {
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
    <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
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

function GlobalErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="p-6 text-center max-w-md mx-auto my-20 border border-red-500/20 bg-red-500/5 rounded-2xl">
      <h2 className="text-sm font-bold text-red-500">
        Something went wrong
      </h2>

      <p className="text-xs text-slate-400 dark:text-zinc-500 font-mono mt-1">
        {error.message}
      </p>

      <button
        onClick={resetErrorBoundary}
        className="mt-4 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold"
      >
        Reload Application Component Context
      </button>
    </div>
  );
}