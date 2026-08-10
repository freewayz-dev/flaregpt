import type { TFunction } from "i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConnect, useConnectors, useConnection } from "wagmi";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";

import bifrostImg from "@/assets/wallets/bifrost.jpeg";
// WebP, not the original PNGs — rabby.png was 136KB for a 20-24px icon
// (uncompressed/oversized source art, not a resolution this app ever
// actually renders it at); sharp-cli conversion (quality 85) brought it
// to 6.7KB, MetaMask's to 28KB from 72KB. Same "already targets es2020,
// no legacy fallback needed" reasoning as LandingPage.tsx's showcase
// images.
import rabbyImg from "@/assets/wallets/rabby.webp";
// Resized from 768x768 (11KB) to 96x96 (2.6KB) via sharp-cli — rendered
// at 24px CSS size here.
import walletConnectImg from "@/assets/wallets/icon.webp";
import metamask from "@/assets/wallets/MetaMask_Fox.svg.webp";
import { findInjectedProvider } from "@/config/web3Config";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// Tied directly to wagmi's own hook return types (same pattern as
// useAuthSync.ts's `SignMessageAsync`) rather than hand-typed — wagmi's
// real `Connector`/error types have generics not worth re-deriving by hand.
type Connectors = ReturnType<typeof useConnectors>;
type Connector = Connectors[number];
type ConnectError = ReturnType<typeof useConnect>["error"];

// The one piece of @walletconnect/ethereum-provider's runtime shape this
// file needs that wagmi's own connector types don't declare — `.modal` is
// the actual AppKit instance rendering the "Open in app" / QR screen the
// user sees. Not exported by wagmi's Connector type (getProvider() is
// generic, `provider = unknown`, since each connector's provider shape
// differs), same reason InjectedProvider in web3Config.ts hand-declares
// the slice of window.ethereum it actually reads instead of importing a
// full third-party type.
interface WalletConnectProvider {
  modal?: { close?: () => void };
}

interface VisualWallet {
  id: string;
  connectorId: string;
  flag: string | null;
  rdns: string | null;
  name: string;
  type: "img" | "svg";
  src: string;
  recommended: boolean;
  installUrl?: string;
  // Only set for MetaMask. When this wallet isn't detected as injected
  // (the mobile case), handleConnect uses this connector id instead of
  // falling through to the generic walletConnect connector every other
  // undetected wallet uses — see web3Config.ts's own comment on the
  // "metaMaskSDK" connector for why MetaMask specifically gets this.
  dedicatedConnectorId?: string;
}

// A stuck relay/network on WalletConnect's side leaves its connect() promise
// hanging forever with no error — this bounds how long any single attempt
// gets before we give up and let the user retry.
const CONNECT_TIMEOUT_MS = 30_000;

const isMobileDevice = () =>
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Brave's user agent deliberately mimics Chrome's for compatibility, so it
// can't be sniffed from the UA string — navigator.brave.isBrave() is Brave's
// own recommended feature-detection API instead.
// https://github.com/brave/brave-browser/wiki/Detecting-Brave-(for-Websites)
const isBraveBrowser = async () => {
  try {
    return !!(navigator.brave && (await navigator.brave.isBrave()));
  } catch {
    return false;
  }
};

