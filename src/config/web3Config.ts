// src/config/web3Config.ts
import type { Address, Chain, EIP1193Provider, Hash } from "viem";
import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";
import { createStore } from "mipd";

import { isStandaloneDisplayMode } from "@/utils/platform";

// The same EIP-6963 provider registry wagmi's own `multiInjectedProviderDiscovery`
// (on by default in createConfig below) builds internally — created directly
// here too so this file's own MetaMask detection (see the "metaMask"
// connector's `target.provider` below) doesn't depend on wagmi auto-generating
// a separate connector for `io.metamask`, which it deliberately does NOT do
// once another connector (metaMaskSDK, below) already declares that rdns —
// see that connector's own comment for why. Two independent `mipd` stores
// (this one and wagmi's internal one) both listening for the same
// `eip6963:announceProvider`/`eip6963:requestProvider` events is normal,
// spec-supported behavior, not a workaround — every listener receives the
// same event with the same `detail.provider` object reference, so both
// stores end up holding the exact same provider instance for a given
// wallet, which is what keeps wagmi's own reconnect() dedup (`providers.some(x => x === provider)`)
// correct regardless of which store found it first.
export const mipdStore = createStore();

// `as const satisfies Chain` (not just a plain object) — without it, `id`
// widens to `number` instead of the literal `14`, which loses wagmi's
// ability to narrow `chainId` against this specific registered chain at
// call sites like useWriteContract's `chainId: coston2.id` (confirmed:
// this is exactly what surfaced as a genuine type error requiring an
// explicit `chain`/`account` pair in GasSniperCard.tsx's writeContractAsync
// call — the real, narrowed literal type is what that overload needs).
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
} as const satisfies Chain;

// Coston2 — Flare's testnet, confirmed live (eth_chainId against its
// public RPC returns 0x72 = 114). Registered here specifically for Gas
// Sniper's on-chain approval step (see claimSetupManager.js):
// `ClaimSetupManager` only exists on Coston2 today, not mainnet, so a
// wallet has to switch here for that one transaction even though every
// other read/write in this app targets Flare mainnet.
export const coston2 = {
  id: 114,
  name: "Coston2",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Coston2 Explorer", url: "https://coston2-explorer.flare.network" },
  },
  testnet: true,
} as const satisfies Chain;

// Songbird — Flare's canary network, confirmed live (eth_chainId against
// its public RPC returns 0x13 = 19). Registered read-only, for Governance's
// SIP/STP support (see config/governance.ts) — nothing here requires a
// connected wallet to actually be on this chain, since every governance
// read is a plain public RPC call via this transport, the same way Flare
// mainnet reads already work regardless of which chain a wallet happens to
// be connected to.
export const songbird = {
  id: 19,
  name: "Songbird",
  nativeCurrency: { name: "Songbird", symbol: "SGB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://songbird-api.flare.network/ext/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Songbird Explorer", url: "https://songbird-explorer.flare.network" },
  },
} as const satisfies Chain;

// Reads the same `blockExplorers.default.url` wagmi already uses for chain
// metadata, rather than a second hardcoded "https://flarescan.com" string
// living alongside it — one source of truth for the explorer's base URL.
export function getFlarescanTxUrl(transactionHash: Hash): string {
  return `${flare.blockExplorers.default.url}/tx/${transactionHash}`;
}

// Same reasoning as getFlarescanTxUrl — used by Governance's proposal
// detail drawer to link a proposal's proposer address out to FlareScan.
export function getFlarescanAddressUrl(address: Address): string {
  return `${flare.blockExplorers.default.url}/address/${address}`;
}

// Songbird counterparts to the two helpers above — used by Governance when
// showing a Songbird (SIP/STP) proposal's proposer.
export function getSongbirdExplorerAddressUrl(address: Address): string {
  return `${songbird.blockExplorers.default.url}/address/${address}`;
}

// An injected wallet's real, on-the-wire provider — the standard EIP-1193
// surface (request/on/removeListener) plus the assorted vendor-specific
// boolean flags (isMetaMask, isRabby, ...) different wallets set for
// dApp-compatibility purposes, which is exactly what isRealMetaMask and the
// impersonator list below probe. wagmi's own equivalent internal type
// (`WalletProvider` in @wagmi/core's injected connector) isn't exported, and
// is itself marked deprecated in favor of EIP-6963 — this app already
// prefers EIP-6963 first (see ConnectWalletModal.jsx) and only falls back to
// this flag-probing path when nothing announced itself that way, so a
// permissive index signature for "some other flag we don't statically know
// the name of" is the honest shape here, not a gap to close.
export interface InjectedProvider extends EIP1193Provider {
  providers?: InjectedProvider[];
  [flag: string]: unknown;
}

