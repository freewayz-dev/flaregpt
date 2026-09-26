import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import ValidatorRankingCard from "@/pages/FtsoRewards/components/ValidatorRankingCard";
import { renderWithProviders, screen } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API } from "@/test/fixtures";

function mockValidators(validators) {
  server.use(
    http.get(`${API}/api/v1/network/validator-rankings`, () => HttpResponse.json({ validators })),
  );
}

describe("ValidatorRankingCard", () => {
  it("shows the real name as the primary line, NodeID demoted to secondary, when the API provides one", async () => {
    mockValidators([
      {
        node_id: "NodeID-8qMWVar3hLdLSSgbTV57brpqUNjJuU2H8",
        name: "ITB Validator",
        connected: true,
        uptime_pct: 100.0,
        stake_flr: 13340000.0,
        delegator_count: 25,
        fee_pct: 20.0,
      },
    ]);
    renderWithProviders(<ValidatorRankingCard />);

    expect(await screen.findByText("ITB Validator")).toBeInTheDocument();
    expect(screen.getByText("NodeID-8qMWVa…U2H8")).toBeInTheDocument();
  });

  // The real regression this guards against: rendering `row.name`
  // unconditionally left a blank line for the ~40% of live validators
  // with no registered name (a literal `name: null`, not absent).
  // Falling back to the NodeID as the single primary line — not a blank
  // name line above a redundant NodeID — is what this asserts.
  it("falls back to the NodeID as the primary line when the API provides no name", async () => {
    mockValidators([
      {
        node_id: "NodeID-6Ww2bagQbUaZppGWFdBcGamtNDtjap1sD",
        name: null,
        connected: true,
        uptime_pct: 100.0,
        stake_flr: 1090000.0,
        delegator_count: 8,
        fee_pct: 20.0,
      },
    ]);
    renderWithProviders(<ValidatorRankingCard />);

    const nodeIdText = await screen.findByText("NodeID-6Ww2ba…p1sD");
    expect(nodeIdText).toBeInTheDocument();
    // Exactly one occurrence — not duplicated as both a "blank name" row
    // and a demoted secondary line the way the pre-fix version rendered.
    expect(screen.getAllByText("NodeID-6Ww2ba…p1sD")).toHaveLength(1);

    // The avatar must still show a meaningful fallback for this row — the
    // first character *after* the NodeID- prefix ("6"), never a bare "?".
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.queryByText("?")).not.toBeInTheDocument();
  });
});
