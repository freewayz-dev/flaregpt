import { describe, it, expect } from "vitest";
import userEvent from "@testing-library/user-event";

import WalletTrackingBanner from "@/pages/Dashboard/components/WalletTrackingBanner";
import { useAddWalletModalStore } from "@/store/useAddWalletModalStore";
import { useWalletHubStore } from "@/store/useWalletHubStore";
import { useUIStore } from "@/store/useUIStore";
import { renderWithProviders, screen } from "@/test/test-utils";
import { TEST_ADDRESSES } from "@/test/fixtures";

// The one, single "add a wallet to track" entry point at the top of
// Overview — see the component's own comment for why this replaced the
// per-card actions previously scattered across WalletBalancesCard,
// FtsoPortfolioCard, etc. Two states: a prominent call-to-action with no
// active wallet, a quiet "Manage your wallets" pointer once one exists.
describe("WalletTrackingBanner", () => {
  it("shows the prominent call-to-action with no active wallet", async () => {
    renderWithProviders(<WalletTrackingBanner />);

    expect(await screen.findByText("Track any Flare wallet")).toBeInTheDocument();
    expect(screen.getByText("+ Track a wallet")).toBeInTheDocument();
    expect(screen.queryByText("Manage your wallets →")).not.toBeInTheDocument();
  });

  it("opens the shared add-wallet modal when the call-to-action is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WalletTrackingBanner />);

    await user.click(await screen.findByText("+ Track a wallet"));

    expect(useAddWalletModalStore.getState().isOpen).toBe(true);
  });

  it("shows the quiet 'manage your wallets' pointer once a wallet is connected, not the CTA", async () => {
    renderWithProviders(<WalletTrackingBanner />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    expect(await screen.findByText("Manage your wallets →")).toBeInTheDocument();
    expect(screen.getByText("Add more wallets to your watchlist anytime.")).toBeInTheDocument();
    expect(screen.queryByText("Track any Flare wallet")).not.toBeInTheDocument();
    expect(screen.queryByText("+ Track a wallet")).not.toBeInTheDocument();
  });

  it("shows the same quiet pointer for a guest's active tracked (not connected) wallet", async () => {
    useWalletHubStore.setState({
      trackedWallets: [{ address: TEST_ADDRESSES.watchlist, label: "My Watchlist Wallet" }],
      activeAddress: TEST_ADDRESSES.watchlist,
    });

    renderWithProviders(<WalletTrackingBanner />);

    expect(await screen.findByText("Manage your wallets →")).toBeInTheDocument();
  });

  it("clicking 'Manage your wallets' switches the Settings tab to Wallets", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WalletTrackingBanner />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    await user.click(await screen.findByText("Manage your wallets →"));

    expect(useUIStore.getState().settingsActiveTab).toBe("Wallets");
  });
});
