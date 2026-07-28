import { flareApi } from "@/services/apiClient";

// Requires auth (confirmed live: 401 without a session) — this is only
// ever called for a signed-in user; guests use their own local-only list
// (see useWalletHubStore.js).
export async function fetchWatchlist() {
  const { data } = await flareApi.get("/api/v1/watchlist");
  return data.wallets ?? [];
}

// Response: { address, nickname, added_at } (added_at is a unix seconds
// timestamp). Adding an address already on the list responds 409 — the
// guest→account sync flow relies on that specifically to skip an address
// that's already there rather than treating it as a failure.
export async function addWatchlistWallet(address, nickname) {
  const { data } = await flareApi.post("/api/v1/watchlist", {
    address,
    nickname: nickname || null,
  });
  return data;
}

// Response: { status: "removed", address }. Removing an address that
// isn't on the list responds 404.
export async function removeWatchlistWallet(address) {
  const { data } = await flareApi.delete(`/api/v1/watchlist/${address}`);
  return data;
}
