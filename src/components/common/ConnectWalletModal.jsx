import { useEffect, useState } from "react";
import { useConnect, useConnectors, useConnection } from "wagmi";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";

import bifrostImg from "@/assets/wallets/bifrost.jpeg";
import rabbyImg from "@/assets/wallets/rabby.png";
import walletConnectImg from "@/assets/wallets/icon.png";
import metamask from "@/assets/wallets/MetaMask_Fox.svg.png";
import { findInjectedProvider } from "@/config/web3Config";

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
const VISUAL_WALLETS = [
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
function findRdnsConnector(connectors, rdns) {
  return rdns ? connectors.find((c) => c.id === rdns) : undefined;
}

function isWalletDetected(connectors, wallet) {
  if (findRdnsConnector(connectors, wallet.rdns)) return true;
  return !!(wallet.flag && findInjectedProvider(window, wallet.flag));
}

function resolveConnector(connectors, wallet) {
  return (
    findRdnsConnector(connectors, wallet.rdns) ||
    connectors.find((c) => c.id === wallet.connectorId)
  );
}

// wagmi throws this specific, stable error (name + message both fixed
// strings in @wagmi/core) when a connector's getProvider() comes back
// empty — exactly what happens if an extension is uninstalled or disabled
// while the page is still open and its injected object stops responding.
const isProviderGoneError = (error) =>
  error?.name === "ProviderNotFoundError" ||
  error?.message?.toLowerCase().includes("provider not found");

const getFriendlyErrorMessage = (error, t) => {
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

export default function ConnectWalletModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  // `connect`/`connectAsync`/`connectors` on useConnect()'s return are
  // deprecated in favor of the underlying mutation's own `mutate`/
  // `mutateAsync` and the separate useConnectors() hook.
  const { mutateAsync: connectAsync, error, isPending, reset } = useConnect();
  const connectors = useConnectors();
  const { isConnected } = useConnection();

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);
  // Tracks which specific button was clicked, independent of which
  // connector it resolved to — MetaMask and Rabby can both fall back to the
  // same walletConnect connector when neither extension is installed, but
  // clicking one shouldn't make the other look like it's connecting too.
  const [pendingWalletId, setPendingWalletId] = useState(null);
  // 'generic' | 'brave' | null — kept as a kind rather than a pre-translated
  // string so a language switch while the message is showing still renders
  // correctly, and so the richer Brave-specific block below can pick its own
  // markup instead of being forced into a single flat string.
  const [timeoutKind, setTimeoutKind] = useState(null);
  // Set when the user clicks "Install" for a wallet with no extension
  // detected yet; used to show a targeted "still don't see it?" hint if
  // they come back to this tab and it's still undetected, rather than
  // nagging on every unrelated tab switch.
  const [awaitingInstallId, setAwaitingInstallId] = useState(null);
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

  useEffect(() => {
    if (isOpen) {
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
    if (isConnected && isOpen) onClose();
  }, [isConnected, isOpen, onClose]);

  // WalletConnect's own provider doesn't always reject cleanly when its QR
  // modal is dismissed without pairing, which used to leave `isPending`
  // (and therefore every wallet button) stuck disabled for the rest of the
  // session. Resetting the mutation whenever the modal closes guarantees a
  // clean slate the next time it opens, regardless of whether that
  // underlying promise ever actually settles.
  useEffect(() => {
    if (!isOpen) {
      reset();
      setPendingWalletId(null);
      setTimeoutKind(null);
      setAwaitingInstallId(null);
      setShowInstallHint(false);
    }
  }, [isOpen, reset]);

  useEffect(() => {
    const handleEscape = (e) => e.key === "Escape" && onClose();
    if (isOpen) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Re-checked on focus/visibility regain rather than continuously, since
  // that's the moment most likely to follow a trip to the extension store —
  // both a cheap live re-render (helps any wallet whose injection does
  // support waking up in an already-open tab) and, if the user specifically
  // just clicked "Install" for a wallet that's still undetected, a targeted
  // one-time hint instead of silence.
  useEffect(() => {
    if (!isOpen) return;
    const recheck = () => {
      if (document.visibilityState !== "visible") return;
      setRefreshTick((tick) => tick + 1);
      if (!awaitingInstallId) return;
      const wallet = VISUAL_WALLETS.find((w) => w.id === awaitingInstallId);
      if (wallet && isWalletDetected(connectors, wallet)) {
        setAwaitingInstallId(null);
        setShowInstallHint(false);
      } else {
        setShowInstallHint(true);
      }
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [isOpen, awaitingInstallId, connectors]);

  if (!shouldRender) return null;

  const runConnect = async (connector, walletId) => {
    reset();
    setTimeoutKind(null);
    setPendingWalletId(walletId);

    let timedOut = false;
    const timeoutId = setTimeout(async () => {
      timedOut = true;
      reset();
      setPendingWalletId(null);
      // A stuck WalletConnect attempt is the exact symptom of Brave Shields
      // (or a similar tracker/ad blocker) silently dropping its relay
      // traffic — only worth checking (and only relevant to show) when
      // WalletConnect is the connector that actually got stuck, not an
      // injected-wallet attempt timing out for some unrelated reason.
      const brave =
        connector.id === "walletConnect" && (await isBraveBrowser());
      setTimeoutKind(brave ? "brave" : "generic");
      // reset() only clears our own mutation state — WalletConnect's QR
      // modal is a separate widget that doesn't know we gave up, so it'd
      // otherwise stay open on top of our error message. Tearing down the
      // stuck session closes it too.
      connector.disconnect?.().catch(() => {});
    }, CONNECT_TIMEOUT_MS);

    try {
      await connectAsync({ connector });
    } catch {
      // Real rejections (user cancelled, wrong network, etc.) already
      // surface through wagmi's own `error` state below.
    } finally {
      clearTimeout(timeoutId);
      if (!timedOut) setPendingWalletId(null);
    }
  };

  const handleConnect = (wallet) => {
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
        className={`relative w-full bg-surface-card border border-[#E5E7EB] dark:border-none p-5 shadow-xl transition-all duration-200 ease-out rounded-t-2xl max-w-none transform-gpu sm:relative sm:rounded-2xl sm:max-w-lg ${transitionStyles}`}
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-300 dark:bg-zinc-800 sm:hidden" />

        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div>
            <h3 className="text-sm font-bold text-ink-primary">
              {t("connectModal.title")}
            </h3>
            <p className="text-[11px] text-ink-secondary mt-0.5">
              {t("connectModal.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-secondary hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

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
            // extension is reached through WalletConnect's own modal —
            // flagged up front rather than only discovering it after
            // tapping, since it's a different flow from every other
            // button's "connect directly" behavior.
            const willUseWalletConnect =
              !isConnectingThis &&
              !willInstall &&
              !isDetected &&
              wallet.connectorId !== "walletConnect";

            return (
              <button
                key={wallet.id}
                type="button"
                disabled={isConnectingThis}
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

function WalletImage({ src, alt }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative w-6 h-6 flex items-center justify-center shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700 blur-sm" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={`h-5 w-5 object-contain transition-opacity rounded-md duration-500 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
