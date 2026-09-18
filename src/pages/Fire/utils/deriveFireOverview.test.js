import { describe, it, expect } from "vitest";

import { computeDailyTrend } from "@/pages/Fire/utils/deriveFireOverview";

describe("computeDailyTrend", () => {
  it("returns an empty array for missing/empty daily_history", () => {
    expect(computeDailyTrend(undefined)).toEqual([]);
    expect(computeDailyTrend(null)).toEqual([]);
    expect(computeDailyTrend([])).toEqual([]);
  });

  it("groups by token, converts by that token's decimals, and sorts by period ascending", () => {
    const result = computeDailyTrend([
      { stream: "fdc", token: "FLR", periodId: "2026-09-17", accrued: "1200000000000000000000" },
      { stream: "fdc", token: "FLR", periodId: "2026-09-16", accrued: "1000000000000000000000" },
      { stream: "fasset_minting_fee", token: "FXRP", periodId: "2026-09-16", accrued: "500000000" },
    ]);

    const flr = result.find((s) => s.token === "FLR");
    const fxrp = result.find((s) => s.token === "FXRP");

    expect(flr.points.map((p) => p.periodId)).toEqual(["2026-09-16", "2026-09-17"]);
    expect(flr.points[0].accrued).toBeCloseTo(1000, 5); // 1e21 wei / 1e18 decimals
    expect(fxrp.points[0].accrued).toBeCloseTo(500, 5); // 5e8 wei / 1e6 decimals
  });

  it("sums multiple streams that share the same token into one series", () => {
    const result = computeDailyTrend([
      { stream: "fasset_minting_fee", token: "FXRP", periodId: "2026-09-16", accrued: "300000000" },
      { stream: "fasset_redemption_fee", token: "FXRP", periodId: "2026-09-16", accrued: "200000000" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].token).toBe("FXRP");
    expect(result[0].points[0].accrued).toBeCloseTo(500, 5);
  });
});
