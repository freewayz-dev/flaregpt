import { describe, it, expect, afterEach } from "vitest";

import DataStorage from "@/pages/Settings/tabs/DataStorage";
import { useAuthStore } from "@/store/useAuthStore";
import { renderWithProviders, screen } from "@/test/test-utils";
import { TEST_ADDRESSES } from "@/test/fixtures";

describe("DataStorage — offline", () => {
  const originalOnLine = window.navigator.onLine;

  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true });
  });

  it("disables clearing synced conversations while offline, but not the local wallet-cache clear", async () => {
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    renderWithProviders(<DataStorage />);

    const clearButtons = await screen.findAllByRole("button", { name: "Clear" });
    // Local Data's own "Clear" (wallet-activity cache — no network at all)
    // renders first; Account Data's "Clear" (FlareGPT Conversations, a real
    // NetworkOnly backend call) renders second — see DataStorage.tsx's own
    // two-Card layout.
    const [clearLocalCache, clearConversations] = clearButtons;
    expect(clearLocalCache).toBeEnabled();
    expect(clearConversations).toBeDisabled();
    expect(clearConversations).toHaveAttribute("title", "You're offline. This needs an internet connection.");
  });

  it("both Clear buttons are enabled while online", async () => {
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderWithProviders(<DataStorage />);

    const clearButtons = await screen.findAllByRole("button", { name: "Clear" });
    for (const button of clearButtons) {
      expect(button).toBeEnabled();
    }
  });
});
