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
};
