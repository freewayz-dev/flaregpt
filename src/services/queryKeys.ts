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
    all: ["dashboard"] as const,
    health: () => [...queryKeys.dashboard.all, "health"] as const,
    gasPrice: () => [...queryKeys.dashboard.all, "gasPrice"] as const,
    marketOverview: () => [...queryKeys.dashboard.all, "marketOverview"] as const,
    walletBalances: (address: string | undefined) =>
      [...queryKeys.dashboard.all, "walletBalances", address] as const,
    ftsoPortfolio: (address: string | undefined) =>
      [...queryKeys.dashboard.all, "ftsoPortfolio", address] as const,
    flrPriceHistory: (days: number) =>
      [...queryKeys.dashboard.all, "flrPriceHistory", days] as const,
    flrOhlc: (days: number) => [...queryKeys.dashboard.all, "flrOhlc", days] as const,
  },
  // One key builder per protocol vault, all namespaced under "vaults" so a
  // wallet disconnect/switch can invalidate every vault query at once if
  // ever needed. New protocols (Clearpool, Spectra, Morpho, ...) just add
  // another builder here alongside their fetch function and hook.
  defiProtocols: {
    all: ["defiProtocols"] as const,
    vaults: (protocolId: string, address: string | undefined) =>
      [...queryKeys.defiProtocols.all, "vaults", protocolId, address] as const,
    compareStrategies: (amountFlr: number) =>
      [...queryKeys.defiProtocols.all, "compareStrategies", amountFlr] as const,
    // Spectra is the one vault with more than one market to pick from, so
    // its key needs that extra dimension alongside the address every other
    // vault key already has.
    spectraVault: (market: string, address: string | undefined) =>
      [...queryKeys.defiProtocols.all, "spectraVault", market, address] as const,
  },
  // `all` alone (no address) lets a future paginated version invalidate
  // every page for a wallet at once. `activity(address)` is the key for
  // today's single-shot fetch; a future cursor-paginated version would key
  // each page as `[...activity(address), cursor]` without touching this
  // shape's callers.
  walletActivity: {
    all: ["walletActivity"] as const,
    activity: (address: string | undefined) =>
      [...queryKeys.walletActivity.all, "activity", address] as const,
  },
  // Gas Sniper's status endpoint is a single global view (who's opted in
  // across every wallet), not scoped per-address — one shared query key
  // covers every caller.
  loops: {
    all: ["loops"] as const,
    gasSniperStatus: () => [...queryKeys.loops.all, "gasSniperStatus"] as const,
  },
  // meltSchedule/exitQuote are per-wallet; networkEmissions/networkStatus
  // are global (no address dimension) — same "all" root either way so a
  // wallet switch could invalidate everything under it at once if needed.
  rflr: {
    all: ["rflr"] as const,
    meltSchedule: (address: string | undefined) =>
      [...queryKeys.rflr.all, "meltSchedule", address] as const,
    exitQuote: (address: string | undefined) =>
      [...queryKeys.rflr.all, "exitQuote", address] as const,
    networkEmissions: () => [...queryKeys.rflr.all, "networkEmissions"] as const,
    networkStatus: () => [...queryKeys.rflr.all, "networkStatus"] as const,
  },
  // Authenticated users only (see useWalletHubStore.js) — a guest's
  // watchlist lives entirely in localStorage and never goes through
  // react-query at all.
  watchlist: {
    all: ["watchlist"] as const,
    list: () => [...queryKeys.watchlist.all, "list"] as const,
  },
  // Authenticated users only — a guest's chat has no conversation concept
  // at all (see useFlareGptStore.js), just an ephemeral local transcript.
  chat: {
    all: ["chat"] as const,
    conversations: () => [...queryKeys.chat.all, "conversations"] as const,
    conversation: (conversationId: string) =>
      [...queryKeys.chat.all, "conversation", conversationId] as const,
  },
  // Current-contract proposal ids/info go through wagmi's own
  // useReadContract/useReadContracts (which manage their own cache keys) —
  // this namespace is only for the one piece that isn't a plain contract
  // read: a historical proposal's title, fetched via a single-block
  // eth_getLogs call (see useGovernanceQueries.ts's useHistoricalProposals
  // and config/governance.ts's HISTORICAL_PROPOSALS).
  governance: {
    all: ["governance"] as const,
    historicalTitle: (chainId: number, contractAddress: string, proposalId: string) =>
      [...queryKeys.governance.all, "historicalTitle", chainId, contractAddress, proposalId] as const,
  },
};
