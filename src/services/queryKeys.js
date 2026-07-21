// Central query key factory — keeps cache keys consistent and avoids magic
// strings scattered across hooks. Add a namespace here per domain as the
// data layer grows (e.g. wallet, governance).
export const queryKeys = {
  dashboard: {
    all: ["dashboard"],
    stats: () => [...queryKeys.dashboard.all, "stats"],
    activity: () => [...queryKeys.dashboard.all, "activity"],
    holdings: () => [...queryKeys.dashboard.all, "holdings"],
  },
};