// `connectorId` is the targeted injected connector (see web3Config.js) used
// when `flag` is detected on window.ethereum — the fast path for a desktop
// extension or a wallet's own mobile in-app browser. `installUrl` is only
// set for wallets with a real, citable desktop extension: when neither is
// detected on desktop, clicking sends the user to install it directly
// rather than silently substituting a different connection method. Bifrost
// has no confirmed desktop extension, so it has no installUrl and keeps
// falling back to WalletConnect on desktop, same as before.
//
// None of these carry a mobile deep-link of their own (a previous version
// of this file redirected MetaMask to https://metamask.app.link/... on
// mobile) — deliberately removed. That link is a Branch.io universal link,
// and universal links only bypass their own "Open App" landing page when
// the navigation is a direct, synchronous consequence of a real tap; ours
// fired from a JS event handler reacting to the async display_uri event,
// which iOS/Android correctly refuse to treat as a trusted user gesture, so
// it always fell through to Branch's fallback page — one MORE tap than just
// letting WalletConnect's own modal handle it. Confirmed directly: tapping
// a wallet inside WalletConnect's own grid fires a raw custom-scheme
// navigation (e.g. metamask://wc?uri=...) with no landing page at all,
// because that tap genuinely is a trusted user gesture. Letting every
// wallet fall back to the same shared modal is the most reliable option
// available without hand-rolling a second, unofficial WalletConnect
// provider instance per wallet.
const VISUAL_WALLETS: VisualWallet[] = [
  {
    id: "bifrost",
    connectorId: "bifrost",
    flag: "isBifrost",
    rdns: "com.bifrostwallet",
    name: "Bifrost Wallet",
    type: "img",
    src: bifrostImg,
    recommended: true,
  },
  {
    id: "metamask",
    connectorId: "metaMask",
    flag: "isMetaMask",
    rdns: "io.metamask",
    name: "MetaMask",
    type: "svg",
    src: metamask,
    recommended: false,
    installUrl: "https://metamask.io/download/",
    dedicatedConnectorId: "metaMaskSDK",
  },
  {
    id: "rabby",
    connectorId: "rabby",
    flag: "isRabby",
    rdns: "io.rabby",
    name: "Rabby Wallet",
    type: "img",
    src: rabbyImg,
    recommended: false,
    // Chrome Web Store URL, confirmed via WalletConnect's own Explorer
    // listing for Rabby rather than guessed.
    installUrl:
      "https://chrome.google.com/webstore/detail/rabby/acmacodkjbdgmoleebolmdjonilkdbch",
  },
  {
    id: "walletconnect",
    connectorId: "walletConnect",
    flag: null,
    rdns: null,
    name: "WalletConnect",
    type: "img",
    src: walletConnectImg,
    recommended: false,
  },
];

// wagmi auto-discovers EIP-6963-announced providers (multiInjectedProviderDiscovery,
// enabled by default) as separate connectors keyed by each wallet's `rdns`,
// independent of whichever extension currently occupies `window.ethereum`.
// Checked first since it's strictly more reliable than our own
// window.ethereum probing below: confirmed that a wallet occupying
// window.ethereum (Rabby, in testing) can leave a genuinely-installed
// MetaMask undiscoverable via any window.ethereum-based check — since
// wagmi's own "metaMask" target only searches window.ethereum.providers[]
// once that array exists — while EIP-6963 finds it regardless of who owns
// that global. This is exactly what caused "unexpected connection friction"
// clicking MetaMask directly, while it worked when selected through
// Rabby's own wallet picker (which enumerates EIP-6963 providers itself).
function findRdnsConnector(connectors: Connectors, rdns: string | null) {
  return rdns ? connectors.find((c) => c.id === rdns) : undefined;
}

function isWalletDetected(connectors: Connectors, wallet: VisualWallet) {
  if (findRdnsConnector(connectors, wallet.rdns)) return true;
  return !!(wallet.flag && findInjectedProvider(window, wallet.flag));
}

function resolveConnector(connectors: Connectors, wallet: VisualWallet) {
  return (
    findRdnsConnector(connectors, wallet.rdns) ||
    connectors.find((c) => c.id === wallet.connectorId)
  );
}

// wagmi throws this specific, stable error (name + message both fixed
// strings in @wagmi/core) when a connector's getProvider() comes back
// empty — exactly what happens if an extension is uninstalled or disabled
// while the page is still open and its injected object stops responding.
// `connect()`'s own declared `ConnectErrorType` doesn't actually list
// "ProviderNotFoundError" as one of its possible `.name` values (confirmed
// by reading @wagmi/core's own connect.d.ts) — a real gap between wagmi's
// type and its documented, empirically-confirmed runtime behavior, not a
// mistake in this check. `String(...)` widens the comparison past that
// incomplete union rather than asserting the error away.
const isProviderGoneError = (error: ConnectError) =>
  String(error?.name) === "ProviderNotFoundError" ||
  error?.message?.toLowerCase().includes("provider not found");

