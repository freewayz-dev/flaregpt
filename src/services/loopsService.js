import { flareApi } from "@/services/apiClient";

// Dry-run visibility for the Loops fallback engine — confirmed live this
// needs no auth (it's a global view: who's opted in, not a per-user one),
// so this is what tells the UI whether the *current* wallet is already
// enabled: check `opted_in_wallets` for it, rather than tracking enabled/
// disabled as purely local state that would forget itself on refresh.
export async function fetchGasSniperStatus() {
  const { data } = await flareApi.get("/api/v1/loops/gas-sniper/status");
  return data; // { opted_in_count, opted_in_wallets, recent_dry_run_events }
}

// Confirmed live: `user_wallet` must be the caller's own authenticated
// wallet (a mismatched address 403s — "You can only enable Loops for your
// own authenticated wallet"), and a wallet that hasn't approved the Loops
// keeper as a claim executor on-chain yet 409s with a structured
// `{error: "EXECUTOR_NOT_SET", message, keeper_address,
// claim_setup_manager_address}` body — see GasSniperCard.jsx for how that
// specific case is surfaced rather than shown as a generic failure.
export async function enableGasSniper(walletAddress) {
  const { data } = await flareApi.post("/api/v1/loops/gas-sniper/enable", {
    user_wallet: walletAddress,
  });
  return data;
}

// Confirmed live: idempotent — disabling a wallet that was never enabled
// still responds 200 rather than erroring, so this never needs its own
// "already disabled" special-casing the way some other endpoints do.
export async function disableGasSniper(walletAddress) {
  const { data } = await flareApi.post("/api/v1/loops/gas-sniper/disable", {
    user_wallet: walletAddress,
  });
  return data;
}
