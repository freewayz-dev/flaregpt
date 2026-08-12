import { flareApi } from "@/services/apiClient";

// `signal` is react-query's own AbortController signal, threaded straight
// through to axios — without it, switching wallets left the *previous*
// wallet's request running to completion (or timeout) in the background
// instead of being cancelled, which does nothing for the user (its result
// lands under the old wallet's cache key, not the new one) while still
// tying up a connection against a backend that, per melt-schedule below, is
// already under real load.

// Confirmed via deriveVesting.ts's real field access
// (computeUnlockTimeline/buildMeltScheduleRows).




// A wallet that never earned any rFLR gets a completely different response
// shape — confirmed live: `{"status":"No Balance","net_payout_if_exiting":0}`,
// with none of the balance/locked/efficiency fields present at all (see
// deriveVesting.ts's computeVestingSummary, which branches on exactly this).
// `status`/most fields are therefore optional; `net_payout_if_exiting` is the
// one field confirmed present in both response shapes.


// Fields confirmed via NetworkPulseSection.jsx's own real usage
// (formatDate(statusQuery.data.next_distribution_date), etc.) — not
// documented anywhere else.


// Same reasoning as NetworkStatusResponse — confirmed via
// NetworkPulseSection.jsx's real field access.


export async function fetchMeltSchedule(
  walletAddress,
  signal,
) {
  // Confirmed live: a wallet the backend hasn't scanned before can take
  // ~30s here (it appears to do a fresh on-chain lookup, sometimes hitting
  // Flare's own public RPC rate limit and 500ing) before the result gets
  // cached server-side — every later call for that same address returns in
  // well under a second. The default 15s client timeout would abort a
  // request that was genuinely on track to succeed, so this one gets a
  // longer allowance instead of being treated as hung.
  const { data } = await flareApi.get(
    `/api/v1/rflr/melt-schedule/${walletAddress}`,
    { signal, timeout: 35_000 },
  );
  return data;
}

export async function fetchExitQuote(
  walletAddress,
  signal,
) {
  const { data } = await flareApi.get(
    `/api/v1/rflr/exit-quote/${walletAddress}`,
    { signal },
  );
  return data;
}

export async function fetchNetworkEmissions(
  signal,
) {
  const { data } = await flareApi.get("/api/v1/network/emissions", { signal });
  return data;
}

export async function fetchNetworkStatus(signal) {
  const { data } = await flareApi.get("/api/v1/network/status", { signal });
  return data;
}
