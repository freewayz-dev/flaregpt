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

// wagmi's `injected()` connector only auto-detects the generic
// `window.ethereum` provider (whichever extension grabbed that global
// first). It doesn't export the multi-provider matcher it uses internally
// for its built-in `target` shorthands (e.g. "metaMask"), so this mirrors
// that logic for wallets without a shorthand: check `window.ethereum.providers`
// (the array multiple co-installed extensions populate) for one advertising
// the given flag, falling back to `window.ethereum` itself for the
// single-extension case.
export function findInjectedProvider(win, flag) {
  const ethereum = win?.ethereum;
  if (ethereum?.providers) return ethereum.providers.find((p) => p?.[flag]);
  if (ethereum?.[flag]) return ethereum;
  return undefined;
}

export const web3Config = createConfig({
  // natively understands how to fallback to a standard namespace block when handshaking.
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
    injected({ target: "metaMask" }), // built-in shorthand; already excludes isRabby et al. impersonating MetaMask
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
        // Pins Bifrost and Rabby to the top of WalletConnect's own wallet
        // grid (shown on mobile, and alongside the QR on desktop) instead
        // of requiring the user to search for them every time — IDs are
        // each wallet's real WalletConnect Explorer listing id, confirmed
        // via https://explorer-api.walletconnect.com/v3/wallets?projectId=<id>&search=<name>.
        explorerRecommendedWalletIds: [
          "37a686ab6223cd42e2886ed6e5477fce100a4fb565dcd57ed4f81f7c12e93053", // Bifrost Wallet
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
    [mainnet.id]: http(), // Fallback RPC initialization link
  },
});