const getFriendlyErrorMessage = (error: ConnectError, t: TFunction) => {
  if (!error) return null;
  if (isProviderGoneError(error)) return t("connectModal.errors.providerGone");
  const msg = error.message.toLowerCase();
  if (msg.includes("user rejected") || msg.includes("denied")) {
    return t("connectModal.errors.rejected");
  }
  if (msg.includes("already pending")) {
    return t("connectModal.errors.pending");
  }
  if (msg.includes("chain") || msg.includes("network")) {
    return t("connectModal.errors.wrongNetwork");
  }
  return t("connectModal.errors.generic");
};

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { t } = useTranslation();
  // `connect`/`connectAsync`/`connectors` on useConnect()'s return are
  // deprecated in favor of the underlying mutation's own `mutate`/
  // `mutateAsync` and the separate useConnectors() hook.
  const { mutateAsync: connectAsync, error, isPending, reset } = useConnect();
  const connectors = useConnectors();
  const { isConnected } = useConnection();
  // A real wallet handshake (the injected `eth_requestAccounts` call, or
  // WalletConnect's relay) needs a live connection regardless of which
  // connector it goes through — every button below disables together
  // rather than trying to guess which specific step might still work
  // offline.
  const isOnline = useOnlineStatus();

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);
  // Tracks which specific button was clicked, independent of which
  // connector it resolved to — MetaMask and Rabby can both fall back to the
  // same walletConnect connector when neither extension is installed, but
  // clicking one shouldn't make the other look like it's connecting too.
  const [pendingWalletId, setPendingWalletId] = useState<string | null>(null);
  // 'generic' | 'brave' | null — kept as a kind rather than a pre-translated
  // string so a language switch while the message is showing still renders
  // correctly, and so the richer Brave-specific block below can pick its own
  // markup instead of being forced into a single flat string.
  const [timeoutKind, setTimeoutKind] = useState<"generic" | "brave" | null>(null);
  // Set when the user clicks "Install" for a wallet with no extension
  // detected yet; used to show a targeted "still don't see it?" hint if
  // they come back to this tab and it's still undetected, rather than
  // nagging on every unrelated tab switch.
  const [awaitingInstallId, setAwaitingInstallId] = useState<string | null>(null);
  const [showInstallHint, setShowInstallHint] = useState(false);
  // Bumped (never read directly) on focus/visibility regain purely to force
  // a re-render — detection is computed live from window.ethereum/connectors
  // on every render, so this is enough to pick up a wallet extension that
  // finished injecting while this tab was in the background. Chrome doesn't
  // retroactively run a newly-installed extension's content script in tabs
  // that were already open, so this only helps wallets whose own injection
  // logic supports it — it's a genuine, if partial, improvement rather than
  // a full guarantee, which no page-level code can provide.
  const [, setRefreshTick] = useState(0);

  // Focus management: a keyboard user who opened this from the Sidebar or
  // Navbar's wallet button previously stayed focused on that button the
  // whole time the modal was open (no focus trap either — Tab walked
  // straight through into the dashboard behind it), then never got focus
  // back at all on close. Captured on open, restored on close; the actual
  // "move focus in" happens once `shouldRender` flips (see below), not here
  // — the close button this focuses doesn't exist in the DOM until after
  // that state update commits.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Which connector (if any) currently has a real, in-flight attempt —
  // tracked separately from `pendingWalletId` because cleanup needs the
  // actual connector object, not just its id, to reach into its provider.
  const pendingConnectorRef = useRef<Connector | null>(null);
  // The current attempt's own CONNECT_TIMEOUT_MS timer — tracked so a
  // *second* runConnect() call for the same connector (specifically the
  // resume-reconciliation path below) can cancel the first attempt's timer
  // before it fires. Without this, the original attempt's timeout still
  // goes off on its own schedule and calls abortPendingConnector — which
  // calls disconnect() — on the connection the reconciliation call just
  // successfully established, tearing it back down out from under the
  // sign-in flow that had just started. Same class of race the `!isConnected`
  // guard below already exists to prevent, one layer earlier.
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards the resume-reconciliation check itself (see the visibility/focus
  // effect below) against overlapping runs if `focus` and `visibilitychange`
  // both fire for the same resume, or the user backgrounds/foregrounds
  // again before the previous check finished its (async) isAuthorized()
  // probe.
  const isReconcilingRef = useRef(false);

  useFocusTrap(dialogRef, shouldRender);

  // wagmi's connector.disconnect() only tears down an *established*
  // session (confirmed in @walletconnect/ethereum-provider's own source:
  // `this.session && await this.signer.disconnect()`) — for an attempt
  // that never got that far, which is exactly the stuck-spinner/disabled-
  // "Open"-button case, it's a no-op. The actual on-screen overlay is
  // AppKit's own `.modal` on the underlying EthereumProvider instance, and
  // that instance is a per-page singleton wagmi caches for the lifetime of
  // this connector (never recreated), so a modal left open here doesn't
  // just linger visually — it silently breaks every later WalletConnect
  // attempt too, for any wallet, since they all share the same poisoned
  // instance. `.modal.close()` is not a workaround: AppKit's own connect()
  // already wires a `subscribeState` listener that treats the modal
  // closing as the user backing out — it calls the SDK's own
  // `abortPairingAttempt()` and rejects the original connect() promise
  // itself, the same clean teardown a manual close click gets. Using that
  // existing mechanism, rather than reimplementing pairing cleanup, is
  // deliberate — wagmi gives no supported way to force a fresh provider
  // instance instead.
  const abortPendingConnector = useCallback(async (connector: Connector) => {
    try {
      const provider = (await connector
        .getProvider?.()
        .catch(() => null)) as WalletConnectProvider | null | undefined;
      provider?.modal?.close?.();
    } catch {
      // Best-effort cleanup only — connector.disconnect() below still runs
      // regardless, and a failure here just means the visual overlay (if
      // any) has to wait for the user to close it by hand.
    }
    connector.disconnect?.().catch(() => {});
  }, []);

  // Moved above the modal's `if (!shouldRender) return null` early return
  // (it used to live below it, alongside handleConnect) specifically so the
  // resume-reconciliation effect further down — which must itself stay
  // above that same early return, since it needs to keep running even for
  // a render where the modal briefly isn't visible mid-close-animation —
  // can call this directly instead of going through a ref-forwarding
  // workaround. Wrapped in useCallback for the same reason
  // abortPendingConnector above is: a stable identity that effect can list
  // as a real dependency.
  const runConnect = useCallback(
    async (connector: Connector, walletId: string) => {
      // Every wallet button stays independently clickable while another is
      // mid-attempt (see the `disabled` check below), so tapping a second
      // wallet before the first settles is a real, reachable path —
      // without this, both attempts would race against the same
      // underlying WalletConnect modal/pairing. Clean up whatever was
      // still pending first, exactly the same way a timeout or closing
      // the modal would.
      if (pendingConnectorRef.current && pendingConnectorRef.current !== connector) {
        await abortPendingConnector(pendingConnectorRef.current);
      }
      // A second runConnect() for the *same* connector (the resume-
      // reconciliation path below, superseding a first attempt that's
      // still technically pending) — cancel that first attempt's own
      // timer before scheduling this one's, so it can never fire against
      // the connection this call is about to (re)establish. See
      // pendingTimeoutRef's own comment.
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      pendingConnectorRef.current = connector;

      reset();
      setTimeoutKind(null);
      setPendingWalletId(walletId);

      let timedOut = false;
      const timeoutId = setTimeout(async () => {
        timedOut = true;
        reset();
        setPendingWalletId(null);
        // A stuck WalletConnect attempt is the exact symptom of Brave
        // Shields (or a similar tracker/ad blocker) silently dropping its
        // relay traffic — only worth checking (and only relevant to show)
        // when WalletConnect is the connector that actually got stuck,
        // not an injected-wallet attempt timing out for some unrelated
        // reason.
        const brave =
          connector.id === "walletConnect" && (await isBraveBrowser());
        setTimeoutKind(brave ? "brave" : "generic");
        await abortPendingConnector(connector);
      }, CONNECT_TIMEOUT_MS);
      pendingTimeoutRef.current = timeoutId;

      try {
        await connectAsync({ connector });
      } catch {
        // Real rejections (user cancelled, wrong network, etc.) already
        // surface through wagmi's own `error` state below.
      } finally {
        clearTimeout(timeoutId);
        if (pendingTimeoutRef.current === timeoutId) pendingTimeoutRef.current = null;
        if (!timedOut) setPendingWalletId(null);
        if (pendingConnectorRef.current === connector) pendingConnectorRef.current = null;
      }
    },
    [abortPendingConnector, connectAsync, reset],
  );

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setShouldRender(true);
      const timer = setTimeout(() => setAnimate(true), 20);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (shouldRender) {
      closeButtonRef.current?.focus();
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus?.();
      previouslyFocusedRef.current = null;
    }
  }, [shouldRender]);

  useEffect(() => {
    if (isConnected && isOpen) onClose();
  }, [isConnected, isOpen, onClose]);

  // WalletConnect's own provider doesn't always reject cleanly when its QR
  // modal is dismissed without pairing, which used to leave `isPending`
  // (and therefore every wallet button) stuck disabled for the rest of the
  // session. Resetting the mutation whenever the modal closes guarantees a
  // clean slate the next time it opens, regardless of whether that
  // underlying promise ever actually settles. Also aborts any connector
  // still genuinely mid-attempt (see abortPendingConnector above) — closing
  // *this* modal (backdrop tap, Escape, the X button) previously left
  // AppKit's own separately-rendered overlay on screen underneath/on top of
  // it if a WalletConnect attempt was still pending, since dismissing our
  // own React modal was never wired to that one at all.
  //
  // `!isConnected` guards the abort specifically: this modal *also*
  // auto-closes itself the instant a connector succeeds (the effect right
  // above this one), and that state update can land before runConnect's own
  // `finally` clears `pendingConnectorRef.current` — without this guard,
  // the connector that just connected got immediately torn back down via
  // its own disconnect() (confirmed live: it fires the same
  // `wallet_revokePermissions` call disconnect() always makes), corrupting
  // the connection out from under the sign-in flow that had just started
  // for it. This only exists to abort a connector that's still genuinely
  // stuck — a connector that already succeeded is never what this cleanup
  // is for.
  useEffect(() => {
    if (!isOpen) {
      if (pendingConnectorRef.current && !isConnected) {
        abortPendingConnector(pendingConnectorRef.current);
      }
      pendingConnectorRef.current = null;
      reset();
      setPendingWalletId(null);
      setTimeoutKind(null);
      setAwaitingInstallId(null);
      setShowInstallHint(false);
    }
  }, [isOpen, isConnected, reset, abortPendingConnector]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (isOpen) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Re-checked on focus/visibility regain rather than continuously, since
  // that's the moment most likely to follow a trip to the extension store —
  // both a cheap live re-render (helps any wallet whose injection does
  // support waking up in an already-open tab) and, if the user specifically
  // just clicked "Install" for a wallet that's still undetected, a targeted
  // one-time hint instead of silence.
  //
  // Also where WalletConnect resume-reconciliation lives — the actual fix
  // for the reported PWA bug: connect from the installed app, approve in
  // MetaMask/Trust Wallet/Bifrost/etc., and the session settles while the
  // PWA is backgrounded, but this component's own in-flight connectAsync()
  // call (still awaiting whatever WalletConnect's relay was mid-handshake
  // on when the WebSocket dropped/suspended) never resolves on its own —
  // the modal is left showing a stale "connecting"/error state until the
  // user minimizes and reopens the app, which forces a fresh mount and
  // lets wagmi's own reconnectOnMount pick up the by-then-settled session
  // from storage. This closes that gap without needing a remount:
  //
  // On regaining visibility, if there's still a genuinely pending
  // WalletConnect attempt (pendingConnectorRef — never set for any other
  // reason) and wagmi doesn't yet consider itself connected, ask that
  // *specific* connector's own isAuthorized() (a side-effect-free read of
  // its already-live session state, not a network call of its own) whether
  // a session has actually settled. Only if it has do we act — by calling
  // runConnect() again for the same connector, which is not "another
  // connection attempt" in any meaningful sense: @wagmi/connectors'
  // walletConnect.ts connect() checks `provider.session` first and skips
  // pairing entirely when one already exists, so this resolves off the
  // settled session in place of the orphaned original promise, instead of
  // prompting the wallet again. If the session hasn't settled yet, nothing
  // happens — the user simply isn't back yet from the wallet's side, and
  // the existing CONNECT_TIMEOUT_MS/error UI still applies exactly as
  // before. Also listens for `pageshow` (fires on a bfcache restore,
  // distinct from a cold reload) for the same reason.
  useEffect(() => {
    if (!isOpen) return;
    const recheck = () => {
      if (document.visibilityState !== "visible") return;
      setRefreshTick((tick) => tick + 1);
      if (awaitingInstallId) {
        const wallet = VISUAL_WALLETS.find((w) => w.id === awaitingInstallId);
        if (wallet && isWalletDetected(connectors, wallet)) {
          setAwaitingInstallId(null);
          setShowInstallHint(false);
        } else {
          setShowInstallHint(true);
        }
      }

      const pending = pendingConnectorRef.current;
      if (!pending || pending.id !== "walletConnect" || isConnected || isReconcilingRef.current) {
        return;
      }
      isReconcilingRef.current = true;
      Promise.resolve(pending.isAuthorized())
        .then((authorized) => {
          if (authorized && pendingConnectorRef.current === pending && !isConnected) {
            runConnect(pending, pendingWalletId ?? pending.id);
          }
        })
        .catch(() => {
          // Not authorized (yet), or the probe itself failed — either way
          // this is not a real error, just "nothing to reconcile right
          // now." The user's own still-pending attempt (and its existing
          // timeout/error handling) is untouched.
        })
        .finally(() => {
          isReconcilingRef.current = false;
        });
    };
    window.addEventListener("focus", recheck);
    window.addEventListener("pageshow", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      window.removeEventListener("pageshow", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [isOpen, awaitingInstallId, connectors, isConnected, pendingWalletId, runConnect]);

  if (!shouldRender) return null;

  const handleConnect = (wallet: VisualWallet) => {
    const detected = isWalletDetected(connectors, wallet);
    const mobile = isMobileDevice();

    if (detected) {
      setAwaitingInstallId(null);
      setShowInstallHint(false);
      const connector = resolveConnector(connectors, wallet);
      if (connector) runConnect(connector, wallet.id);
      return;
    }

    // Desktop, extension not found: send the user to install it rather
    // than silently substituting a different, more confusing connection
    // method (only wallets with a confirmed real desktop extension get an
    // installUrl — see VISUAL_WALLETS above).
    if (!mobile && wallet.installUrl) {
      window.open(wallet.installUrl, "_blank", "noopener,noreferrer");
      setAwaitingInstallId(wallet.id);
      setShowInstallHint(false);
      return;
    }

    // MetaMask specifically has its own dedicated connector for exactly
    // this case (see web3Config.ts's "metaMaskSDK" connector) — its own
    // SDK owns the mobile deep-link/reconnection lifecycle instead of
    // going through WalletConnect's generic multi-wallet session-proposal
    // path. Every other undetected wallet (Bifrost, Rabby with no
    // extension, "Other wallets" via the WalletConnect button itself)
    // keeps using WalletConnect's own modal exactly as before.
    if (wallet.dedicatedConnectorId) {
      const dedicated = connectors.find((c) => c.id === wallet.dedicatedConnectorId);
      if (dedicated) {
        runConnect(dedicated, wallet.id);
        return;
      }
    }

    // Mobile fallback (or a desktop wallet with no extension to install,
    // i.e. Bifrost): reach it through WalletConnect's own modal, which
    // shows a native, tap-driven wallet picker on mobile — see the note on
    // VISUAL_WALLETS above for why this isn't shortcut with a custom
    // redirect.
    const wcConnector = connectors.find((c) => c.id === "walletConnect");
    if (wcConnector) runConnect(wcConnector, wallet.id);
  };

  const transitionStyles = animate
    ? "translate-y-0 opacity-100 sm:scale-100"
    : "translate-y-full opacity-0 sm:translate-y-4 sm:scale-95";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out ${
          animate ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-wallet-modal-title"
        className={`relative w-full bg-surface-card border border-[#E5E7EB] dark:border-none p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl transition-all duration-200 ease-out rounded-t-2xl max-w-none transform-gpu sm:relative sm:rounded-2xl sm:max-w-lg sm:pb-5 ${transitionStyles}`}
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-300 dark:bg-zinc-800 sm:hidden" />

        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div>
            <h3 id="connect-wallet-modal-title" className="text-sm font-bold text-ink-primary">
              {t("connectModal.title")}
            </h3>
            <p className="text-[11px] text-ink-secondary mt-0.5">
              {t("connectModal.subtitle")}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t("connectModal.close")}
            title={t("connectModal.close")}
            className="relative rounded-lg p-1 text-ink-secondary hover:bg-surface-subtle transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 before:content-[''] before:absolute before:-inset-2"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {!isOnline && (
          <div className="mt-4 text-center text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2 rounded-lg font-medium tracking-wide">
            {t("connectModal.offline")}
          </div>
        )}

        <div className="mt-4 space-y-2 pb-4 sm:pb-0">
          {VISUAL_WALLETS.map((wallet) => {
            // Only the button actually being connected shows as busy — every
            // other wallet stays clickable so a stuck or failed attempt on
            // one connector never blocks trying a different one.
            const isConnectingThis = isPending && pendingWalletId === wallet.id;
            const mobile = isMobileDevice();
            const isDetected = isWalletDetected(connectors, wallet);
            const willInstall =
              !isConnectingThis && wallet.installUrl && !mobile && !isDetected;
            // Any undetected wallet other than an installable desktop
            // extension or one with its own dedicated connector (MetaMask —
            // see dedicatedConnectorId) is reached through WalletConnect's
            // own modal — flagged up front rather than only discovering it
            // after tapping, since it's a different flow from every other
            // button's "connect directly" behavior.
            const willUseWalletConnect =
              !isConnectingThis &&
              !willInstall &&
              !isDetected &&
              !wallet.dedicatedConnectorId &&
              wallet.connectorId !== "walletConnect";

            return (
              <button
                key={wallet.id}
                type="button"
                disabled={isConnectingThis || !isOnline}
                onClick={() => handleConnect(wallet)}
                className="w-full flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3 text-xs font-medium text-[#4F5B66] hover:bg-surface-subtle hover:text-ink-primary transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#FFFFFF] dark:border-none dark:bg-surface-inset dark:text-[#A1A1AA] dark:hover:bg-surface-card-hover dark:disabled:hover:bg-surface-inset"
              >
                <div className="flex items-center gap-3">
                  <WalletImage src={wallet.src} alt={wallet.name} />
                  <span className="tracking-wide">{wallet.name}</span>
                </div>

                {isConnectingThis ? (
                  <span className="text-[9px] font-semibold bg-surface-subtle text-ink-muted px-2 py-0.5 rounded-md dark:bg-surface-card-hover">
                    {t("connectModal.connecting")}
                  </span>
                ) : willInstall ? (
                  <span className="text-[9px] font-semibold bg-surface-subtle text-ink-muted px-2 py-0.5 rounded-md dark:bg-surface-card-hover">
                    {t("connectModal.install")}
                  </span>
                ) : willUseWalletConnect ? (
                  <span className="text-[9px] font-semibold bg-surface-subtle text-ink-muted px-2 py-0.5 rounded-md dark:bg-surface-card-hover">
                    {t("connectModal.viaWalletConnect")}
                  </span>
                ) : (
                  wallet.recommended && (
                    <span className="text-[9px] font-semibold bg-brand/10 text-brand px-2 py-0.5 rounded-md">
                      {t("connectModal.recommended")}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>

        {showInstallHint && (
          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-ink-secondary bg-surface-subtle p-3 rounded-lg dark:bg-surface-card-hover">
            <span>{t("connectModal.installHint")}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 font-semibold text-brand hover:underline cursor-pointer"
            >
              {t("connectModal.refresh")}
            </button>
          </div>
        )}

        {timeoutKind === "brave" ? (
          <div className="mt-3 text-[10px] text-brand bg-brand/10 p-3 rounded-lg tracking-wide">
            <p className="font-semibold">
              {t("connectModal.errors.braveBlocked.title")}
            </p>
            <p className="mt-1.5 font-medium">
              {t("connectModal.errors.braveBlocked.tryTitle")}
            </p>
            <ul className="mt-1 list-disc list-inside space-y-0.5 font-medium">
              <li>{t("connectModal.errors.braveBlocked.shieldsOff")}</li>
              <li>{t("connectModal.errors.braveBlocked.privateWindow")}</li>
              <li>{t("connectModal.errors.braveBlocked.useChrome")}</li>
            </ul>
          </div>
        ) : (
          (timeoutKind || error) &&
          (isProviderGoneError(error) ? (
            <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-brand bg-brand/10 p-2 rounded-lg font-medium tracking-wide">
              <span>{getFriendlyErrorMessage(error, t)}</span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="shrink-0 font-semibold hover:underline cursor-pointer"
              >
                {t("connectModal.refresh")}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-center text-[10px] text-brand bg-brand/10 p-2 rounded-lg font-medium tracking-wide">
              {timeoutKind === "generic"
                ? t("connectModal.errors.timeout")
                : getFriendlyErrorMessage(error, t)}
            </p>
          ))
        )}

        <div className="mt-5 text-[10px] text-ink-muted text-center leading-relaxed">
          {t("connectModal.mobileHint")}
        </div>
      </div>
    </div>
  );
}

function WalletImage({ src, alt }: { src: string; alt: string }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative w-6 h-6 flex items-center justify-center shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700 blur-sm" />
      )}
      <img
        src={src}
        alt={alt}
        width={20}
        height={20}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={`h-5 w-5 object-contain transition-opacity rounded-md duration-500 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
