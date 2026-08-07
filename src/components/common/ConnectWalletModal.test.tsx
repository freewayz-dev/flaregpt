import { describe, it, expect, vi, afterEach } from "vitest";

import ConnectWalletModal from "@/components/common/ConnectWalletModal";
import { renderWithProviders, screen } from "@/test/test-utils";

describe("ConnectWalletModal — offline", () => {
  const originalOnLine = window.navigator.onLine;

  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true });
  });

  it("shows an offline notice and disables every wallet button", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    renderWithProviders(<ConnectWalletModal isOpen onClose={vi.fn()} />);

    expect(
      await screen.findByText("You're offline. Connecting a wallet needs an internet connection."),
    ).toBeInTheDocument();

    for (const button of screen.getAllByRole("button")) {
      // The dialog's own Close (×) button must stay usable regardless —
      // only the wallet-picker buttons need a real connection.
      if (button.getAttribute("aria-label") === "Close") continue;
      expect(button).toBeDisabled();
    }
  });

  it("does not show the offline notice or disable wallet buttons while online", async () => {
    renderWithProviders(<ConnectWalletModal isOpen onClose={vi.fn()} />);

    expect(
      screen.queryByText("You're offline. Connecting a wallet needs an internet connection."),
    ).not.toBeInTheDocument();
    expect(await screen.findByText("MetaMask")).toBeInTheDocument();
    const metaMaskButton = screen.getByText("MetaMask").closest("button");
    expect(metaMaskButton).toBeEnabled();
  });
});
