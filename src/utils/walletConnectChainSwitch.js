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
// STILL NOT THE WHOLE STORY, confirmed by a second real device round: the
// same "nothing ever pops up" symptom persisted on Trust Wallet/Bifrost
// even with this bypass in place. Traced further, into
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
// session before this flow tries to use it. If a wallet's own WalletConnect
// v2 implementation quietly dropped Coston2 as an optional chain it
// doesn't support switching into (rather than rejecting it outright,
// which would at least surface as a JSON-RPC error) — plausible, since
// wallet-side WalletConnect v2 implementations are inconsistent about
// which of their own supported chains they'll actually add to a live
// session versus only ever offering at pairing time — then every request
// this flow sends afterward (the raw switch above, and the write below)
// is asking the wallet to act on a chain its own session was never told
// about, with nothing in the request/response cycle itself distinguishing
// that from "the human just hasn't tapped Approve yet." That reads, from
// here, as exactly what's being seen: taken to the wallet app, nothing to
// approve, forever.
//
// Two changes address this without needing to guess further: (1) a
// pre-flight check (assertConston2InWalletConnectSession, below) against
// this exact connector method — getNamespaceChainsIds(), which reads the
// live session's own namespaces directly (see walletConnect.ts) — surfaces
// a clear, immediate, actionable error the moment this app can tell
// Coston2 isn't actually in the wallet's approved namespace, instead of
// silently trying and hanging; (2) withWalletConnectTimeout wraps the two
// requests that can hang with no built-in timeout of their own
// (provider.request has none — it awaits the relay indefinitely), so even
// the residual case this app has no way to detect in advance (the
// namespace check is empty/inconclusive, or something else entirely
// stalls) still surfaces a clear failure instead of leaving the button
// reading "Confirm in your wallet…" forever with no way out but a reload.
export class WalletConnectChainUnsupportedError extends Error {
  constructor() {
    super("Coston2 is not in this WalletConnect session's approved chains.");
    this.name = "WalletConnectChainUnsupportedError";
  }
}

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
