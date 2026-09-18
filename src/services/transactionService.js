import { flareApi } from "@/services/apiClient";

// C-chain-only transaction lookup by hash — no auth, no wallet involved at
// all (this is deliberately not scoped to any connected/watched address).
// `found: false` (not_found or invalid_format) is a normal, successful
// response shape from this endpoint, not an error — only a genuine
// network/5xx failure should ever reject here.
export async function fetchTransaction(txHash, signal) {
  const { data } = await flareApi.get(`/api/v1/transaction/${txHash}`, { signal });
  return data;
}
