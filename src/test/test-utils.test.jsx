import { describe, it, expect } from "vitest";
import { useConnection } from "wagmi";

import { renderWithProviders, screen } from "@/test/test-utils";
import { TEST_ADDRESSES } from "@/test/fixtures";

// Phase 0 smoke test for the shared render wrapper itself — proves
// QueryClientProvider, the mocked WagmiProvider, and MemoryRouter all
// mount together correctly, and that `wagmi.connected`/`wagmi.address`
// options actually reach the rendered component via wagmi's real
// `useConnection` hook. Phase 1 is what actually exercises this against
// real wallet-gated pages.
function WalletProbe() {
  const { isConnected, address } = useConnection();
  return <p>{isConnected ? `Connected: ${address}` : "Disconnected"}</p>;
}

describe("renderWithProviders", () => {
  it("reports disconnected by default", () => {
    renderWithProviders(<WalletProbe />);
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });

  it("simulates an already-connected wallet via the mock connector", async () => {
    // Connecting is genuinely async (real `connect()` driven through
    // useConnect() — see AutoConnect in test-utils.jsx), so this awaits
    // rather than asserting synchronously right after render.
    const address = TEST_ADDRESSES.watchlist;
    renderWithProviders(<WalletProbe />, { wagmi: { connected: true, address } });
    expect(await screen.findByText(`Connected: ${address}`)).toBeInTheDocument();
  });
});
