import type { Address } from "viem";
import { useEffect, useRef } from "react";
import { useConnection, useSignMessage } from "wagmi";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";

import { useAuthStore } from "@/store/useAuthStore";
import * as authService from "@/services/authService";

// Tied directly to wagmi's own `useSignMessage()` return type rather than
// hand-typed — its exact shape (context generic, chain-aware overloads)
// isn't worth re-deriving by hand when the real hook already has it.
type SignMessageAsync = ReturnType<typeof useSignMessage>["mutateAsync"];

// EIP-1193's own rejection code (4001) is the most reliable signal — every
// wallet that follows the standard sets it regardless of provider-specific
// wording. `name`/message checks are a fallback for viem's own wrapped
// error shape (`UserRejectedRequestError`) and for wallets that only set
// the message. A rejection is an expected, ordinary outcome (the user
// backed out of the wallet's own approval popup), not a failure — it must
// read differently from a real error below.
function isUserRejectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && (error as { code?: unknown }).code === 4001) return true;
  if ("name" in error && (error as { name?: unknown }).name === "UserRejectedRequestError") {
    return true;
  }
  const message =
    "shortMessage" in error && typeof (error as { shortMessage?: unknown }).shortMessage === "string"
      ? (error as { shortMessage: string }).shortMessage
      : error instanceof Error
        ? error.message
        : "";
  const lower = message.toLowerCase();
  return lower.includes("user rejected") || lower.includes("user denied");
}

// Thrown by withSignTimeout below — distinguished from a real wallet/network
// error so the catch block in attemptSignIn can show a message that's
// actually true ("the wallet never responded") instead of the generic
// failure copy.
class SignInTimeoutError extends Error {
  constructor() {
    super("Sign-in timed out waiting for the wallet to respond.");
    this.name = "SignInTimeoutError";
  }
}

// How long a wallet's own signature request is allowed to hang before this
// flow gives up and lets the user retry. Nothing in wagmi/viem's own
// signMessage action bounds this call (confirmed by reading @wagmi/core's
// signMessage.ts — it's a bare `await` on the connector's provider request,
// no timeout anywhere), and neither does the underlying WalletConnect/
// MetaMask transport from our side — so without this, a dropped relay or a
// backgrounded wallet app that never resumes the request left
// `isAuthenticating` (and the "Signing…" label) stuck forever, with no way
// to recover except a page reload. 30s matches ConnectWalletModal.tsx's own
// CONNECT_TIMEOUT_MS — the same class of "did the wallet app respond" wait,
// so the same user-patience budget applies: long enough for a real approval
// tap plus a slow mobile relay round-trip, short enough that "stuck on
// Signing…" now has a bounded, recoverable end.
const SIGN_MESSAGE_TIMEOUT_MS = 30_000;

// Races `promise` against a timer. Deliberately does NOT cancel `promise`
// itself (there is no cancellation API for a wallet's own signature
// request) — it only stops *this flow* from waiting on it any longer. If
// `promise` later resolves anyway, that resolution lands on a promise
// nothing is still awaiting (Promise.race/manual racing both settle only
// once — a second settlement attempt after the timer already won is a
// standard, safe no-op), so a late signature can never silently continue
// past the point where attemptSignIn already gave up and moved to its catch
// block.
function withSignTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SignInTimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error as Error);
      },
    );
  });
}

