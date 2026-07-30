// src/main.jsx (or src/index.jsx)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { web3Config } from "./config/web3Config.js";
import App from "./App.jsx";
import { initI18n } from "./i18n";
import { retryUpTo } from "./hooks/queries/resilience.js";

import "react-toastify/dist/ReactToastify.css";
import "./index.css";

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