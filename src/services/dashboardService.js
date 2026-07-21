// Placeholder data layer for the dashboard. No backend exists yet, so each
// function below simulates a network round trip and resolves with mock data
// shaped the way the real API is expected to respond. Swap the body of each
// function for a real request (e.g. `axios.get("/api/dashboard/stats")`) once
// a backend exists — the call sites (see hooks/queries/useDashboardQueries.js)
// don't need to change.

const MOCK_LATENCY_MS = 500;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_MARKET_STATS = [
  { id: "flr-price", title: "FLR Price", value: "$0.034", change: "+5.2%" },
  { id: "market-cap", title: "Market Cap", value: "$2.4B", change: "+2.4%" },
  { id: "tvl", title: "TVL", value: "$450M", change: "+7.1%" },
  { id: "protocols", title: "Protocols", value: "32", change: "+3" },
];

const MOCK_ACTIVITY = [
  { id: "1", label: "Whale moved 5M FLR" },
  { id: "2", label: "New governance proposal created" },
  { id: "3", label: "Rewards claimed" },
  { id: "4", label: "Delegation updated" },
];

const MOCK_HOLDINGS = [
  { symbol: "FLR", allocationPct: 65 },
  { symbol: "SGB", allocationPct: 15 },
  { symbol: "rFLR", allocationPct: 12 },
  { symbol: "Others", allocationPct: 8 },
];

export async function fetchMarketStats() {
  await delay(MOCK_LATENCY_MS);
  return MOCK_MARKET_STATS;
}

export async function fetchRecentActivity() {
  await delay(MOCK_LATENCY_MS);
  return MOCK_ACTIVITY;
}

export async function fetchHoldings() {
  await delay(MOCK_LATENCY_MS);
  return MOCK_HOLDINGS;
}
