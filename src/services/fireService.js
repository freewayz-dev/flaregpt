import { flareApi } from "@/services/apiClient";

// FIRE (Flare Income Reinvestment Entity) — protocol fee revenue collected
// into dedicated pool wallets, tracked per fee category. No auth, no
// params; cached 30 minutes server-side (see useFireQueries.js's matching
// staleTime) — confirmed live.
export async function fetchFireOverview(signal) {
  const { data } = await flareApi.get("/api/v1/fire/overview", { signal });
  return data;
}

// Additive, separate from the call above — v1 stays the page's source of
// truth for everything it already shows (stats, pools table, burned
// progress). v2 is fetched independently, purely to power the historical
// trend chart (`daily_history`), which v1 has no equivalent field for at
// all. Same 30-min server-side cache window as v1 in the normal case (see
// useFireQueries.js), degrading server-side rather than erroring — a
// `source`/`degraded` pair on the response, never a non-2xx, is how that's
// surfaced.
export async function fetchFireOverviewV2(signal) {
  const { data } = await flareApi.get("/api/v1/fire/overview/v2", { signal });
  return data;
}
