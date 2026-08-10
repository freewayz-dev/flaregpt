import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";

import { useAuthSync, logout } from "@/hooks/useAuthSync";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useDisconnectAllWallets } from "@/hooks/useDisconnectAllWallets";
import { useAuthStore } from "@/store/useAuthStore";
import { useConnection } from "wagmi";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { MOCK_AUTH_TOKEN } from "@/test/mocks/handlers";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";

function AuthSyncProbe() {
  useAuthSync();
  const token = useAuthStore((s) => s.token);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);
  return (
    <div>
      <p>token: {token || "(none)"}</p>
      <p>isAuthenticating: {String(isAuthenticating)}</p>
    </div>
  );
}

// The most complex piece of auth logic in the app, and — before this —
// never exercised end-to-end. A real connect (via the existing mock-wagmi
// AutoConnect path) should automatically drive nonce -> sign -> verify ->
// session, exactly like a real wallet connecting for the first time.
describe("useAuthSync — automatic sign-in ceremony", () => {
  it("creates a session automatically after a wallet connects", async () => {
    renderWithProviders(<AuthSyncProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    expect(await screen.findByText(`token: ${MOCK_AUTH_TOKEN}`)).toBeInTheDocument();
  });

  it("does not create a session when the signature is rejected", async () => {
    let nonceRequests = 0;
    server.use(
      http.post(`${API}/api/v1/auth/nonce`, () => {
        nonceRequests += 1;
        return HttpResponse.json({ message: "Sign this message: test-nonce" });
      }),
    );

    renderWithProviders(<AuthSyncProbe />, {
      wagmi: {
        connected: true,
        address: TEST_ADDRESSES.primary,
        features: { signMessageError: true },
      },
    });

    // Waiting on concrete signals (the nonce request actually happened,
    // then isAuthenticating settling back to false once the rejected
    // signature's catch block runs) rather than racing to catch a
    // transient "isAuthenticating: true" text that could easily flip back
    // before a query gets a chance to see it.
    await waitFor(() => expect(nonceRequests).toBeGreaterThan(0));
    await waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(false));
    expect(useAuthStore.getState().token).toBeNull();

    // A rejection is an ordinary, expected outcome — it must read
    // differently from a genuine failure (see the test below), not share
    // the same generic wording.
    expect(await screen.findByText("Sign-in cancelled.")).toBeInTheDocument();
    expect(screen.queryByText("Sign-in failed. Try again.")).not.toBeInTheDocument();
  });
});

// Regression coverage for the bug reported live: every failure — a real
// backend error, a malformed request, or a normal wallet rejection — was
// swallowed by a bare `catch {}` and shown as the identical generic
// "Sign-in failed. Try again." toast, with the real cause never logged
// anywhere. These tests would have failed before that fix: the error-log
// assertion had nothing to check (nothing was ever logged), and the
// rejection case above would have shown the same generic text as this one
// instead of its own distinct message.
describe("useAuthSync — a genuine failure is never mistaken for a rejection", () => {
  it("logs the real underlying error and shows the generic failure toast", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.post(`${API}/api/v1/auth/verify`, () => HttpResponse.error()));

    renderWithProviders(<AuthSyncProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    expect(await screen.findByText("Sign-in failed. Try again.")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
    // The real cause (a network/axios error from the verify call, not a
    // wallet rejection) must actually be preserved somewhere, not just
    // discarded once the generic toast is shown.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[useAuthSync] sign-in failed",
      expect.anything(),
    );

    consoleErrorSpy.mockRestore();
  });
});

function SignInButtonProbe() {
  useAuthSync();
  const { signIn, isAuthenticating } = useAuthStatus();
  const token = useAuthStore((s) => s.token);
  return (
    <div>
      <p>token: {token || "(none)"}</p>
      <p>isAuthenticating: {String(isAuthenticating)}</p>
      <button onClick={() => signIn()}>Sign In</button>
    </div>
  );
}

