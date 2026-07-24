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
  },
};
