import { describe, it, expect } from "vitest";

import DonationsReceived from "@/pages/Donate/components/DonationsReceived";
import { renderWithProviders, screen } from "@/test/test-utils";

// No donations API/indexer exists — this section must show an honest
// empty state rather than any fabricated total, "Demo data" badge, or
// number implying donations have already occurred.
describe("DonationsReceived", () => {
  it("shows an honest empty state instead of any fabricated totals", () => {
    renderWithProviders(<DonationsReceived />);

    expect(screen.getByText("No donations yet")).toBeInTheDocument();
    expect(screen.queryByText("Demo data")).not.toBeInTheDocument();
  });

  it("renders no numeric donation amounts anywhere", () => {
    const { container } = renderWithProviders(<DonationsReceived />);

    // Regression guard for the previous fabricated per-coin totals
    // (18450, 9200, 3250, 0.084, 14500) — none of those numbers, or any
    // other digit sequence implying a real total, should appear.
    expect(container.textContent).not.toMatch(/\d/);
  });
});
