// src/config/web3Config.js
import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

export const flare = {
  id: 14,
  name: "Flare",
  nativeCurrency: { name: "Flare", symbol: "FLR", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://flare-api.flare.network/ext/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "FlareScan", url: "https://flarescan.com" },
  },
};

// Reads the same `blockExplorers.default.url` wagmi already uses for chain
// metadata, rather than a second hardcoded "https://flarescan.com" string
// living alongside it — one source of truth for the explorer's base URL.
export function getFlarescanTxUrl(transactionHash) {
  return `${flare.blockExplorers.default.url}/tx/${transactionHash}`;
}

// wagmi's `injected()` connector only auto-detects the generic
// `window.ethereum` provider (whichever extension grabbed that global
// first). Its own multi-provider matcher (used internally for built-in
// `target` shorthands like "metaMask") only searches `window.ethereum.providers`
// once that array exists, and never falls back to `window.ethereum` itself —
// which breaks when a wallet claims the top-level slot without listing
// every other installed wallet in its own `.providers` array (confirmed:
// Rabby installed alongside MetaMask can do exactly this, making the real
// MetaMask provider undiscoverable via wagmi's own logic even though it's
// genuinely installed — this is what caused "unexpected connection
// friction" when MetaMask was clicked directly, while it worked when
// selected through Rabby's own wallet picker, which enumerates providers
// more thoroughly than wagmi does).
//
// `matcher` is either a flag name (`"isRabby"`) or a predicate function
// (needed for MetaMask, which also has to exclude wallets that spoof
// `isMetaMask` for compatibility, e.g. Rabby itself).
export function findInjectedProvider(win, matcher) {
  const ethereum = win?.ethereum;
  if (!ethereum) return undefined;
  const isMatch =
    typeof matcher === "function" ? matcher : (p) => !!p?.[matcher];
  if (ethereum.providers) {
    const found = ethereum.providers.find(isMatch);
    if (found) return found;
  }
  if (isMatch(ethereum)) return ethereum;
  return undefined;
}

// Mirrors the exclusion list wagmi's own built-in "metaMask" target uses,
// so wallets that set isMetaMask for dApp-compatibility purposes (Rabby
// among them) still aren't mistaken for the real MetaMask.
const METAMASK_IMPERSONATOR_FLAGS = [
  "isApexWallet",
  "isAvalanche",
  "isBitKeep",
  "isBlockWallet",
  "isKuCoinWallet",
  "isMathWallet",
  "isOkxWallet",
  "isOKExWallet",
  "isOneInchIOSWallet",
  "isOneInchAndroidWallet",
  "isOpera",
  "isPhantom",
  "isPortal",
  "isRabby",
  "isTokenPocket",
  "isTokenary",
  "isUniswapWallet",
  "isZerion",
];

function isRealMetaMask(provider) {
  if (!provider?.isMetaMask) return false;
  if (provider.isBraveWallet && !provider._events && !provider._state)
    return false;
  return !METAMASK_IMPERSONATOR_FLAGS.some((flag) => provider[flag]);
}

export const web3Config = createConfig({
  chains: [flare, mainnet],
  connectors: [
    // Each wallet gets its OWN connector, targeted at its actual injected
    // flag. Previously all three buttons shared a single untargeted
    // injected() connector, which just grabs whatever `window.ethereum`
    // happens to be — so clicking "Rabby" or "Bifrost" silently connected
    // MetaMask if that was the only extension installed, and any of them
    // threw on mobile browsers with no injected provider at all (see
    // ConnectWalletModal's availability check, which now gates these
    // buttons on the matching flag actually being present).
    injected({
      target: {
        id: "metaMask",
        name: "MetaMask",
        provider: (win) => findInjectedProvider(win, isRealMetaMask),
      },
    }),
    injected({
      target: {
        id: "rabby",
        name: "Rabby Wallet",
        provider: (win) => findInjectedProvider(win, "isRabby"),
      },
    }),
    injected({
      target: {
        id: "bifrost",
        name: "Bifrost Wallet",
        provider: (win) => findInjectedProvider(win, "isBifrost"),
      },
    }),
    walletConnect({
      projectId: "771106bc829c38d05731ab4af6c2bc38", // Get from cloud.walletconnect.com
      showQrModal: true,
      qrModalOptions: {
        themeMode: "auto",
        themeVariables: {
          // Match the app's design tokens (src/index.css) instead of the
          // modal's own defaults, so it doesn't look like a bolted-on
          // third-party widget. These reference the same CSS custom
          // properties every card uses, so they automatically track
          // light/dark mode instead of duplicating a hardcoded value.
          "--wcm-accent-color": "#E62058",
          "--wcm-background-color": "rgb(var(--color-surface-card))",
        },
        // Pins these wallets to the top of WalletConnect's own wallet grid
        // (shown on mobile, and alongside the QR on desktop) instead of
        // requiring the user to search for them every time — IDs are each
        // wallet's real WalletConnect Explorer listing id, confirmed via
        // https://explorer-api.walletconnect.com/v3/wallets?projectId=<id>&search=<name>.
        // MetaMask was left out of this list in a previous round, which
        // pushed it out of the top row entirely — it belongs here as much
        // as the other two, listed in the same order as our own buttons.
        explorerRecommendedWalletIds: [
          "37a686ab6223cd42e2886ed6e5477fce100a4fb565dcd57ed4f81f7c12e93053", // Bifrost Wallet
          "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
          "18388be9ac2d02726dbac9777c96efaac06d744b2f6d580fccdd4127a6d01fd1", // Rabby
        ],
      },
      // not inside an "ethereumProviderOptions" block!
      isNewChainsStale: false,
      // Analytics/telemetry (pulse.walletconnect.org) reads as a tracker to
      // ad/tracker blockers like Brave Shields — turning it off removes one
      // request those tools are likely to block, without touching the
      // actual pairing/relay traffic the connection depends on.
      telemetryEnabled: false,
    }),
  ],
  transports: {
    [flare.id]: http(),
    [mainnet.id]: http(),
  },
});
