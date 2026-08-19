import { coston2 } from "@/config/web3Config";

// Real, reproducible bug in wagmi's own WalletConnect connector
// (@wagmi/connectors' walletConnect.ts, confirmed by reading the
// installed source directly), not a mobile-focus issue this time: its
// `switchChain` sends the real `wallet_switchEthereumChain` request, but
// doesn't consider itself done until it *also* receives a matching
// `chainChanged` session event back from the wallet — `Promise.all([wait
// for that event, send the request])`. That event is a separate,
// optional notification, not part of the request/response itself, and at
// least three real WalletConnect-connected wallets (Bifrost, Trust
// Wallet — a documented wagmi issue for the same method — and this app's
// own live testing) never send it when switching to a chain the session
// already pre-approved, since nothing about their UI needs to change for
// that. The user genuinely approves the switch; wagmi just never finds
// out, and sits waiting on an event that isn't coming — indefinitely,
// with the "Confirm in your wallet…" state stuck on screen and no error,
// no retry, no way out except reloading. `useSwitchChain`'s own
// `switchChainAsync` isn't the only place this bites, either:
// `writeContractAsync` (see GasSniperCard.jsx's handleApprove) normally
// takes an explicit `chainId` too, and wagmi's own `getConnectorClient`
// unconditionally re-runs this exact connector method whenever one is
// supplied (`getProvider({chainId})` -> `if (chainId) await
// this.switchChain(...)`, with no check for whether the provider is
// already on that chain) — so even a *successful* switch immediately
// above would hit the identical hang a second time, from inside the
// write call, entirely invisible to the calling component.
//
// This talks to the connector's own provider directly instead — sending
// the same real request, but resolving as soon as the wallet's own
// response to *that* arrives, the actual signal a human approved it,
// without also waiting on the separate notification these wallets don't
// send. `provider.chainId` and this connector's own wagmi emitter are
// updated by hand right after, since that's normally the missing
// notification's job (see @wagmi/core's createConfig.ts `setup()` —
// `connector.emitter` is the same emitter instance wagmi's central store
// listens to for `change` events) — this is what lets `writeContractAsync`
// still correctly land on Coston2 afterward. Deliberately never called
// for anything other than a WalletConnect connector (see
// GasSniperCard.jsx's handleApprove) — injected wallets and MetaMask's
// own SDK don't have this bug, don't need this workaround, and this
// doesn't touch anything else about how they connect or sign.
//
// ROUND 2: the same "nothing ever pops up" symptom persisted on Trust
// Wallet/Bifrost even with this bypass in place. Traced further, into
// `@wagmi/connectors`' own `connect()` (the code that runs once, at the
// very first pairing): it calls `provider.connect({ optionalChains:
// [targetChainId, ...everyOtherConfiguredChain], ... })` — `coston2` IS
// offered to the wallet as one of these `optionalChains` in the very
// first session proposal (confirmed live: nothing on our side omits it).
// But `optionalChains` is only ever an *offer* — the WALLET decides which
// of them it actually grants in the session's own approved namespaces,
// and there is no requirement it grant all (or any) of the optional ones.
// This app's own `walletConnect()` config also sets `isNewChainsStale:
// false` (see web3Config.js), which disables wagmi's *only* built-in
// safety net for this — with it at its default (`true`), a chain the
// session never actually approved is treated as "stale," and wagmi forces
// a full reconnect (visibly re-prompting the wallet) instead of silently
// trying anyway. With it `false` (this app's setting, chosen so a
// disconnect isn't forced just for adding a chain to `config.chains`),
// nothing ever re-validates that Coston2 actually made it into the live
// session before this flow tries to use it.
//
// ROUND 3: the pre-flight namespace check (assertConston2InWalletConnectSession,
// below) now fires the "doesn't support Coston2" error reliably, *even
// right after an explicit disconnect + fresh reconnect* — a genuinely new
// pairing re-offering Coston2, consistently declined. That's exactly the
// scenario EIP-3085 (`wallet_addEthereumChain`) exists for: a wallet that
// doesn't yet recognize a chain isn't asked to silently support it, it's
// asked to *add* it, which is expected to surface its own "Add network?"
// confirmation UI regardless of prior chain knowledge.
// addConston2ToWalletConnectSession (below) does that directly.
//
// ROUND 4: the add-chain step also produced zero popup — identical to the
// switch it was meant to fix. Two completely different request methods
// producing the identical "opens the wallet app, shows nothing, times
// out" result stops looking like a Coston2-specific problem and starts
// looking like *no* request reaches this wallet's UI at all, regardless
// of method — the underlying WalletConnect session/relay pipe itself, not
// any one chain.
//
// A concrete, previously-unconsidered mechanism for exactly that: this
// connector's own `provider_` (the actual EthereumProvider/SignClient
// instance — see @wagmi/connectors' walletConnect.ts) is a MODULE-LEVEL
// SINGLETON, created once and never torn down. Confirmed directly in that
// source: `disconnect()` calls `provider?.disconnect()` on the existing
// instance but never sets `provider_ = undefined`; the next `connect()`
// call's `getProvider()` sees `provider_` still truthy and reuses the
// *same* instance rather than constructing a fresh one. That instance
// owns its own relay WebSocket connection — if that connection (or the
// SignClient's internal pairing/session bookkeeping) has gotten into a
// broken state for any reason, no amount of UI-level "Disconnect" then
// "Connect" clicking can ever recover it within the same page load, since
// every one of those calls operates on the identical already-broken
// object. Only a genuine full page reload re-evaluates web3Config.js from
// scratch and constructs a brand-new provider with a fresh relay
// connection — something neither this app's disconnect button nor a
// same-tab reconnect actually does.
//
// assertWalletConnectSessionIsResponsive (below) probes for exactly this,
// cheaply and safely, before spending any more time on Coston2
// specifically: `eth_chainId` is a plain read most wallets answer
// silently, with no user-facing UI at all, so it should resolve almost
// immediately if the underlying transport is genuinely alive — a short
// timeout here (12s, well under the 60s used for requests that genuinely
// need a human to look at their phone) is a meaningful, load-bearing
// signal, not a generous allowance. If even this hangs, the session
// itself is the problem, and the clear, correct next step for the user is
// a full disconnect + page reload + fresh reconnect (see
// GasSniperCard.jsx's handleApprove for exactly where this check sits:
// first, before anything Coston2-specific).
export class WalletConnectRequestTimeoutError extends Error {
  constructor() {
    super("The wallet did not respond to the WalletConnect request in time.");
    this.name = "WalletConnectRequestTimeoutError";
  }
}

