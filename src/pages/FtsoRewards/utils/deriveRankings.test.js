import { describe, it, expect } from "vitest";

import {
  computeProviderRows,
  computeValidatorRows,
  shortenNodeId,
  nodeIdInitial,
} from "@/pages/FtsoRewards/utils/deriveRankings";

describe("computeProviderRows", () => {
  it("maps address/name/weight/fee straight through from the raw API shape", () => {
    const rows = computeProviderRows({
      providers: [
        { address: "0xAbC", name: "Flare.Space", weight_share_pct: 3.632, fee_pct: 20.0 },
      ],
    });

    expect(rows).toEqual([
      { key: "0xAbC", address: "0xAbC", name: "Flare.Space", weightSharePct: 3.632, feePct: 20.0 },
    ]);
  });

  it("returns an empty array when there's no data yet (still loading)", () => {
    expect(computeProviderRows(undefined)).toEqual([]);
  });
});

describe("computeValidatorRows", () => {
  // The real regression this guards against: the backend added name
  // resolution for validators after this file's own comments (and this
  // mapping) were written assuming no such field would ever exist —
  // confirmed live via a direct API check, not assumed.
  it("maps the validator's real `name` field, not just its nodeId", () => {
    const rows = computeValidatorRows({
      validators: [
        {
          node_id: "NodeID-8qMWVar3hLdLSSgbTV57brpqUNjJuU2H8",
          name: "ITB Validator",
          connected: true,
          uptime_pct: 100.0,
          stake_flr: 13340000.0,
          delegator_count: 25,
          fee_pct: 20.0,
        },
      ],
    });

    expect(rows).toEqual([
      {
        key: "NodeID-8qMWVar3hLdLSSgbTV57brpqUNjJuU2H8",
        nodeId: "NodeID-8qMWVar3hLdLSSgbTV57brpqUNjJuU2H8",
        name: "ITB Validator",
        connected: true,
        uptimePct: 100.0,
        stakeFlr: 13340000.0,
        delegatorCount: 25,
        feePct: 20.0,
      },
    ]);
  });

  // Real, live behavior (not a hypothetical) — 8 of 20 validators in the
  // real API response have a literal `name: null`, not a missing field or
  // an empty string. This must map straight through as `null`, not get
  // coerced into an empty string or a placeholder here — ValidatorRow is
  // what decides how to render it.
  it("maps a validator's null name through as null, not a placeholder", () => {
    const rows = computeValidatorRows({
      validators: [
        {
          node_id: "NodeID-6Ww2bagQbUaZppGWFdBcGamtNDtjap1sD",
          name: null,
          connected: true,
          uptime_pct: 100.0,
          stake_flr: 1090000.0,
          delegator_count: 8,
          fee_pct: 20.0,
        },
      ],
    });

    expect(rows[0].name).toBeNull();
  });

  it("returns an empty array when there's no data yet (still loading)", () => {
    expect(computeValidatorRows(undefined)).toEqual([]);
  });
});

describe("shortenNodeId", () => {
  it("keeps the NodeID- prefix intact and truncates only the base58 id", () => {
    expect(shortenNodeId("NodeID-8qMWVar3hLdLSSgbTV57brpqUNjJuU2H8")).toBe("NodeID-8qMWVa…U2H8");
  });

  it("returns the id unchanged if it's already short enough", () => {
    expect(shortenNodeId("NodeID-shortid")).toBe("NodeID-shortid");
  });

  it("returns an empty string for a missing nodeId", () => {
    expect(shortenNodeId(undefined)).toBe("");
  });
});

describe("nodeIdInitial", () => {
  // The real reason this exists as its own function rather than just
  // `nodeId.charAt(0)`: every NodeID starts with the same "NodeID-"
  // prefix, so the literal first character is always "N" — not a
  // meaningfully distinguishing fallback for RankingAvatar, which is
  // exactly the "unclear placeholder" this is meant to avoid.
  it("returns the first character after the NodeID- prefix, not the literal first character", () => {
    expect(nodeIdInitial("NodeID-6Ww2bagQbUaZppGWFdBcGamtNDtjap1sD")).toBe("6");
  });

  it("still works for an id with no NodeID- prefix", () => {
    expect(nodeIdInitial("6Ww2bag")).toBe("6");
  });

  it("returns undefined for a missing nodeId, not a falsy string RankingAvatar could render blank", () => {
    expect(nodeIdInitial(undefined)).toBeUndefined();
    expect(nodeIdInitial("")).toBeUndefined();
  });
});
