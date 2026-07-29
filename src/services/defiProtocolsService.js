import { flareApi } from "@/services/apiClient";

export async function fetchMxrpyVault(walletAddress) {
  const { data } = await flareApi.get("/api/v1/defi/vaults/mxrpy", {
    params: { user_wallet: walletAddress },
  });
  return data;
}

export async function fetchSceptreVault(walletAddress) {
  const { data } = await flareApi.get("/api/v1/defi/vaults/sceptre", {
    params: { user_wallet: walletAddress },
  });
  return data;
}

export async function fetchFirelightVault(walletAddress) {
  const { data } = await flareApi.get("/api/v1/defi/vaults/firelight", {
    params: { user_wallet: walletAddress },
  });
  return data;
}

// `market` always one of the two slugs the selector restricts to (never
// free text), so the response's own `markets` array is always exactly one
// entry — see useSpectraVault. `user_wallet` omitted (not sent as
// `"undefined"`) when there's no wallet: axios drops a param whose value is
// literally `undefined`, and the endpoint's own global market data (supply,
// maturity) is meaningful without one.
export async function fetchSpectraVault(walletAddress, market) {
  const { data } = await flareApi.get("/api/v1/defi/vaults/spectra", {
    params: { user_wallet: walletAddress || undefined, market },
  });
  return data;
}

export async function fetchCompareStrategies(amountFlr) {
  const { data } = await flareApi.get("/api/v1/defi/compare-strategies", {
    params: { user_amount_flr: amountFlr },
  });
  return data;
}