// 60s — generous enough for a human to actually notice the wallet-app
// switch, look at their phone, and tap Approve (including the extra
// couple of seconds a deep-link app-switch itself can take), while still
// being a real, finite bound instead of the indefinite hang this replaces.
const WALLETCONNECT_REQUEST_TIMEOUT_MS = 60_000;

export function withWalletConnectTimeout(promise, timeoutMs = WALLETCONNECT_REQUEST_TIMEOUT_MS) {
  let timeoutId;
  const timeout = new Promise((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new WalletConnectRequestTimeoutError()), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export class WalletConnectSessionStaleError extends Error {
  constructor() {
    super("This WalletConnect session isn't responding to any request, not just Coston2-specific ones.");
    this.name = "WalletConnectSessionStaleError";
  }
}

const WALLETCONNECT_HEALTH_PROBE_TIMEOUT_MS = 12_000;

export async function assertWalletConnectSessionIsResponsive(connector) {
  const provider = await connector.getProvider();
  try {
    await withWalletConnectTimeout(
      provider.request({ method: "eth_chainId" }),
      WALLETCONNECT_HEALTH_PROBE_TIMEOUT_MS,
    );
  } catch (error) {
    if (error instanceof WalletConnectRequestTimeoutError) {
      throw new WalletConnectSessionStaleError();
    }
    throw error;
  }
}

export class WalletConnectChainUnsupportedError extends Error {
  constructor() {
    super("Coston2 is not in this WalletConnect session's approved chains.");
    this.name = "WalletConnectChainUnsupportedError";
  }
}

// Empty is treated as "unknown, proceed anyway" rather than "unsupported"
// — matches walletConnect.ts's own isChainsStale(), which guards the same
// getNamespaceChainsIds() read behind `namespaceChains.length &&` before
// trusting it, since an empty list here just as plausibly means the
// session data hasn't been read yet (or this wallet reports namespaces in
// a shape this method doesn't parse) as it means "genuinely zero chains
// approved," and treating it as a hard failure would risk blocking a
// wallet this app has no real evidence is actually broken.
export async function assertConston2InWalletConnectSession(connector) {
  await connector.getProvider();
  const approvedChainIds = connector.getNamespaceChainsIds?.() ?? [];
  if (approvedChainIds.length && !approvedChainIds.includes(coston2.id)) {
    throw new WalletConnectChainUnsupportedError();
  }
}

// Same request shape @wagmi/connectors' own switchChain builds for its
// (unreachable-in-this-scenario, see above) add-chain fallback — not
// guessed independently. A wallet that accepts this is expected to show
// its own "Add network" confirmation; one that rejects it throws normally
// (a real rejection, not a hang, since this is a *new* request the wallet
// hasn't already silently ignored once).
export async function addConston2ToWalletConnectSession(connector) {
  const provider = await connector.getProvider();
  await withWalletConnectTimeout(
    provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: `0x${coston2.id.toString(16)}`,
          chainName: coston2.name,
          nativeCurrency: coston2.nativeCurrency,
          rpcUrls: [...coston2.rpcUrls.default.http],
          blockExplorerUrls: coston2.blockExplorers?.default.url
            ? [coston2.blockExplorers.default.url]
            : [],
        },
      ],
    }),
  );
}

export async function switchToConston2ViaRawRequest(connector) {
  const provider = await connector.getProvider();
  await withWalletConnectTimeout(
    provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${coston2.id.toString(16)}` }],
    }),
  );
  provider.chainId = coston2.id;
  connector.emitter.emit("change", { chainId: coston2.id });
}
