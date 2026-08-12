// Central query key factory — keeps cache keys consistent and avoids magic
// strings scattered across hooks. Add a namespace here per domain as the
// data layer grows (e.g. wallet, governance).
//
// Every builder returns its tuple `as const`: TanStack Query's `queryKey`
// only needs a readonly array structurally, but a literal tuple type here
// is what lets every `useQuery({ queryKey: queryKeys.x.y(...) })` call site
// get real key-shape inference instead of a widened `(string | undefined)[]`
// — the single highest-leverage type in this file, since ~30 call sites
// across src/hooks/queries/ reference it directly.
export const queryKeys = {
  dashboard: {
    all: ["dashboard"],
    health: () => [...queryKeys.dashboard.all, "health"],
    gasPrice: () => [...queryKeys.dashboard.all, "gasPrice"],
    marketOverview: () => [...queryKeys.dashboard.all, "marketOverview"],
    walletBalances: (address) =>
      [...queryKeys.dashboard.all, "walletBalances", address],
    ftsoPortfolio: (address) =>
      [...queryKeys.dashboard.all, "ftsoPortfolio", address],
    flrPriceHistory: (days) =>
      [...queryKeys.dashboard.all, "flrPriceHistory", days],
    flrOhlc: (days) => [...queryKeys.dashboard.all, "flrOhlc", days],
  },
  // One key builder per protocol vault, all namespaced under "vaults" so a
  // wallet disconnect/switch can invalidate every vault query at once if
  // ever needed. New protocols (Clearpool, Spectra, Morpho, ...) just add
  // another builder here alongside their fetch function and hook.
  defiProtocols: {
    all: ["defiProtocols"],
    vaults: (protocolId, address) =>
      [...queryKeys.defiProtocols.all, "vaults", protocolId, address],
    compareStrategies: (amountFlr) =>
      [...queryKeys.defiProtocols.all, "compareStrategies", amountFlr],
    // Spectra is the one vault with more than one market to pick from, so
    // its key needs that extra dimension alongside the address every other
    // vault key already has.
    spectraVault: (market, address) =>
      [...queryKeys.defiProtocols.all, "spectraVault", market, address],
  },
  // `all` alone (no address) lets a future paginated version invalidate
  // every page for a wallet at once. `activity(address)` is the key for
  // today's single-shot fetch; a future cursor-paginated version would key
  // each page as `[...activity(address), cursor]` without touching this
  // shape's callers.
  walletActivity: {
    all: ["walletActivity"],
    activity: (address) =>
      [...queryKeys.walletActivity.all, "activity", address],
  },
  // Gas Sniper's status endpoint is a single global view (who's opted in
  // across every wallet), not scoped per-address — one shared query key
  // covers every caller.
  loops: {
    all: ["loops"],
    gasSniperStatus: () => [...queryKeys.loops.all, "gasSniperStatus"],
  },
  // meltSchedule/exitQuote are per-wallet; networkEmissions/networkStatus
  // are global (no address dimension) — same "all" root either way so a
  // wallet switch could invalidate everything under it at once if needed.
  rflr: {
    all: ["rflr"],
    meltSchedule: (address) =>
      [...queryKeys.rflr.all, "meltSchedule", address],
    exitQuote: (address) =>
      [...queryKeys.rflr.all, "exitQuote", address],
    networkEmissions: () => [...queryKeys.rflr.all, "networkEmissions"],
    networkStatus: () => [...queryKeys.rflr.all, "networkStatus"],
  },
  // Authenticated users only (see useWalletHubStore.js) — a guest's
  // watchlist lives entirely in localStorage and never goes through
  // react-query at all. Keyed by `authenticatedAddress` (not just
  // `enabled`/`hasSession`) for the same reason every other per-wallet key
  // in this file already takes an `address` — without it, switching from
  // Wallet A to Wallet B within this query's own `staleTime` window served
  // Wallet A's still-fresh cache entry to Wallet B's session (same key,
  // same cache slot) until it happened to expire or a manual refresh threw
  // the whole cache away. Scoping the key itself means a different
  // identity is simply a different cache entry — no manual invalidation
  // required on wallet switch.
  watchlist: {
    all: ["watchlist"],
    list: (address) =>
      [...queryKeys.watchlist.all, "list", address],
  },
  // Authenticated users only — a guest's chat has no conversation concept
  // at all (see useFlareGptStore.js), just an ephemeral local transcript.
  // `conversations` scoped by `authenticatedAddress` for the identical
  // reason `watchlist.list` above is — same stale-cross-identity-cache
  // risk, same fix. `conversation(id)` (a single conversation's messages)
  // doesn't need this: it's always fetched with no `staleTime` (see
  // useFlareGptConversation.ts), so it never serves a cached response
  // across a switch regardless of key shape.
  chat: {
    all: ["chat"],
    conversations: (address) =>
      [...queryKeys.chat.all, "conversations", address],
    conversation: (conversationId) =>
      [...queryKeys.chat.all, "conversation", conversationId],
  },
  // Current-contract proposal ids/info go through wagmi's own
  // useReadContract/useReadContracts (which manage their own cache keys) —
  // this namespace is only for the one piece that isn't a plain contract
  // read: a historical proposal's title, fetched via a single-block
  // eth_getLogs call (see useGovernanceQueries.ts's useHistoricalProposals
  // and config/governance.ts's HISTORICAL_PROPOSALS).
  governance: {
    all: ["governance"],
    historicalTitle: (chainId, contractAddress, proposalId) =>
      [...queryKeys.governance.all, "historicalTitle", chainId, contractAddress, proposalId],
  },
};