// Deliberately NOT the DOM lib's own (huge) `Window` type — wagmi's own
// target.provider callback contextually types its `win` argument as its
// own minimal internal `{ coinbaseWalletExtension?, ethereum?, phantom? }`
// shape (that type itself isn't exported, so it can't be reused by name),
// and a structurally-smaller object can't satisfy a much larger required
// one. This mirrors that same minimal shape — just the one property this
// file actually reads off it, with a real, named type for the injected
// provider instead of wagmi's own internal `WalletProvider`.
interface WindowWithEthereum {
  ethereum?: InjectedProvider;
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
type InjectedProviderMatcher = string | ((provider: InjectedProvider) => boolean);

export function findInjectedProvider(
  win: WindowWithEthereum | undefined,
  matcher: InjectedProviderMatcher,
): InjectedProvider | undefined {
  const ethereum = win?.ethereum;
  if (!ethereum) return undefined;
  const isMatch: (provider: InjectedProvider) => boolean =
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

function isRealMetaMask(provider: InjectedProvider): boolean {
  if (!provider?.isMetaMask) return false;
  if (provider.isBraveWallet && !provider._events && !provider._state)
    return false;
  return !METAMASK_IMPERSONATOR_FLAGS.some((flag) => provider[flag]);
}

// Direct EIP-6963 lookup for the "metaMask" injected() connector's own
// `target.provider` below — checked first, same reasoning
// ConnectWalletModal.tsx's own findRdnsConnector originally documented:
// EIP-6963 finds a real MetaMask extension regardless of which wallet
// currently occupies `window.ethereum` (confirmed in testing: Rabby
// installed alongside a real MetaMask can hide it from any window.ethereum-
// based check). Still run through isRealMetaMask — an EIP-6963 announcement
// is a stronger identity signal than a window.ethereum flag, but not
// infallible, and this keeps exactly one impersonator check for MetaMask
// instead of two different ones for two different discovery paths.
function findMetaMaskEip6963Provider(): InjectedProvider | undefined {
  const provider = mipdStore.findProvider({ rdns: "io.metamask" })?.provider as
    | InjectedProvider
    | undefined;
  return provider && isRealMetaMask(provider) ? provider : undefined;
}

// Extracted to its own function purely so this decision is directly
// unit-testable (see web3Config.test.ts) without having to reach into
// wagmi's own internal connector construction — `createConfig` below is a
// module-level singleton evaluated once at import time, so a test needs to
// re-import the module fresh under each `isStandaloneDisplayMode()` mock,
// which is far more reliable against this small, pure function's return
// value than against whatever @walletconnect/ethereum-provider happens to
// expose on its lazily-constructed internals.
export function getWalletConnectMetadata() {
  return {
    name: "FlareGPT",
    description:
      "Track wallets, claim FTSO rewards, monitor governance, and chat with an AI that understands your Flare portfolio.",
    url: "https://www.flaregpt.io",
    icons: ["https://www.flaregpt.io/icon-512.png"],
    // `redirect.universal` is an instruction to physically navigate the
    // user to that URL after a wallet approves — and on mobile that means
    // the OS resolves it, which opens a *new* browser tab, not the
    // already-open installed PWA (a plain https URL has no way to tell the
    // OS "reopen the standalone instance specifically"). Setting it
    // unconditionally regressed the PWA connect flow (confirmed live:
    // connect from the installed app, approve in MetaMask, land back in
    // Safari/Chrome instead of the PWA) — before this field existed at
    // all, wallets fell back to their own default "return to previous
    // app" UX (a prompt inside the wallet, resolved via the OS app-
    // switcher rather than a URL navigation), which is exactly what
    // correctly returns to whichever context — PWA or browser tab —
    // actually initiated the connection. Only setting this for a plain-
    // browser session restores that PWA behavior while keeping the
    // deliberate universal-link redirect for the browser case it was
    // actually added for (see the commit that introduced it: wallets'
    // Verify API and default branding otherwise announced this app as
    // generic "WalletConnect" from walletconnect.org).
    ...(isStandaloneDisplayMode()
      ? {}
      : { redirect: { universal: "https://www.flaregpt.io/" } }),
  };
}

export const web3Config = createConfig({
  chains: [flare, mainnet, coston2, songbird],
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
        // EIP-6963 first (findMetaMaskEip6963Provider — finds a real
        // MetaMask extension regardless of who currently occupies
        // window.ethereum), window.ethereum flag-probing as the fallback
        // for a provider that never announced itself that way.
        provider: (win) => findMetaMaskEip6963Provider() ?? findInjectedProvider(win, isRealMetaMask),
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
    // Separate from the "metaMask" injected() connector above — that one
    // only ever talks to an already-injected provider (desktop extension,
    // or MetaMask's own in-app mobile browser) and is untouched by this.
    // This one (id: "metaMaskSDK", fixed by the library) is specifically
    // for mobile Safari/Chrome with no injected provider at all, where
    // ConnectWalletModal.tsx's fallback used to route MetaMask through the
    // generic walletConnect connector below. MetaMask's own Mobile Wallet
    // Protocol (@metamask/connect-evm, confirmed by reading its actual
    // dependency chain down to @metamask/mobile-wallet-protocol-core, which
    // uses its own `centrifuge`-based relay — not @walletconnect/*) owns its
    // own mobile deep-link/reconnection lifecycle instead of going through
    // WalletConnect's generic multi-wallet session-proposal path.
    //
    // Passed through unmodified — no rdns-stripping wrapper. An earlier
    // version of this file wrapped this in a `metaMaskWithoutRdnsClaim`
    // helper that deleted this connector's own `rdns: ["io.metamask", ...]`
    // to stop it from suppressing wagmi's auto-generated "io.metamask"
    // EIP-6963 connector. That "fixed" the desktop detection regression but
    // broke something worse: this connector's own getProvider()/
    // getAccounts()/isAuthorized() (see @wagmi/connectors' metaMask.ts) each
    // have a pre-connect fast path that reads `config.providers[0]?.provider`
    // — populated *from this connector's own declared rdns* — specifically so
    // wagmi's reconnect() (which probes every connector on every single page
    // load, confirmed by reading @wagmi/core's reconnect.ts) never has to
    // dynamically import and initialize the full SDK just to answer "is this
    // wallet authorized." Stripping rdns silently defeated that fast path,
    // forcing a real dynamic import + SDK client construction on every page
    // load for every user, MetaMask or not. Detection is fixed the other way
    // instead — see findMetaMaskEip6963Provider() above and the "metaMask"
    // injected() connector's own `target.provider` — so this connector keeps
    // its natural rdns and its intended fast path.
    metaMask({
      dapp: {
        name: "FlareGPT",
        url: "https://www.flaregpt.io",
      },
    }),
    walletConnect({
      projectId: "771106bc829c38d05731ab4af6c2bc38", // Get from cloud.walletconnect.com
      // See getWalletConnectMetadata's own comment for `url`/`redirect`.
      metadata: getWalletConnectMetadata(),
      showQrModal: true,
      qrModalOptions: {
        // A genuine bug, caught by conversion, not a types gap: this
        // option's real type (confirmed in both @walletconnect/ethereum-
        // provider's and @reown/appkit-controllers' own source — the
        // library actually rendering this modal at runtime) only ever
        // accepts "dark" | "light". "auto" was never a recognized value —
        // the modal's ThemeController defaults to 'dark' and only branches
        // on an exact "dark"/"light" match, so this has likely never
        // tracked the OS/app theme the way the comment below describes,
        // silently landing on whatever the library falls back to for an
        // unrecognized string instead. Reading the DOM directly is correct
        // here, not a workaround: index.html's own FOUC-prevention script
        // (a synchronous classic script that runs before this deferred
        // module script, despite appearing after it in source order) has
        // already resolved the real hasThemeOverride/persisted/OS-
        // preference decision onto `<html>` by the time this module
        // evaluates — matching it exactly without a third hand-rolled copy
        // of that same localStorage-reading logic (already duplicated once
        // between index.html and useUIStore.js's own onRehydrateStorage).
        themeMode: document.documentElement.classList.contains("dark") ? "dark" : "light",
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
    [coston2.id]: http(),
    [songbird.id]: http(),
  },
});
