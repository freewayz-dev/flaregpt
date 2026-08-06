import { describe, it, expect } from "vitest";

import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useAuthStore } from "@/store/useAuthStore";
import { renderWithProviders, screen } from "@/test/test-utils";
import { TEST_ADDRESSES } from "@/test/fixtures";

function AuthStatusProbe() {
  const { hasSession, isCurrentWalletSignedIn } = useAuthStatus();
  return (
    <p>
      hasSession: {String(hasSession)}, isCurrentWalletSignedIn: {String(isCurrentWalletSignedIn)}
    </p>
  );
}

// isCurrentWalletSignedIn is the exact derivation the interceptor's
// mismatch guard (see apiClient.test.js) is also protecting — this covers
// it directly at the hook level, independent of any actual network call.
describe("useAuthStatus — isCurrentWalletSignedIn", () => {
  it("is false when never signed in", async () => {
    renderWithProviders(<AuthStatusProbe />);
    expect(
      await screen.findByText("hasSession: false, isCurrentWalletSignedIn: false"),
    ).toBeInTheDocument();
  });

  it("is false when signed in but the wallet is disconnected", async () => {
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    renderWithProviders(<AuthStatusProbe />);
    expect(
      await screen.findByText("hasSession: true, isCurrentWalletSignedIn: false"),
    ).toBeInTheDocument();
  });

  it("is false when signed in but a different wallet is now connected", async () => {
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    renderWithProviders(<AuthStatusProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.watchlist },
    });
    expect(
      await screen.findByText("hasSession: true, isCurrentWalletSignedIn: false"),
    ).toBeInTheDocument();
  });

  it("is true when signed in and connected as the exact same wallet", async () => {
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    renderWithProviders(<AuthStatusProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });
    expect(
      await screen.findByText("hasSession: true, isCurrentWalletSignedIn: true"),
    ).toBeInTheDocument();
  });
});
