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
// Lives in its own module (not inside GasSniperCard.jsx) purely so that
// file can stay component-only for fast refresh — this has no UI of its
// own to render.
export async function switchToConston2ViaRawRequest(connector) {
  const provider = await connector.getProvider();
  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: `0x${coston2.id.toString(16)}` }],
  });
  provider.chainId = coston2.id;
  connector.emitter.emit("change", { chainId: coston2.id });
}