// The single most important guarantee the reported bug called into
// question: a failed attempt must never leave the app stuck unable to try
// again. `isAuthenticating` is the only guard `attemptSignIn` checks
// before running, and it's reset in the same `catch` that shows the
// failure toast — this drives that exact path through the real "Sign In"
// button (via useAuthStatus, same as Navbar/Sidebar use) rather than
// asserting on the store in isolation.
describe("useAuthSync — a failed attempt does not poison the next one", () => {
  it("lets a manual retry through the real Sign In button succeed after the automatic attempt failed", async () => {
    let nonceRequests = 0;
    server.use(
      http.post(`${API}/api/v1/auth/nonce`, () => {
        nonceRequests += 1;
        if (nonceRequests === 1) return HttpResponse.error();
        return HttpResponse.json({ message: "Sign this message: test-nonce" });
      }),
    );

    renderWithProviders(<SignInButtonProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    // The automatic effect's first attempt fails against the network error
    // above.
    await waitFor(() => expect(nonceRequests).toBe(1));
    await waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(false));
    expect(useAuthStore.getState().token).toBeNull();

    // Retrying through the same button a real user would click must not be
    // blocked by any state left over from the failed attempt.
    fireEvent.click(screen.getByText("Sign In"));

    expect(await screen.findByText(`token: ${MOCK_AUTH_TOKEN}`)).toBeInTheDocument();
  });

  it("lets switching to a different, working wallet succeed after the first one failed", async () => {
    server.use(
      http.post(`${API}/api/v1/auth/nonce`, () =>
        HttpResponse.json({ message: "Sign this message: test-nonce" }),
      ),
    );

    // First wallet: signing itself fails (not a rejection — a genuine
    // provider error), same as the earlier scenario but from the wallet
    // side instead of the network.
    const { unmount } = renderWithProviders(<SignInButtonProbe />, {
      wagmi: {
        connected: true,
        address: TEST_ADDRESSES.primary,
        features: { signMessageError: new Error("Wallet communication error") },
      },
    });

    await waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(false));
    expect(useAuthStore.getState().token).toBeNull();
    unmount();

    // A different wallet (different address, no signing failure) connecting
    // afterward must authenticate cleanly — nothing from the first wallet's
    // failed attempt should carry over.
    renderWithProviders(<SignInButtonProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.watchlist },
    });

    expect(await screen.findByText(`token: ${MOCK_AUTH_TOKEN}`)).toBeInTheDocument();
    expect(useAuthStore.getState().authenticatedAddress).toBe(TEST_ADDRESSES.watchlist);
  });
});

// Regression coverage for the wallet-switch security requirement: a
// session established for Wallet A must never keep reading as valid once
// Wallet B is the one actually connected. apiClient.ts's own request
// interceptor already refuses to attach a mismatched-wallet token to any
// outgoing request (backend-facing requests were never actually at risk —
// see its own comment) — these tests cover the *frontend-visible* state
// (`token`/`hasSession`), which is what a UI gating on "am I signed in"
// (Settings' Wallets tab, Navbar's status pill) actually reads.
describe("useAuthSync — switching wallets never inherits the previous session", () => {
  it("clears Wallet A's session as soon as Wallet B connects, before Wallet B's own sign-in resolves", async () => {
    // Wallet A already has a real, completed session from an earlier
    // action — not something this render performs, deliberately, so this
    // test starts from exactly the state a real wallet switch starts from.
    useAuthStore.setState({ token: MOCK_AUTH_TOKEN, authenticatedAddress: TEST_ADDRESSES.primary });

    // Held open so the assertion below can observe the state *between*
    // Wallet B connecting and Wallet B's sign-in actually completing —
    // the exact window the fix closes synchronously rather than leaving
    // to some later request's 401 to clean up.
    let resolveVerify!: () => void;
    server.use(
      http.post(`${API}/api/v1/auth/nonce`, () =>
        HttpResponse.json({ message: "Sign this message: test-nonce" }),
      ),
      http.post(`${API}/api/v1/auth/verify`, async () => {
        await new Promise<void>((resolve) => {
          resolveVerify = resolve;
        });
        return HttpResponse.json({ token: "wallet-b-token" });
      }),
    );

    // Wallet B — a genuinely different address — is what actually connects.
    renderWithProviders(<AuthSyncProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.watchlist },
    });

    // Wallet A's token must already be gone well before Wallet B's own
    // verify call ever resolves — this is the one assertion that would
    // fail without the fix (the store previously kept Wallet A's token
    // right up until *some* request happened to 401 and clear it).
    await waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(true));
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().authenticatedAddress).toBeNull();

    resolveVerify();

    await waitFor(() =>
      expect(useAuthStore.getState().authenticatedAddress).toBe(TEST_ADDRESSES.watchlist),
    );
    expect(useAuthStore.getState().token).toBe("wallet-b-token");
  });

  it("still requires Wallet B to sign its own message — never silently authenticates it as Wallet A", async () => {
    useAuthStore.setState({ token: MOCK_AUTH_TOKEN, authenticatedAddress: TEST_ADDRESSES.primary });
    let nonceRequests = 0;
    server.use(
      http.post(`${API}/api/v1/auth/nonce`, () => {
        nonceRequests += 1;
        return HttpResponse.json({ message: "Sign this message: test-nonce" });
      }),
    );

    renderWithProviders(<AuthSyncProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.watchlist },
    });

    // A real nonce request for Wallet B is the proof it was actually asked
    // to sign — nothing here is a special-case "same token, new address"
    // shortcut.
    await waitFor(() => expect(nonceRequests).toBeGreaterThan(0));
    await waitFor(() => expect(useAuthStore.getState().authenticatedAddress).toBe(TEST_ADDRESSES.watchlist));
    expect(useAuthStore.getState().token).toBe(MOCK_AUTH_TOKEN);
  });

  it("if Wallet B cancels its signature, it stays connected but unauthenticated — never falls back to Wallet A's stale session", async () => {
    useAuthStore.setState({ token: MOCK_AUTH_TOKEN, authenticatedAddress: TEST_ADDRESSES.primary });

    renderWithProviders(<AuthSyncProbe />, {
      wagmi: {
        connected: true,
        address: TEST_ADDRESSES.watchlist,
        features: { signMessageError: true },
      },
    });

    expect(await screen.findByText("Sign-in cancelled.")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().authenticatedAddress).toBeNull();
  });

  it("the same wallet reconnecting with its own still-valid session does not sign again", async () => {
    useAuthStore.setState({ token: MOCK_AUTH_TOKEN, authenticatedAddress: TEST_ADDRESSES.primary });
    let nonceRequests = 0;
    server.use(
      http.post(`${API}/api/v1/auth/nonce`, () => {
        nonceRequests += 1;
        return HttpResponse.json({ message: "Sign this message: test-nonce" });
      }),
    );

    renderWithProviders(<AuthSyncProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    // Same wallet, already-valid session — the pre-seeded token must
    // survive untouched, and no nonce request (i.e. no fresh signature
    // prompt) should ever fire for it.
    await screen.findByText(`token: ${MOCK_AUTH_TOKEN}`);
    expect(nonceRequests).toBe(0);
    expect(useAuthStore.getState().token).toBe(MOCK_AUTH_TOKEN);
  });
});

