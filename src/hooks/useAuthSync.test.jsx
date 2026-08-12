import { describe, it, expect, vi, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { toast } from "react-toastify";

import { useAuthSync, logout, signIn } from "@/hooks/useAuthSync";
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
    let resolveVerify;
    server.use(
      http.post(`${API}/api/v1/auth/nonce`, () =>
        HttpResponse.json({ message: "Sign this message: test-nonce" }),
      ),
      http.post(`${API}/api/v1/auth/verify`, async () => {
        await new Promise((resolve) => {
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

// Regression coverage for the reported "stuck on Signing…" bug: nothing in
// wagmi/viem's own signMessage action bounds how long a wallet's own
// signature request can hang (confirmed by reading @wagmi/core's
// signMessage.ts — a bare `await` on the connector's provider request, no
// timeout anywhere), so a dropped relay or a backgrounded wallet app that
// never resumes the request previously left `isAuthenticating` stuck `true`
// forever with no recovery. These tests drive `signIn` directly with a
// hand-controlled `signMessageAsync` (never resolving, or resolving late)
// rather than through the mock wagmi connector — wagmi's own `mock`
// connector's `signMessageError` feature can only fail synchronously, not
// hang, so it can't exercise a timeout at all. Nothing here renders a
// component (so there's no ToastContainer to assert rendered text against)
// — a direct spy on `toast.error` is the discriminating signal instead.
// `connectedAddress` is set explicitly before each call to mirror what
// useAuthSync's own other effect already does in real use (it always runs
// before the sign-in effect on the same render) — the stale-wallet guard
// added alongside this timeout treats an unset connectedAddress as a
// mismatch, so leaving it out would make every one of these direct calls
// look stale regardless of the timeout logic under test.
describe("useAuthSync — signing timeout", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("gives up after the sign timeout, clears isAuthenticating, and shows a timeout-specific error", async () => {
    const toastErrorSpy = vi.spyOn(toast, "error");
    vi.useFakeTimers();
    useAuthStore.getState().setConnectedAddress(TEST_ADDRESSES.primary);
    // Never resolves — simulates a wallet that never responds (dropped
    // relay, backgrounded app that never resumes the request).
    const hangingSignMessageAsync = vi.fn(() => new Promise(() => {}));

    const signInPromise = signIn(
      TEST_ADDRESSES.primary,
      hangingSignMessageAsync,
    );
    await vi.waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(true));

    // Still waiting just before the timeout — a real, if slow, signature
    // request must not be cut off early.
    await vi.advanceTimersByTimeAsync(29_000);
    expect(useAuthStore.getState().isAuthenticating).toBe(true);

    await vi.advanceTimersByTimeAsync(1_000);
    await signInPromise;

    expect(useAuthStore.getState().isAuthenticating).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
    expect(toastErrorSpy).toHaveBeenCalledWith("Sign-in timed out. Please try again.");
  });

  it("lets a manual retry succeed immediately after a timeout — the guard is not left poisoned", async () => {
    vi.useFakeTimers();
    useAuthStore.getState().setConnectedAddress(TEST_ADDRESSES.primary);
    const hangingSignMessageAsync = vi.fn(() => new Promise(() => {}));

    const timedOutAttempt = signIn(
      TEST_ADDRESSES.primary,
      hangingSignMessageAsync,
    );
    await vi.waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(true));
    await vi.advanceTimersByTimeAsync(30_000);
    await timedOutAttempt;
    expect(useAuthStore.getState().isAuthenticating).toBe(false);

    vi.useRealTimers();
    const workingSignMessageAsync = vi.fn().mockResolvedValue(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1b",
    );
    await signIn(
      TEST_ADDRESSES.primary,
      workingSignMessageAsync,
    );

    expect(useAuthStore.getState().token).toBe(MOCK_AUTH_TOKEN);
  });

  it("a signature that resolves after the timeout must not authenticate — the attempt already gave up", async () => {
    vi.useFakeTimers();
    useAuthStore.getState().setConnectedAddress(TEST_ADDRESSES.primary);
    let resolveSign;
    const lateSignMessageAsync = vi.fn(
      () => new Promise((resolve) => { resolveSign = resolve; }),
    );
    let verifyRequests = 0;
    server.use(
      http.post(`${API}/api/v1/auth/verify`, () => {
        verifyRequests += 1;
        return HttpResponse.json({ token: MOCK_AUTH_TOKEN });
      }),
    );

    const signInPromise = signIn(
      TEST_ADDRESSES.primary,
      lateSignMessageAsync,
    );
    await vi.waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(true));
    await vi.advanceTimersByTimeAsync(30_000);
    await signInPromise;
    expect(useAuthStore.getState().isAuthenticating).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();

    // The wallet finally responds, well after this attempt already gave up
    // — Promise settlement is single-shot (a promise that already rejected
    // via the timeout ignores any later resolve() call), so this must never
    // reach verifySignature/setSession.
    resolveSign(
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb1b",
    );
    await vi.advanceTimersByTimeAsync(0);

    expect(verifyRequests).toBe(0);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("does not authenticate a stale wallet if the connected address changes before its signature resolves", async () => {
    // Starts genuinely matching — Wallet A is the actually-connected wallet
    // when its own sign-in begins, exactly like real use (useAuthSync's
    // other effect sets this before the sign-in effect ever runs).
    useAuthStore.getState().setConnectedAddress(TEST_ADDRESSES.primary);
    let resolveSign;
    const signMessageAsync = vi.fn(
      () => new Promise((resolve) => { resolveSign = resolve; }),
    );

    const signInPromise = signIn(
      TEST_ADDRESSES.primary,
      signMessageAsync,
    );
    await waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(true));

    // The user switched to a different wallet while Wallet A's signature was
    // still pending — connectedAddress (kept in sync by useAuthSync's own
    // other effect during real use) now points elsewhere.
    useAuthStore.getState().setConnectedAddress(TEST_ADDRESSES.watchlist);

    // Wallet A's signature finally comes back — genuinely valid for A, just
    // too late; A is no longer the connected wallet.
    resolveSign(
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc1b",
    );
    await signInPromise;

    expect(useAuthStore.getState().isAuthenticating).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().authenticatedAddress).toBeNull();
  });
});

// Regression coverage for the same root cause as ConnectWalletModal.tsx's
// own connector-aware CONNECT_TIMEOUT_MS: a flat 30s signing budget was
// shorter than either transport's own internal per-request timeout
// (MetaMask's MWPTransport: 60s DEFAULT_REQUEST_TIMEOUT; WalletConnect:
// a minimum five-minute SESSION_REQUEST_EXPIRY — both confirmed by reading
// their installed source), so a genuinely healthy, still-in-progress
// signature request through either could get treated as failed well before
// the wallet itself would have given up.
describe("useAuthSync — signing timeout is connector-aware", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a MetaMask-connected signature taking longer than 30s (but under its own ~65s budget) does not time out", async () => {
    vi.useFakeTimers();
    useAuthStore.getState().setConnectedAddress(TEST_ADDRESSES.primary);
    const hangingSignMessageAsync = vi.fn(() => new Promise(() => {}));

    const signInPromise = signIn(
      TEST_ADDRESSES.primary,
      hangingSignMessageAsync,
      "metaMaskSDK",
    );
    await vi.waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(true));

    // Well past the generic 30s budget — still well under MetaMask's own.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(useAuthStore.getState().isAuthenticating).toBe(true);

    // Let the still-pending attempt settle cleanly so it doesn't leak a
    // dangling timer into the next test.
    await vi.advanceTimersByTimeAsync(10_000);
    await signInPromise;
  });

  it("a MetaMask-connected signature times out once its own ~65s budget elapses", async () => {
    vi.useFakeTimers();
    useAuthStore.getState().setConnectedAddress(TEST_ADDRESSES.primary);
    const hangingSignMessageAsync = vi.fn(() => new Promise(() => {}));

    const signInPromise = signIn(
      TEST_ADDRESSES.primary,
      hangingSignMessageAsync,
      "metaMaskSDK",
    );
    await vi.waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(true));
    await vi.advanceTimersByTimeAsync(65_000);
    await signInPromise;

    expect(useAuthStore.getState().isAuthenticating).toBe(false);
  });

  it("a WalletConnect-connected signature taking longer than MetaMask's budget (but under its own ~120s budget) does not time out", async () => {
    vi.useFakeTimers();
    useAuthStore.getState().setConnectedAddress(TEST_ADDRESSES.primary);
    const hangingSignMessageAsync = vi.fn(() => new Promise(() => {}));

    const signInPromise = signIn(
      TEST_ADDRESSES.primary,
      hangingSignMessageAsync,
      "walletConnect",
    );
    await vi.waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(true));

    await vi.advanceTimersByTimeAsync(100_000);
    expect(useAuthStore.getState().isAuthenticating).toBe(true);

    await vi.advanceTimersByTimeAsync(20_000);
    await signInPromise;
  });

  it("a WalletConnect-connected signature times out once its own ~120s budget elapses", async () => {
    vi.useFakeTimers();
    useAuthStore.getState().setConnectedAddress(TEST_ADDRESSES.primary);
    const hangingSignMessageAsync = vi.fn(() => new Promise(() => {}));

    const signInPromise = signIn(
      TEST_ADDRESSES.primary,
      hangingSignMessageAsync,
      "walletConnect",
    );
    await vi.waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(true));
    await vi.advanceTimersByTimeAsync(120_000);
    await signInPromise;

    expect(useAuthStore.getState().isAuthenticating).toBe(false);
  });

});
