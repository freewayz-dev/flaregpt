// src/config/web3Config.js
import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains'; // 🟢 ADDED: Mainnet as a fallback root definition
import { injected, walletConnect } from 'wagmi/connectors';

export const flare = {
  id: 14,
  name: 'Flare',
  nativeCurrency: { name: 'Flare', symbol: 'FLR', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://flare-api.flare.network/ext/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'FlareScan', url: 'https://flarescan.com' },
  },
};

export const web3Config = createConfig({
  // 🟢 CHANGED: Include mainnet in the configuration array so the app architecture 
  // natively understands how to fallback to a standard namespace block when handshaking.
  chains: [flare, mainnet],
  connectors: [
    injected(), // Natively catches Bifrost, MetaMask, Rabby, etc.
    walletConnect({ 
      projectId: '771106bc829c38d05731ab4af6c2bc38', // Get from cloud.walletconnect.com
      showQrModal: true,
      qrModalOptions: {
        themeMode: 'dark',
      },
      // 🟢 FIXED: Wagmi v2 checks this property directly at the root option level, 
      // not inside an "ethereumProviderOptions" block!
      isNewChainsStale: false, 
    }),
  ],
  transports: {
    [flare.id]: http(),
    [mainnet.id]: http(), // Fallback RPC initialization link
  },
});