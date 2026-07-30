// Central query key factory — keeps cache keys consistent and avoids magic
// strings scattered across hooks. Add a namespace here per domain as the
// data layer grows (e.g. wallet, governance).
export const queryKeys = {
  dashboard: {
    all: ["dashboard"],
    health: () => [...queryKeys.dashboard.all, "health"],
    gasPrice: () => [...queryKeys.dashboard.all, "gasPrice"],
    marketOverview: () => [...queryKeys.dashboard.all, "marketOverview"],
    walletBalances: (address) => [
      ...queryKeys.dashboard.all,
      "walletBalances",
      address,
    ],
    ftsoPortfolio: (address) => [
      ...queryKeys.dashboard.all,
      "ftsoPortfolio",
      address,
    ],
    flrPriceHistory: (days) => [
      ...queryKeys.dashboard.all,
      "flrPriceHistory",
      days,
    ],
    flrOhlc: (days) => [...queryKeys.dashboard.all, "flrOhlc", days],
  },
  // One key builder per protocol vault, all namespaced under "vaults" so a
  // wallet disconnect/switch can invalidate every vault query at once if
  // ever needed. New protocols (Clearpool, Spectra, Morpho, ...) just add
  // another builder here alongside their fetch function and hook.
  defiProtocols: {
    all: ["defiProtocols"],
    vaults: (protocolId, address) => [
      ...queryKeys.defiProtocols.all,
      "vaults",
      protocolId,
      address,
    ],
    compareStrategies: (amountFlr) => [
      ...queryKeys.defiProtocols.all,
      "compareStrategies",
      amountFlr,
    ],
    // Spectra is the one vault with more than one market to pick from, so
    // its key needs that extra dimension alongside the address every other
    // vault key already has.
    spectraVault: (market, address) => [
      ...queryKeys.defiProtocols.all,
      "spectraVault",
      market,
      address,
    ],
  },
  // `all` alone (no address) lets a future paginated version invalidate
  // every page for a wallet at once. `activity(address)` is the key for
  // today's single-shot fetch; a future cursor-paginated version would key
  // each page as `[...activity(address), cursor]` without touching this
  // shape's callers.
  walletActivity: {
    all: ["walletActivity"],
    activity: (address) => [...queryKeys.walletActivity.all, "activity", address],
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
    meltSchedule: (address) => [...queryKeys.rflr.all, "meltSchedule", address],
    exitQuote: (address) => [...queryKeys.rflr.all, "exitQuote", address],
    networkEmissions: () => [...queryKeys.rflr.all, "networkEmissions"],
    networkStatus: () => [...queryKeys.rflr.all, "networkStatus"],
  },
  // Authenticated users only (see useWalletHubStore.js) — a guest's
  // watchlist lives entirely in localStorage and never goes through
  // react-query at all.
  watchlist: {
    all: ["watchlist"],
    list: () => [...queryKeys.watchlist.all, "list"],
  },
  // Authenticated users only — a guest's chat has no conversation concept
  // at all (see useFlareGptStore.js), just an ephemeral local transcript.
  chat: {
    all: ["chat"],
    conversations: () => [...queryKeys.chat.all, "conversations"],
    conversation: (conversationId) => [...queryKeys.chat.all, "conversation", conversationId],
  },
};
