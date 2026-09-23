import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import Fassets from "@/pages/Fassets";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API } from "@/test/fixtures";

const AGENT = {
  vault_address: "0x09011d2A11A40DB855Cb00B3AA5a0F5F3bd485FD",
  name: "White Knight",
  description: "Liquidating with good intentions",
  icon_url: "https://example.com/icon.png",
  terms_url: null,
  publicly_available: true,
  in_liquidation: false,
  fee_pct: 0.1,
  pool_fee_share_pct: 30.0,
  free_capacity_fxrp: 302750.0,
  minted_fxrp: 75370.76,
  reserved_fxrp: 0.0,
  redeeming_fxrp: 1250.5,
  vault_collateral_ratio: 7.0235,
  pool_collateral_ratio: 6.67,
  minting_vault_collateral_ratio_min: 1.4,
  minting_pool_collateral_ratio_min: 1.7,
  underlying_address: "rGWGTbxqmpLJ3TYGjoCFDqY9mPQ4T1GTGb",
  rank: 1,
};

// Confirmed live: `{ sorted_by, lot_size_fxrp, agents: [...] }`, not a bare
// array — see fassetsService.js's own comment.
function agentsResponse(agents) {
  return { sorted_by: "free_capacity", lot_size_fxrp: 10.0, agents };
}

const OVERVIEW_RESPONSE = {
  source: "flaremetrics",
  attribution: "Data provided by FlareMetrics (flaremetrics.io)",
  degraded: false,
  note: "FXRP amounts are in FXRP (6 decimals, already scaled).",
  supply: {
    fxrp_supply: 145363031.75,
    minting_cap: 170000000,
    cap_used_pct: 85.51,
    price_usd: 1.534,
    tvl_usd: 223052304.08,
    lot_size_fxrp: 10.0,
    lots: { all: 14615602, minted: 14536303, available: 79299 },
    minted_lots_pct: 99.46,
  },
  agents: {
    count: 6,
    in_liquidation: 0,
    agent_minted_fxrp: 1385896.68,
    core_vault_supply_fxrp: 143977135.07,
    core_vault_share_pct: 99.05,
    core_vault_supply_is_derived: false,
  },
  proof_of_reserve: { total_fxrp: 145363031.75, ratio_pct: 100.01 },
  holders: 12530,
  limits: {
    hourly_limit_fxrp: 4000000.0,
    hourly_minted_fxrp: 130.33,
    daily_limit_fxrp: 24778381.13,
    daily_minted_fxrp: 23673.96,
  },
  flow_24h: {
    mints_completed: { fxrp: 28230.0, usd: 45509.85, tx: 36 },
    payment_defaults: 8,
    mint_success_rate_pct: 81.8,
    redemptions: { fxrp: 219766.82, usd: 281989.42, tx: 70 },
    net_fxrp: -191536.82,
  },
  trend_daily: [
    { date: "2026-09-14", minted_fxrp: 113480, redeemed_fxrp: 148181 },
    { date: "2026-09-15", minted_fxrp: 98230, redeemed_fxrp: 120044 },
  ],
};

// On-chain fallback only ever guarantees supply/agents — every other
// section (proof of reserve, holders, limits, 24h flow, trend chart) is
// null, same contract Fire's own v2 degraded/fallback response uses.
const FALLBACK_RESPONSE = {
  source: "onchain_fallback",
  attribution: null,
  degraded: true,
  note: "FXRP amounts are in FXRP (6 decimals, already scaled).",
  supply: OVERVIEW_RESPONSE.supply,
  agents: { ...OVERVIEW_RESPONSE.agents, core_vault_supply_is_derived: true },
  proof_of_reserve: null,
  holders: null,
  limits: null,
  flow_24h: null,
  trend_daily: null,
};

