import { describe, it, expect } from "vitest";

import FtsoRewards from "@/pages/FtsoRewards";
import { renderWithProviders, screen } from "@/test/test-utils";
import { TEST_ADDRESSES } from "@/test/fixtures";

describe("FtsoRewards", () => {
  it("shows the connect-wallet empty state with no active wallet", async () => {
    renderWithProviders(<FtsoRewards />);
    expect(
      await screen.findByText("Connect or select a wallet to see its FTSO rewards."),
    ).toBeInTheDocument();
  });

  it("shows real portfolio data once a wallet is active, not the empty state", async () => {
    renderWithProviders(<FtsoRewards />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    expect(await screen.findByText("Test Provider")).toBeInTheDocument();
    expect(
      screen.queryByText("Connect or select a wallet to see its FTSO rewards."),
    ).not.toBeInTheDocument();
  });

  it("shows the delegation's network rank and concentration band as neutral metadata", async () => {
    renderWithProviders(<FtsoRewards />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    // Same styled tag regardless of value (per the Delegation Concentration
    // handoff's own rule — no color/tone difference), just this one live
    // case (see the shared portfolio/ftso mock: network_rank 5,
    // concentration_band "concentrated").
    expect(await screen.findByText("Concentrated · #5")).toBeInTheDocument();
  });
});
