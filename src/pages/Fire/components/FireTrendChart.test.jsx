import { describe, it, expect } from "vitest";

import FireTrendChart from "@/pages/Fire/components/FireTrendChart";
import { renderWithProviders, screen } from "@/test/test-utils";

const SERIES = [
  { token: "FLR", points: [{ periodId: "2026-09-16", accrued: 1000 }] },
  { token: "FXRP", points: [{ periodId: "2026-09-16", accrued: 500 }] },
];

describe("FireTrendChart", () => {
  it("renders the card title, subtitle, and one label per token", () => {
    // Same jsdom/recharts limitation FireBreakdownChart.test.jsx already
    // documents — asserting the surrounding card, not recharts' own SVG
    // internals.
    renderWithProviders(<FireTrendChart series={SERIES} />);
    expect(screen.getByText("Revenue Trend")).toBeInTheDocument();
    expect(screen.getByText("Daily accrued revenue over the last 30 days, by token")).toBeInTheDocument();
    expect(screen.getByText("FLR accrued per day")).toBeInTheDocument();
    expect(screen.getByText("FXRP accrued per day")).toBeInTheDocument();
  });

  it("doesn't crash with only a single token series", () => {
    renderWithProviders(<FireTrendChart series={[SERIES[0]]} />);
    expect(screen.getByText("Revenue Trend")).toBeInTheDocument();
  });
});
