import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ToastContainer } from "react-toastify";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";

import { web3Config } from "./config/web3Config";
import App from "./App";
import { initI18n } from "./i18n";
import { retryUpTo } from "./hooks/queries/resilience";
import { promptForUpdate } from "./components/common/UpdateAvailableToast";
import { logWebVitalsInDev } from "./utils/webVitals";
import { registerUpdatePolling } from "./utils/updatePolling";

import "./index.css";

// Dev-only (see webVitals.ts's own comment on why this can never reach a
// production bundle) — Core Web Vitals logged to this browser's console
// as they're measured, so "is this change actually faster" has a real
// number to check locally instead of a guess.
if (import.meta.env.DEV) {
  logWebVitalsInDev();
}

// Registered from real bundled app code, not the plugin's own auto-
// injected inline <script> (see vite.config.ts's `injectRegister: false`
// comment for why: the CSP's `script-src 'self'` has no `'unsafe-inline'`).
// `updateSW` (this call's return value) is what actually applies a waiting
// update — never called directly from here. `onNeedRefresh` only ever
// *shows* the prompt; `promptForUpdate` owns the decision of when it's
// actually safe to call `updateSW` (see its own comment for why that's not
// the same moment as the user's click). Referencing `updateSW` inside the
// callback before this `const` finishes initializing is safe here — the
// callback is a closure that won't actually run until well after this
// line completes, by which point `updateSW` is assigned.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: () => promptForUpdate(updateSW),
  onRegisteredSW(_swScriptUrl, registration) {
    if (registration) registerUpdatePolling(registration);
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // On by default: a card whose fetch silently failed (or is stuck
      // paused from being offline) while a tab was backgrounded should
      // self-heal the moment the user comes back, rather than sitting
      // stale/broken until they manually refresh. Queries that fetch a
      // large/expensive payload (e.g. useWalletActivityQueries) opt back
      // out individually where a refetch on every tab-refocus isn't worth
      // the backend cost.
      refetchOnWindowFocus: true,
      // Status-aware even as the fallback for queries with no explicit
      // resilience profile of their own (e.g. useConversations,
      // useWatchlist) — a definitive 4xx (most commonly an expired/invalid
      // auth token 401ing) fails the same way every time, so retrying it
      // only delays the error UI a user can actually act on.
      retry: retryUpTo(1),
      // The default `'online'` mode never calls the queryFn at all while
      // `navigator.onLine` is false — confirmed directly in TanStack
      // Query's own source (`canFetch`/`canStart` in query-core's
      // retryer): the fetch attempt is paused before it starts, waiting
      // for the browser's `online` event, rather than rejecting. That's
      // exactly wrong for this app's offline story: src/sw.ts's
      // NetworkFirst routes (financial-reads) are what's actually
      // supposed to decide "network or cache" by racing a short timeout,
      // and they can only do that if the underlying fetch() call is
      // allowed to happen in the first place. With the default mode, a
      // genuinely-offline reload never reaches the service worker at
      // all — every financial card would sit paused/loading forever
      // instead of showing the last cached numbers with StaleDataBanner's
      // "showing cached data" marker. `'offlineFirst'` still pauses
      // *retries* while offline (no pointless retry storm the instant
      // connectivity is confirmed gone), it just lets the first attempt
      // through so the service worker gets its chance.
      networkMode: "offlineFirst",
    },
  },
});

// i18n resources are fetched on demand (see src/i18n/index.js), so we wait
// for the active language to be ready before the first render.
initI18n().then(() => {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <WagmiProvider config={web3Config}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ToastContainer
              position="top-center"
              autoClose={3000}
              theme="light"
              toastClassName="app-toast"
            />
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </WagmiProvider>
    </StrictMode>,
  );
});