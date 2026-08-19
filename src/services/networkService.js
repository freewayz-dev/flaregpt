import { flareApi } from "@/services/apiClient";

// All three confirmed live, unauthenticated GETs — see the FTSO/Validators
// "coming soon" tables (ComingSoonTableCard.jsx) and the FTSO page's own
// personal-stake card, which this backs.

// Ranked by live on-chain delegated vote weight and fee, not by reward
// performance — the backend's own OpenAPI description is explicit that
// performance "isn't reliably queryable on-chain." Some entries have
// `name: "Unknown Provider"` (no registered display name) — real API
// behavior, not a placeholder to guess around.
export async function fetchFtsoProviderRankings(limit = 20, signal) {
  const { data } = await flareApi.get("/api/v1/ftso/provider-rankings", {
    params: { limit },
    signal,
  });
  return data;
}

// No name resolution — confirmed via the backend's own OpenAPI description
// ("No name resolution available... identified by NodeID"), and confirmed
// live: every entry's only identifier is `node_id`, unlike provider
// rankings' `name` field.
export async function fetchValidatorRankings(limit = 20, signal) {
  const { data } = await flareApi.get("/api/v1/network/validator-rankings", {
    params: { limit },
    signal,
  });
  return data;
}

// A wallet's P-Chain staking position — confirmed live against 8 real
// addresses (7 real FTSO/staking-infra providers plus Sceptre's sFLR
// contract), all returning the same not-staked shape:
// `{ status: "NOT_STAKED", wallet, p_chain_identity: null, stakes: [] }`.
// The populated (`stakes.length > 0`) shape was never observed live — no
// real staked wallet was available to test against — so callers must not
// assume any field beyond what's already been confirmed real.
export async function fetchValidatorStakes(userWallet, signal) {
  const { data } = await flareApi.get(
    `/api/v1/network/validator-stakes/${userWallet}`,
    { signal },
  );
  return data;
}
