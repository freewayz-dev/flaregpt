import { flareApi } from "@/services/apiClient";

// `signal` forwarded to axios on every call here — without it, switching
// wallets left the previous wallet's vault request running to completion
// server-side for no reason (its result lands under the old wallet's cache
// key, never the new one). Matches the pattern in rflrService.js.
//
// Every shape below is derived from real field access in each vault's own
// consumer (the matching Detail component) — grepped, not guessed — per
// this project's standing discipline, now that the DeFi Protocols pages
// are actually being converted (this was deliberately deferred to that
// point during Phase 1). Only the fields real callers read are included.



export async function fetchMxrpyVault(
  walletAddress,
  signal,
) {
  const { data } = await flareApi.get("/api/v1/defi/vaults/mxrpy", {
    params: { user_wallet: walletAddress },
    signal,
  });
  return data;
}



export async function fetchSceptreVault(
  walletAddress,
  signal,
) {
  const { data } = await flareApi.get("/api/v1/defi/vaults/sceptre", {
    params: { user_wallet: walletAddress },
    signal,
  });
  return data;
}



export async function fetchFirelightVault(
  walletAddress,
  signal,
) {
  const { data } = await flareApi.get("/api/v1/defi/vaults/firelight", {
    params: { user_wallet: walletAddress },
    signal,
  });
  return data;
}





// `market` always one of the two slugs the selector restricts to (never
// free text), so the response's own `markets` array is always exactly one
// entry — see useSpectraVault. `user_wallet` omitted (not sent as
// `"undefined"`) when there's no wallet: axios drops a param whose value is
// literally `undefined`, and the endpoint's own global market data (supply,
// maturity) is meaningful without one.
export async function fetchSpectraVault(
  walletAddress,
  market,
  signal,
) {
  const { data } = await flareApi.get("/api/v1/defi/vaults/spectra", {
    params: { user_wallet: walletAddress || undefined, market },
    signal,
  });
  return data;
}





export async function fetchCompareStrategies(
  amountFlr,
  signal,
) {
  const { data } = await flareApi.get("/api/v1/defi/compare-strategies", {
    params: { user_amount_flr: amountFlr },
    signal,
  });
  return data;
}
