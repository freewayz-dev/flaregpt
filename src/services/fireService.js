import { flareApi } from "@/services/apiClient";

// FIRE (Flare Income Reinvestment Entity) — protocol fee revenue collected
// into dedicated pool wallets, tracked per fee category. No auth, no
// params; cached 30 minutes server-side (see useFireQueries.js's matching
// staleTime) — confirmed live.
export async function fetchFireOverview(signal) {
  const { data } = await flareApi.get("/api/v1/fire/overview", { signal });
  return data;
}
