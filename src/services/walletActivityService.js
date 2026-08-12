

import { flareApi } from "@/services/apiClient";

// `flareApi`'s default 15s timeout is sized for fast, per-request endpoints
// — this one isn't. A wallet with 10,000+ indexed actions can take several
// minutes to return today (no backend pagination yet), so the default
// would abort — and then retry, and abort again — long before a real
// response ever has a chance to arrive. A large, explicit override doesn't
// make the request faster, it just stops the client from actively working
// against it. Once cursor-based pagination exists backend-side, each page
// request becomes fast again and this override (and the resilience config
// in useWalletActivityQueries.js built around it) should shrink back down
// to match every other wallet-scoped endpoint.
const LARGE_WALLET_TIMEOUT_MS = 6 * 60 * 1000;

// Fields confirmed via real consumption in
// src/pages/WalletActivity/utils/deriveActivity.ts, TransactionRow.jsx, and
// TransactionDrawer.jsx (transaction_hash, asset, timestamp, action_tag,
// amount, block_number) — not a complete, independently-verified contract,
// just what today's real callers actually read. The index signature is the
// honest admission that more fields likely exist.




// Shape today: one response with the full `history` array and a
// `total_actions_indexed` count. A future paginated backend would add
// `cursor`/`limit` params here and the response would gain a `next_cursor`
// (or similar) alongside a page-sized `history` — callers of this function
// (see useWalletActivityQueries.js) already only ever read `history` and
// `total_actions_indexed` off the result, so that change stays contained
// to this one function rather than rippling out to every consumer.
export async function fetchWalletActivity(walletAddress) {
  const { data } = await flareApi.get(
    `/api/v1/portfolio/activity/${walletAddress}`,
    { timeout: LARGE_WALLET_TIMEOUT_MS },
  );
  return data;
}
