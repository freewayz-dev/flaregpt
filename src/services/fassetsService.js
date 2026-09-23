import { flareApi } from "@/services/apiClient";

// FAssets — FXRP ecosystem overview (supply, agents, core-vault share,
// proof of reserve, 24h mint/redeem flow, daily trend). No auth, no
// required params. FlareMetrics-backed with an on-chain fallback baked
// into the response itself (`source`/`degraded`), never a non-2xx — same
// contract as Fire's own overview endpoint (see fireService.js).
export async function fetchFassetsOverview(signal) {
  const { data } = await flareApi.get("/api/v1/fassets/overview", { signal });
  return data;
}

// Every FXRP minting agent vault, fully on-chain — no third party, no
// fallback needed (unlike the overview endpoint above). `sort` selects
// which field the backend orders by server-side; each row's own `rank`
// reflects only this — never a quality/safety signal (see AgentsTable.jsx's
// own comment on why every row must stay visually equal regardless of it).
// The response is `{ sorted_by, lot_size_fxrp, agents: [...] }`, not a bare
// array — confirmed live — so callers read `.agents` off the result rather
// than treating this function's return value as the list itself.
export async function fetchFassetsAgents(sort, signal) {
  const { data } = await flareApi.get("/api/v1/fassets/agents", {
    params: { sort },
    signal,
  });
  return data;
}