describe("logout()", () => {
  it("clears the local session even when the backend logout call fails", async () => {
    server.use(http.post(`${API}/api/v1/auth/logout`, () => HttpResponse.error()));
    useAuthStore.setState({ token: MOCK_AUTH_TOKEN, authenticatedAddress: TEST_ADDRESSES.primary });

    // logout()'s own comment states this is deliberate: local state clears
    // regardless of whether the network call succeeds. This is the test
    // that keeps it that way.
    await logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().authenticatedAddress).toBeNull();
  });
});

function DisconnectProbe() {
  useAuthSync();
  const { isConnected } = useConnection();
  const disconnectAll = useDisconnectAllWallets();
  return (
    <div>
      <p>connected: {String(isConnected)}</p>
      <button onClick={() => disconnectAll()}>Disconnect</button>
    </div>
  );
}

describe("wallet disconnect", () => {
  it("never clears an existing session — connection and auth are deliberately decoupled", async () => {
    useAuthStore.setState({ token: MOCK_AUTH_TOKEN, authenticatedAddress: TEST_ADDRESSES.primary });

    renderWithProviders(<DisconnectProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });
    await screen.findByText("connected: true");

    fireEvent.click(screen.getByText("Disconnect"));
    await screen.findByText("connected: false");

    expect(useAuthStore.getState().token).toBe(MOCK_AUTH_TOKEN);
    expect(useAuthStore.getState().authenticatedAddress).toBe(TEST_ADDRESSES.primary);
  });

  it("settles cleanly (no hang, no stuck isAuthenticating) when the wallet disconnects mid sign-in", async () => {
    server.use(
      http.post(`${API}/api/v1/auth/verify`, async () => {
        // Holds the in-flight sign-in open long enough for a disconnect to
        // land while `isAuthenticating` is still true, mirroring a user
        // (or the extension itself) tearing down the connection between
        // the signature being produced and the backend confirming it.
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ token: MOCK_AUTH_TOKEN });
      }),
    );

    renderWithProviders(<DisconnectProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    await waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(true));
    fireEvent.click(screen.getByText("Disconnect"));
    await screen.findByText("connected: false");

    // The in-flight attempt must still resolve one way or another — never
    // leave the guard stuck true, which would silently block every future
    // sign-in attempt for the rest of the session.
    await waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(false));
  });
});
