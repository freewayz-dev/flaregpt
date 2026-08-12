import { describe, it, expect } from "vitest";

import WalletActivity from "@/pages/WalletActivity";
import { renderWithProviders, screen } from "@/test/test-utils";
import { TEST_ADDRESSES } from "@/test/fixtures";

// The exact regression this app shipped with: no active wallet showing
// "No activity yet. This wallet has no indexed transactions." — a message
// that means "we asked and there's genuinely nothing," not "we never
// asked because nothing is connected." These two states must never be
// interchangeable.
describe("WalletActivity", () => {
  it("shows the connect-wallet empty state with no active wallet, not the no-activity one", async () => {
    renderWithProviders(<WalletActivity />);
    expect(
      await screen.findByText("Connect or select a wallet to see its transaction activity."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No activity yet")).not.toBeInTheDocument();
  });

  it("queries real activity once a wallet is active, showing the no-activity state rather than the connect-wallet one", async () => {
    renderWithProviders(<WalletActivity />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    expect(await screen.findByText("No activity yet")).toBeInTheDocument();
    expect(
      screen.queryByText("Connect or select a wallet to see its transaction activity."),
    ).not.toBeInTheDocument();
  });
});