// The actual nonce -> sign -> verify -> setSession dance, factored out of
// the effect below so it can also be called directly by a manual "Sign In"
// action (see the exported `signIn`) — connected-but-signed-out is a real,
// reachable state (right after logout, or after switching to a wallet
// with no session of its own), and the user needs a way to trigger this
// without waiting for a connection event that isn't going to happen again.
//
// The `isAuthenticating` guard is read/written directly on the store
// (`getState()`), never as a React dependency anywhere — that's what lets
// both the automatic effect and the manual button share one guard safely.
// Subscribing an effect to this value while the effect body also sets it
// is exactly what caused an infinite mount/cleanup loop ("Maximum update
// depth exceeded") the first time this was wired up.
async function attemptSignIn(address: Address, signMessageAsync: SignMessageAsync) {
  if (useAuthStore.getState().isAuthenticating) return;
  useAuthStore.getState().beginAuthenticating();
  try {
    const { message } = await authService.requestNonce(address);
    // `account` is typed as required here even though wagmi's own runtime
    // (see @wagmi/core's signMessage action) treats it as optional and
    // falls back to whatever's currently connected — the type is stricter
    // than the library's actual behavior. Passing it explicitly as the
    // address this sign-in is actually for is more correct anyway (not a
    // workaround): it signs as the address this flow is verifying, not
    // "whatever wagmi happens to consider connected at the moment this
    // resolves," which matters given how easily those two can diverge
    // during a fast wallet switch. The timeout wraps only this call — the
    // one genuinely unbounded step (requestNonce/verifySignature below both
    // go through apiClient.ts's axios instance, which already has its own
    // 15s timeout).
    const signature = await withSignTimeout(
      signMessageAsync({ account: address, message }),
      SIGN_MESSAGE_TIMEOUT_MS,
    );
    const { token } = await authService.verifySignature(address, signature);
    // Re-checked right before committing the session: `connectedAddress` is
    // wagmi's live address, kept in sync by this file's other effect below.
    // A slow signature (right up against SIGN_MESSAGE_TIMEOUT_MS, or one
    // that raced a wallet switch) can resolve successfully *after* the user
    // has already moved on to a different wallet — without this check, that
    // late-but-genuine signature for the *old* address would still call
    // setSession and silently authenticate this device as the wallet that's
    // no longer even connected, exactly the "old wallet session reused"
    // state this app's wallet-switch rule forbids. A mismatch here isn't an
    // error — it just means this specific attempt is stale and its result
    // is discarded; the wallet that's actually connected now still shows
    // its own correct "Sign In" prompt.
    if (useAuthStore.getState().connectedAddress?.toLowerCase() !== address.toLowerCase()) {
      useAuthStore.getState().stopAuthenticating();
      return;
    }
    useAuthStore.getState().setSession(token, address);
  } catch (error) {
    useAuthStore.getState().stopAuthenticating();
    // Preserve the real cause instead of discarding it — the generic toast
    // below is user-facing copy, not a substitute for actually knowing why
    // this failed (nonce request, the wallet, or verify can each throw for
    // very different reasons).
    console.error("[useAuthSync] sign-in failed", error);
    if (error instanceof SignInTimeoutError) {
      toast.error("Sign-in timed out. Please try again.");
    } else if (isUserRejectionError(error)) {
      toast.error("Sign-in cancelled.");
    } else {
      toast.error("Sign-in failed. Try again.");
    }
  }
}

