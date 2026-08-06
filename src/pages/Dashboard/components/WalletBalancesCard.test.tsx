import { describe, it, expect } from "vitest";

import WalletBalancesCard from "@/pages/Dashboard/components/WalletBalancesCard";
import { renderWithProviders, screen } from "@/test/test-utils";
import { TEST_ADDRESSES } from "@/test/fixtures";

// Representative Overview card — Dashboard has no single page-level gate,
// each card self-gates independently via useDerivedWalletHub, so this one
// (the simplest of them) stands in for "Overview" as a whole.
describe("WalletBalancesCard", () => {
  it("shows the connect-wallet empty state with no active wallet", async () => {
    renderWithProviders(<WalletBalancesCard />);
    expect(
      await screen.findByText("Connect or add a wallet in Settings to see balances."),
    ).toBeInTheDocument();
  });

  it("shows real balances once a wallet is active, not the empty state", async () => {
    renderWithProviders(<WalletBalancesCard />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    expect(await screen.findByText("FLR")).toBeInTheDocument();
    expect(
      screen.queryByText("Connect or add a wallet in Settings to see balances."),
    ).not.toBeInTheDocument();
  });
});
