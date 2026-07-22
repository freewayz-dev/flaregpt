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

export const web3Config = createConfig({
  // natively understands how to fallback to a standard namespace block when handshaking.
  chains: [flare, mainnet],
  connectors: [
    injected(), // Natively catches Bifrost, MetaMask, Rabby, etc.
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
      },
      // not inside an "ethereumProviderOptions" block!
      isNewChainsStale: false,
    }),
  ],
  transports: {
    [flare.id]: http(),
    [mainnet.id]: http(), // Fallback RPC initialization link
  },
});
