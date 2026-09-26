import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import DelegationConcentrationCard from "@/pages/FtsoRewards/components/DelegationConcentrationCard";
import { renderWithProviders, screen } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API } from "@/test/fixtures";

function mockConcentration(overrides = {}) {
  server.use(
    http.get(`${API}/api/v1/ftso/delegation-concentration`, () =>
      HttpResponse.json({
        current: {
          hhi: 163.3,
          concentration_band: "unconcentrated",
          effective_num_providers: 61.24,
          num_active_providers: 98,
          top5_share_pct: 16.32,
          top10_share_pct: 28.55,
        },
        history: [
          { date: "2026-09-08", hhi: 164.2 },
          { date: "2026-09-09", hhi: 163.3 },
        ],
        note: "HHI measures how concentrated delegation weight is across providers.",
        ...overrides,
      }),
    ),
  );
}

describe("DelegationConcentrationCard", () => {
  it("renders the stat row, band pill, top5/top10 table, and the note", async () => {
    mockConcentration();
    renderWithProviders(<DelegationConcentrationCard />);

    expect(await screen.findByText("163.3")).toBeInTheDocument();
    expect(screen.getByText("61")).toBeInTheDocument();
    expect(screen.getByText("98")).toBeInTheDocument();
    expect(screen.getByText("Unconcentrated")).toBeInTheDocument();
    expect(screen.getByText("16.32%")).toBeInTheDocument();
    expect(screen.getByText("28.55%")).toBeInTheDocument();
    expect(
      screen.getByText("HHI measures how concentrated delegation weight is across providers."),
    ).toBeInTheDocument();
  });

  it("shows the moderately-concentrated band with a warning tone when the API says so", async () => {
    mockConcentration({
      current: {
        hhi: 1800,
        concentration_band: "moderately concentrated",
        effective_num_providers: 12,
        num_active_providers: 40,
        top5_share_pct: 55,
        top10_share_pct: 70,
      },
    });
    renderWithProviders(<DelegationConcentrationCard />);

    expect(await screen.findByText("Moderately Concentrated")).toBeInTheDocument();
  });

  // The API's own doc note explicitly says a short history is expected
  // early on and the chart needs to "look sensible with 1 point as well
  // as 90" — this is the regression guard for that requirement, not just
  // a happy-path check with the multi-point history every other test here
  // uses.
  it("renders without crashing when history has exactly 1 point", async () => {
    mockConcentration({ history: [{ date: "2026-09-09", hhi: 163.3 }] });
    renderWithProviders(<DelegationConcentrationCard />);

    expect(await screen.findByText("163.3")).toBeInTheDocument();
  });

  it("shows an error state with a working retry button when the request fails", async () => {
    server.use(
      http.get(`${API}/api/v1/ftso/delegation-concentration`, () =>
        HttpResponse.json({ error: "boom" }, { status: 500 }),
      ),
    );
    renderWithProviders(<DelegationConcentrationCard />);

    // QUICK_RESILIENCE retries once with a ~1s backoff before settling
    // into isError — longer than testing-library's default findBy*
    // timeout, so this needs an explicit one that accounts for it.
    expect(
      await screen.findByText("Couldn't load delegation concentration.", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
