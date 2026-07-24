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

export async function fetchCompareStrategies(amountFlr) {
  const { data } = await flareApi.get("/api/v1/defi/compare-strategies", {
    params: { user_amount_flr: amountFlr },
  });
  return data;
}
