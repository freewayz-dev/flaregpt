import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent } from "@testing-library/react";

import { useAuthStatus } from "@/hooks/useAuthStatus";
import { signIn as signInMock } from "@/hooks/useAuthSync";
import { useAuthStore } from "@/store/useAuthStore";
import { renderWithProviders, screen } from "@/test/test-utils";
import { TEST_ADDRESSES } from "@/test/fixtures";

// Hoisted, so it replaces the module before useAuthStatus.ts's own named
// import of `signIn` resolves — a plain `vi.spyOn` on a namespace import
// doesn't reliably intercept another module's already-bound named-import
// reference under Vitest's ESM transform, confirmed by trying it first.
// Only `signIn` is mocked; every other export (used by useAuthSync.test.tsx
// via the real module) passes through untouched.
vi.mock("@/hooks/useAuthSync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useAuthSync")>();
  return { ...actual, signIn: vi.fn().mockResolvedValue(undefined) };
});

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

function SignInButtonProbe() {
  const { signIn, isConnected } = useAuthStatus();
  return (
    <>
      <p>isConnected: {String(isConnected)}</p>
      <button type="button" onClick={() => signIn()}>
        Sign In
      </button>
    </>
  );
}

// Regression coverage for useAuthSync.ts's connector-aware signing timeout
// (getSignTimeoutMs): it can only pick the right budget for the wallet
// that's actually connected if useAuthStatus's own manual `signIn` action
// actually threads the live connector's id through to useAuthSync's
// `signIn` export, rather than always calling it with no connector id
// (which would silently fall back to the generic 30s budget for every
// wallet, including MetaMask/WalletConnect, defeating the whole point).
describe("useAuthStatus — signIn() passes the connected wallet's connector id through", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls useAuthSync's signIn with the live connector's id, not undefined", async () => {
    const signInSpy = vi.mocked(signInMock);

    renderWithProviders(<SignInButtonProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    await screen.findByText("isConnected: true");
    fireEvent.click(screen.getByText("Sign In"));

    await vi.waitFor(() => expect(signInSpy).toHaveBeenCalled());
    const [address, , connectorId] = signInSpy.mock.calls[0]!;
    expect(address).toBe(TEST_ADDRESSES.primary);
    // The exact id doesn't matter here as much as the fact that a real,
    // non-empty id from the actually-connected mock wallet made it through
    // — this is what getSignTimeoutMs needs to pick a connector-specific
    // budget instead of silently defaulting for every wallet.
    expect(typeof connectorId).toBe("string");
    expect(connectorId).toBeTruthy();
  });
});