// Wallet connection and authentication are deliberately separate concepts:
// connecting only ever tells wagmi which address is currently active;
// authenticating proves ownership of that address via a signed message,
// and the resulting token — not the live wagmi connection — is what every
// backend request actually relies on. Disconnecting the wallet must never
// touch `token`/`authenticatedAddress` (see useAuthStore.js); the effect
// below simply does nothing when `isConnected` goes false. Reconnecting
// the *same* address later finds its still-valid token here and skips
// straight past the sign prompt. Only a genuinely different address, or
// an explicit `logout()` call, ever triggers a new signature request
// automatically — anything else (logging back in for an address that's
// already connected but unauthenticated) goes through the manual `signIn`
// export instead, driven by a UI action rather than a connection event.
export function useAuthSync() {
  const { address, isConnected, isReconnecting } = useConnection();
  // `signMessage`/`signMessageAsync` on useSignMessage()'s own return are
  // deprecated in favor of the underlying mutation's `mutate`/`mutateAsync`
  // — same pattern already used for useConnect()/useDisconnect() elsewhere
  // in this app (see ConnectWalletModal.jsx, useDisconnectAllWallets.js).
  const { mutateAsync: signMessageAsync } = useSignMessage();

  const token = useAuthStore((state) => state.token);
  const authenticatedAddress = useAuthStore((state) => state.authenticatedAddress);
  const setConnectedAddress = useAuthStore((state) => state.setConnectedAddress);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  // Mirrors wagmi's live address into the store — see useAuthStore.js for
  // why. Deliberately its own effect, depending on nothing this hook
  // itself sets, so it can never trigger a self-cancelling rerun the way
  // subscribing to `isAuthenticating` once did.
  useEffect(() => {
    setConnectedAddress(isConnected ? (address ?? null) : null);
  }, [isConnected, address, setConnectedAddress]);

  // Validated once per app load, against whatever token was already
  // persisted when this hook first mounted — deliberately captured once via
  // a ref rather than depending on the live `token` value above, so a token
  // obtained *during this session* (a fresh sign-in, or switching wallets)
  // never re-triggers this. That token just came straight from a verified
  // signature; re-checking it a moment later added nothing but a second
  // place for a network hiccup to undo a login that had just genuinely
  // succeeded — which is exactly what "sign in, then immediately look
  // signed out again" turned out to trace back to.
  const initialTokenRef = useRef(useAuthStore.getState().token);
  useEffect(() => {
    if (!initialTokenRef.current) return;
    authService.getCurrentUser().catch((error: unknown) => {
      // Only a definitive "this token is invalid" response should end the
      // session. Anything else — a dropped request, a CORS misconfig on
      // this one endpoint, a 500, a timeout — is this device's network
      // having a bad moment, not evidence the login was ever wrong, and
      // clearing a valid session over it is exactly what made a plain page
      // refresh demand signing in again.
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403) clearAuth();
    });
    // Intentionally run once on mount only — see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // wagmi's own `isReconnecting` status is briefly `true` exactly once per
  // page load — specifically when it's silently restoring a connection the
  // wallet already had (`reconnectOnMount`), as opposed to `isConnecting`
  // for a real, explicit connect() call. Captured in a ref (not read
  // directly where it's consulted below) because by the time `isConnected`
  // itself becomes true, wagmi has already moved past 'reconnecting' —
  // these are mutually exclusive statuses, so this is the only way to
  // remember it happened at all.
  const hadSilentAutoReconnectRef = useRef(false);
  useEffect(() => {
    if (isReconnecting) hadSilentAutoReconnectRef.current = true;
  }, [isReconnecting]);

  // Never reset once set (unlike prevConnectionRef below, which cycles
  // back through a disconnected-looking snapshot on every real
  // disconnect) — this is specifically "has this page load ever seen any
  // connection at all yet", used only to scope the silent-reconnect skip
  // to the very first one, so a later genuine reconnect or wallet switch
  // in the same session is never affected by how the *first* one arrived.
  const hasEverConnectedRef = useRef(false);

  // Tracks the *previous* connection snapshot so this effect can tell "the
  // wallet just connected (or switched addresses)" apart from "I'm still
  // connected as the same address, but something else — namely `token` —
  // changed underneath me". Logging out clears `token` while the wallet
  // stays connected; without this distinction, that clear alone was
  // enough to satisfy the dependency array and re-run the sign-in flow
  // immediately, mid-logout, before the user ever touched Connect Wallet
  // again.
  const prevConnectionRef = useRef<{ isConnected: boolean; address: Address | undefined }>({
    isConnected: false,
    address: undefined,
  });
  useEffect(() => {
    const prev = prevConnectionRef.current;
    const connectionChanged =
      prev.isConnected !== isConnected || prev.address !== address;
    const isFirstConnectionEver = isConnected && !hasEverConnectedRef.current;
    prevConnectionRef.current = { isConnected, address };
    if (isConnected) hasEverConnectedRef.current = true;

    if (!isConnected || !address) return;
    if (token && authenticatedAddress?.toLowerCase() === address.toLowerCase()) {
      return;
    }
    // Only ever *start* a sign-in in direct response to a real connect or
    // address-switch event — never merely because `token`/
    // `authenticatedAddress` changed while the connection itself was
    // untouched (a logout does exactly that).
    if (!connectionChanged) return;

    // A silent restore of a wallet the user never actually clicked
    // anything for (typically: they logged out but never disconnected the
    // wallet itself, then refreshed the page) must never by itself demand
    // a fresh signature — only an explicit action does (the manual `signIn`
    // export, wired to a real "Sign In" button). Scoped to the very first
    // connection this mount ever observes: a later explicit reconnect or
    // wallet switch always proceeds normally even if this page load's own
    // initial restore happened to be silent.
    if (isFirstConnectionEver && hadSilentAutoReconnectRef.current) return;

    // Reaching here with a `token` still set means it belongs to a
    // *different* wallet than the one that just connected (the same-wallet
    // case already returned above) — a real wallet switch, not a fresh
    // connect. apiClient.ts's own request interceptor already refuses to
    // attach this stale token to any outgoing request once
    // `connectedAddress` stops matching `authenticatedAddress`, so no
    // request can ever act as the old wallet — but leaving `token`/
    // `authenticatedAddress` sitting in the store until *some* request
    // happens to 401 and clean it up (apiClient's other interceptor) is
    // reactive and timing-dependent: `hasSession` (derived from `token`
    // alone — see useAuthStatus.ts) would keep reading `true` for a wallet
    // that was never actually authenticated, for however long it takes for
    // that to happen. Clearing it synchronously, right here, the instant a
    // real switch is detected, means a cancelled/failed sign-in for the
    // new wallet always leaves this device in the exact "connected, not
    // authenticated" state that state ought to describe — never a stale
    // "still looks signed in, just as someone else" one.
    if (token) clearAuth();

    attemptSignIn(address, signMessageAsync);
  }, [isConnected, address, token, authenticatedAddress, signMessageAsync, clearAuth]);
}

// Manual trigger for "Sign In" (connected but not authenticated) — see
// useAuthStatus.js, which is what actually calls this from a button.
export function signIn(address: Address, signMessageAsync: SignMessageAsync) {
  return attemptSignIn(address, signMessageAsync);
}

// Exported standalone (not part of the hook above) since logout is a
// deliberate, one-shot user action — "click a button" — not something a
// live effect should drive. Clears local state even if the network call
// fails: the whole point of logging out is that this device stops acting
// as this account regardless of whether the backend is reachable right
// now.
export async function logout() {
  const hadToken = Boolean(useAuthStore.getState().token);
  try {
    if (hadToken) await authService.logout();
  } catch {
    // best-effort — still clear local state below
  } finally {
    useAuthStore.getState().clearAuth();
  }
}
