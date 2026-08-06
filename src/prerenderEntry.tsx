import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { MemoryRouter } from "react-router";
import { ToastContainer } from "react-toastify";

import App from "@/App";
import { initI18n } from "@/i18n";
import { createTestWagmiConfig } from "@/test/mocks/wagmi";

// Loaded through Vite's own `ssrLoadModule` (see prerender.ts) rather than
// executed directly by Node — this file needs JSX/TS transformation and
// `@/`-alias resolution exactly like every other component in the app, and
// duplicating that pipeline by hand instead of reusing Vite's own would be
// exactly the kind of fragile, parallel toolchain this rewrite is trying
// to get away from.
//
// Mirrors main.tsx's real provider tree as closely as possible — same
// QueryClientProvider/WagmiProvider/ToastContainer/App nesting — with two
// deliberate substitutions, both scoped to *how the tree is driven*, not
// *what it renders*:
//
// 1. `createTestWagmiConfig()` (wagmi's own `mock` connector, already
//    proven across the whole Vitest suite) instead of the real
//    `web3Config` (real injected/WalletConnect connectors). Prerendering
//    only ever needs the disconnected-visitor markup — nobody's wallet is
//    connected when a crawler or a fresh visitor first loads the page
//    either way — and constructing a *real* WalletConnect connector
//    eagerly touches IndexedDB/WebSocket/crypto APIs jsdom doesn't (fully)
//    implement, for zero difference in the actual captured output.
// 2. `MemoryRouter` instead of `BrowserRouter`, for the same reason
//    test-utils.tsx uses it: it starts directly at whatever
//    `initialEntries` path is given, no real navigation, history API, or
//    server involved.
export async function renderRoute(path: string): Promise<Root> {
  await initI18n();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const container = document.getElementById("root");
  if (!container) {
    throw new Error("prerenderEntry: no #root element in the seed HTML");
  }

  const root = createRoot(container);
  root.render(
    <WagmiProvider config={createTestWagmiConfig()}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <ToastContainer
            position="top-center"
            autoClose={3000}
            theme="light"
            toastClassName="app-toast"
          />
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </WagmiProvider>,
  );

  return root;
}
