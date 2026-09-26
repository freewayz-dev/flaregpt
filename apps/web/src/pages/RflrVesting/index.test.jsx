import { describe, it, expect } from "vitest";

import RflrVesting from "@/pages/RflrVesting";
import { renderWithProviders, screen } from "@/test/test-utils";
import { TEST_ADDRESSES } from "@/test/fixtures";

describe("RflrVesting", () => {
  it("prompts to connect/select a wallet with no active wallet", async () => {
    renderWithProviders(<RflrVesting />);
    expect(
      await screen.findByText("Connect or select a wallet to see its vesting status."),
    ).toBeInTheDocument();
    // The exact regression this protects: this page must never render
    // "no rFLR rewards yet" (a real, resolved answer about a real wallet)
    // when the truth is simply "no wallet is active to ask about."
    expect(screen.queryByText("No rFLR Rewards Yet")).not.toBeInTheDocument();
  });

  it("shows real vesting progress once a wallet is active, not the empty state", async () => {
    renderWithProviders(<RflrVesting />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    expect(await screen.findByText("Vesting Progress")).toBeInTheDocument();
    expect(
      screen.queryByText("Connect or select a wallet to see its vesting status."),
    ).not.toBeInTheDocument();
  });
});
