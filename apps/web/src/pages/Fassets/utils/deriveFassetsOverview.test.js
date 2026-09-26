import { describe, it, expect } from "vitest";

import { computeFlowTrend, computePendingRedemptions } from "@/pages/Fassets/utils/deriveFassetsOverview";

describe("computeFlowTrend", () => {
  it("returns an empty array when trend_daily is null, undefined, or empty", () => {
    expect(computeFlowTrend(null)).toEqual([]);
    expect(computeFlowTrend(undefined)).toEqual([]);
    expect(computeFlowTrend([])).toEqual([]);
  });

  it("splits trend_daily into minted/redeemed facets, sorted oldest-first regardless of input order", () => {
    const result = computeFlowTrend([
      { date: "2026-09-15", minted_fxrp: 200, redeemed_fxrp: 300 },
      { date: "2026-09-14", minted_fxrp: 100, redeemed_fxrp: 150 },
    ]);

    expect(result).toEqual([
      {
        facet: "minted",
        points: [
          { date: "2026-09-14", value: 100 },
          { date: "2026-09-15", value: 200 },
        ],
      },
      {
        facet: "redeemed",
        points: [
          { date: "2026-09-14", value: 150 },
          { date: "2026-09-15", value: 300 },
        ],
      },
    ]);
  });
});

describe("computePendingRedemptions", () => {
  it("returns null when agents hasn't loaded yet (undefined/null), distinct from a genuine zero", () => {
    expect(computePendingRedemptions(undefined)).toBeNull();
    expect(computePendingRedemptions(null)).toBeNull();
  });

  it("returns 0 for an empty (but loaded) agent list", () => {
    expect(computePendingRedemptions([])).toBe(0);
  });

  it("sums redeeming_fxrp across every agent, treating a missing field as 0", () => {
    expect(
      computePendingRedemptions([
        { redeeming_fxrp: 100.5 },
        { redeeming_fxrp: 0 },
        {}, // a hypothetical agent missing the field entirely
      ]),
    ).toBe(100.5);
  });
});