describe("Fassets", () => {
  it("shows the stats row (including holders), a collapsed info disclosure, the flow card, the daily limit bar, the trend chart, and the agent table once data loads", async () => {
    server.use(
      http.get(`${API}/api/v1/fassets/overview`, () => HttpResponse.json(OVERVIEW_RESPONSE)),
      http.get(`${API}/api/v1/fassets/agents`, () => HttpResponse.json(agentsResponse([AGENT]))),
    );
    renderWithProviders(<Fassets />);

    expect(await screen.findByText("Total Value Locked")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument(); // agent count — an integer, no rounding ambiguity
    expect(screen.getByText("100.0%")).toBeInTheDocument(); // proof-of-reserve ratio_pct (100.01 -> "100.0%")
    expect(screen.getByText("Holders")).toBeInTheDocument();
    expect(screen.getByText("12,530")).toBeInTheDocument();
    // agents.in_liquidation is 0 in this fixture — the neutral note only
    // renders when there's actually something to say (see
    // FassetsStatsRow.jsx's own comment).
    expect(screen.queryByText(/in liquidation/)).not.toBeInTheDocument();

    // The plain-language explainer sits behind a collapsed-by-default
    // Disclosure — the API's own raw `note`/`attribution` fields are never
    // rendered anywhere (see index.jsx's own comment on why).
    expect(screen.getByText("What do these numbers mean?")).toBeInTheDocument();
    expect(screen.queryByText(/This section covers the FXRP network/)).not.toBeInTheDocument();
    expect(screen.queryByText(/FXRP amounts are in FXRP/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Data provided by FlareMetrics/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("What do these numbers mean?"));
    expect(await screen.findByText(/This section covers the FXRP network/)).toBeInTheDocument();

    expect(screen.getByText("24h Flow")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument(); // payment_defaults, rendered as a neutral fact
    // Matches twice: the visible label, plus InfoHint's own always-mounted
    // (just visually hidden) popover heading reusing the same label text —
    // see InfoHint.jsx's own comment on why its panel is always in the DOM.
    expect(screen.getAllByText("Daily Minting Limit")).toHaveLength(2);

    expect(screen.getByText("Daily Trend")).toBeInTheDocument();

    // AgentsTable renders both a mobile card list and a desktop table for
    // the same data (see AgentsTable.jsx); jsdom doesn't evaluate the
    // sm:hidden/hidden sm:block breakpoint classes that keep only one
    // visible in a real browser, so both are present in the test DOM —
    // same pattern Fire/index.test.jsx already documents for its own
    // pools table.
    expect(await screen.findAllByText("White Knight")).toHaveLength(2);
    expect(screen.getAllByText("Liquidating with good intentions")).toHaveLength(2);

    // `icon_url` renders as a real <img> (RankingAvatar's `logoSrc`), not
    // the initials-only fallback — see AgentsTable.jsx's own comment on
    // why this is safe to consume directly.
    const avatarImages = document.querySelectorAll('img[src="https://example.com/icon.png"]');
    expect(avatarImages.length).toBe(2); // mobile card + desktop row

    // FXRP price, agent minimum ratios, and pool fee share — all real
    // fields that previously went unused (see the API audit this round).
    expect(screen.getByText("FXRP Price")).toBeInTheDocument();
    // Ratio + minimum, mobile card + desktop row = 2 matches each.
    expect(screen.getAllByText("7.02 · min 1.4")).toHaveLength(2);
    expect(screen.getAllByText("Pool 6.67 · min 1.7")).toHaveLength(2);
    expect(screen.getAllByText("Pool 30%")).toHaveLength(2);

    // Pending redemptions (summed from the agents list's own
    // `redeeming_fxrp`) sits inside the same 24h Flow card, not a new one.
    expect(screen.getByText("Pending Redemptions")).toBeInTheDocument();
    expect(screen.getByText("1,250.5 FXRP")).toBeInTheDocument();

    // FxrpBalanceCard sits right after the stats row — no wallet connected
    // in this render, so it shows the explicit "0" rather than being
    // skipped entirely (see the component's own comment on why).
    expect(screen.getByText("Your FXRP Balance")).toBeInTheDocument();
    expect(screen.getByText("0 FXRP")).toBeInTheDocument();
  });

  it("omits the daily limit bar, mint/redeem flow tiles, and the trend chart on the on-chain-fallback response, without disturbing the stats row, the info disclosure, or pending redemptions", async () => {
    server.use(
      http.get(`${API}/api/v1/fassets/overview`, () => HttpResponse.json(FALLBACK_RESPONSE)),
      http.get(`${API}/api/v1/fassets/agents`, () => HttpResponse.json(agentsResponse([AGENT]))),
    );
    renderWithProviders(<Fassets />);

    expect(await screen.findByText("Total Value Locked")).toBeInTheDocument();
    expect(screen.getByText("What do these numbers mean?")).toBeInTheDocument();
    expect(screen.queryByText("Mint Success Rate")).not.toBeInTheDocument();
    expect(screen.queryByText("Daily Minting Limit")).not.toBeInTheDocument();
    expect(screen.queryByText("Daily Trend")).not.toBeInTheDocument();
    // Reserve ratio and holders are FlareMetrics-only — neither stat card renders.
    expect(screen.queryByText("Reserve Ratio")).not.toBeInTheDocument();
    expect(screen.queryByText("Holders")).not.toBeInTheDocument();
    // `redeeming_fxrp` comes from the agents endpoint, which has no
    // fallback concept at all — pending redemptions still renders on its
    // own, independent of the overview's own degraded state (see
    // FassetsFlowCard.jsx's own comment on why).
    expect(await screen.findByText("Pending Redemptions")).toBeInTheDocument();
    expect(screen.getByText("1,250.5 FXRP")).toBeInTheDocument();
  });

  it("shows a neutral in-liquidation note when agents.in_liquidation is non-zero", async () => {
    server.use(
      http.get(`${API}/api/v1/fassets/overview`, () =>
        HttpResponse.json({ ...OVERVIEW_RESPONSE, agents: { ...OVERVIEW_RESPONSE.agents, in_liquidation: 2 } }),
      ),
      http.get(`${API}/api/v1/fassets/agents`, () => HttpResponse.json(agentsResponse([AGENT]))),
    );
    renderWithProviders(<Fassets />);

    expect(await screen.findByText("2 agents are currently in liquidation.")).toBeInTheDocument();
  });

  it("shows an error state with a working retry button when the overview request fails", async () => {
    server.use(
      http.get(`${API}/api/v1/fassets/overview`, () => HttpResponse.json({ error: "boom" }, { status: 500 })),
    );
    renderWithProviders(<Fassets />);

    expect(
      await screen.findByText("Couldn't load FAssets data.", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("re-fetches agents with the newly selected sort when a sort option is clicked", async () => {
    const OTHER_AGENT = { ...AGENT, vault_address: "0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa", name: "Steady Hands" };
    server.use(
      http.get(`${API}/api/v1/fassets/overview`, () => HttpResponse.json(OVERVIEW_RESPONSE)),
      http.get(`${API}/api/v1/fassets/agents`, ({ request }) => {
        const sort = new URL(request.url).searchParams.get("sort");
        return HttpResponse.json(agentsResponse([sort === "fee" ? OTHER_AGENT : AGENT]));
      }),
    );
    renderWithProviders(<Fassets />);

    expect(await screen.findAllByText("White Knight")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Lowest Fee" }));
    expect(await screen.findAllByText("Steady Hands")).toHaveLength(2);
  });

  it("shows the empty state when there are no agent vaults", async () => {
    server.use(
      http.get(`${API}/api/v1/fassets/overview`, () => HttpResponse.json(OVERVIEW_RESPONSE)),
      http.get(`${API}/api/v1/fassets/agents`, () => HttpResponse.json(agentsResponse([]))),
    );
    renderWithProviders(<Fassets />);

    expect(await screen.findByText("No Agents Yet")).toBeInTheDocument();
  });
});
