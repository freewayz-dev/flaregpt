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

// Both fields are optional (confirmed live: nickname-only, address-only,
// and both-at-once all succeed) — only send what the caller actually
// changed, so a same-address "just renaming the nickname" edit never risks
// tripping the backend's own duplicate-address check against itself.
// Response: { address, nickname, added_at } — `address` reflects
// `new_address` if one was given. A conflicting `new_address` and a
// conflicting `nickname` both respond 409, but with distinguishable
// `detail` text (confirmed live: "This address is already on your
// watchlist." vs "Nickname '<name>' is already used for another watched
// wallet.") — see interpretWatchlistError in Wallets.jsx, which is what
// actually tells the two apart for the UI. Editing an address that's no
// longer on the list responds 404.
export async function updateWatchlistWallet(address, { nickname, newAddress } = {}) {
  const payload = {};
  if (nickname !== undefined) payload.nickname = nickname;
  if (newAddress !== undefined) payload.new_address = newAddress;
  const { data } = await flareApi.patch(`/api/v1/watchlist/${address}`, payload);
  return data;
}
