import { useEffect, type ReactElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useConnect, useConnectors } from "wagmi";
import { MemoryRouter } from "react-router";
import { ToastContainer } from "react-toastify";
import { render, type RenderOptions } from "@testing-library/react";

import { createTestWagmiConfig } from "@/test/mocks/wagmi";
import type { MockParameters } from "wagmi/connectors";

// Drives a real connect through wagmi's own useConnect() on mount, against
// the mock connector — see mocks/wagmi.js for why this is used instead of
// the mock connector's own (non-functional-in-practice) `defaultConnected`
// feature. Connecting is genuinely async here, same as it would be for a
// real wallet; callers assert with `findBy*`/`waitFor`, not a synchronous
// query, immediately after render.
//
// `mutate`/`useConnectors()` here, not useConnect()'s own deprecated
// `connect`/`connectors` — matches the exact pattern already established
// in the real app (see ConnectWalletModal.jsx).
function AutoConnect({ children }: { children: ReactNode }) {
  const { mutate: connect } = useConnect();
  const connectors = useConnectors();
  useEffect(() => {
    if (connectors[0]) connect({ connector: connectors[0] });
    // Intentionally fire once on mount only — this exists purely to seed
    // a starting connection state for a test, not to react to connector
    // list changes afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return children;
}

// A fresh QueryClient per render — never the app's real one from
// main.jsx. Production retries once and refetches on window focus
// (see src/hooks/queries/resilience.js); both are exactly what makes
// tests slow and occasionally flaky (a retry adds real delay, a
// focus-triggered refetch can fire mid-assertion), so both are off here.
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
    },
  });
}

// Shared render wrapper — QueryClientProvider + a mocked WagmiProvider +
// MemoryRouter (BrowserRouter needs a real browser URL bar; MemoryRouter
// is the standard router-testing substitute, and lets each test start at
// whatever route it needs via `initialEntries`) + a real ToastContainer,
// mirroring main.jsx's own tree exactly rather than only the pieces a test
// happens to assert on. Its absence here is what let a genuine react-
// toastify + React 19 incompatibility (an uncaught crash the instant any
// toast rendered — see git history) sail through every test in this suite
// undetected: `toast.error(...)`/`toast.success(...)` calls succeeded at
// the call-site every time (queuing an event), but nothing was ever
// mounted to actually render one. A real ToastContainer here means any
// test that triggers a toast now actually exercises that render path.
//
interface RenderWithProvidersWagmiOptions {
  connected?: boolean;
  address?: string;
  features?: MockParameters["features"];
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  route?: string;
  initialEntries?: string[];
  wagmi?: RenderWithProvidersWagmiOptions;
  queryClient?: QueryClient;
}

// `wagmi` options are forwarded to createTestWagmiConfig (see
// src/test/mocks/wagmi.ts) — e.g. `renderWithProviders(<Page />, {
// wagmi: { connected: true, address: "0x..." } })` to simulate an
// already-connected wallet (await a `findBy*` query afterward — see
// AutoConnect above for why this can't be synchronous).
export function renderWithProviders(
  ui: ReactElement,
  { route = "/", initialEntries, wagmi, queryClient, ...renderOptions }: RenderWithProvidersOptions = {},
) {
  const { connected, ...wagmiConfigOptions } = wagmi ?? {};
  const testQueryClient = queryClient ?? createTestQueryClient();
  const wagmiConfig = createTestWagmiConfig(wagmiConfigOptions);

  function Wrapper({ children }: { children: ReactNode }) {
    const content = connected ? <AutoConnect>{children}</AutoConnect> : children;
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={testQueryClient}>
          <MemoryRouter initialEntries={initialEntries ?? [route]}>
            <ToastContainer />
            {content}
          </MemoryRouter>
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
    wagmiConfig,
  };
}

// Re-exported so test files only ever need one import source
// (`@/test/test-utils`) instead of also reaching into
// `@testing-library/react` directly.
export * from "@testing-library/react";
