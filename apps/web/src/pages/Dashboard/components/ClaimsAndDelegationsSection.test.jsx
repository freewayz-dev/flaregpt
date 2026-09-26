import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import ClaimsAndDelegationsSection from "@/pages/Dashboard/components/ClaimsAndDelegationsSection";
import { renderWithProviders, screen, fireEvent, within } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";

// jsdom doesn't evaluate the `lg:hidden`/`hidden lg:grid` breakpoint
// classes that keep only one of the mobile-tabs panel and the desktop
// 2-column grid visible in a real browser — both are present in the test
// DOM at once (same documented pattern Fassets/AgentsTable's own tests
// already rely on). Since the desktop grid renders the SAME delegation
// data through the untouched GenericTable, an unscoped query for
// provider/allocation text would match both renders — every assertion
// here is scoped to the mobile tabs panel specifically (`.lg\\:hidden`)
// so it only ever inspects DelegationsList's own output.
function getMobilePanel(container) {
  return within(container.querySelector(".lg\\:hidden"));
}

const PORTFOLIO_RESPONSE = {
  ftso_infrastructure: { user_wflr_balance: 1000, cumulative_unclaimed_flr: 5 },
  realtime_estimation: { calculation_method: "LIVE_UNCLAIMED_LEDGER_VELOCITY", estimated_hourly_earning: 0.1 },
  active_delegations: [
    {
      provider_address: "0x9A46864A3b0a7805B266C445289C3fAD1E48f18e",
      provider_name: "Bifrost Wallet",
      allocated_bips: 4500,
      network_rank: 2,
      concentration_band: "well_distributed",
    },
  ],
  unclaimed_epochs_ledger: [{ epoch_id: 219040, unclaimed_amount_flr: 5 }],
};

describe("ClaimsAndDelegationsSection", () => {
  it("shows the mobile Delegations tab as a percentage-bar list, not a raw column table", async () => {
    server.use(
      http.get(`${API}/api/v1/portfolio/ftso/:address`, () => HttpResponse.json(PORTFOLIO_RESPONSE)),
    );
    const { container } = renderWithProviders(<ClaimsAndDelegationsSection />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    // Mobile tabs default to Claims History — switch to Delegations.
    fireEvent.click(await screen.findByRole("button", { name: "Delegations" }));

    const mobilePanel = getMobilePanel(container);
    // DelegationsList's own presentation: a real percentage figure derived
    // from allocated_bips (45.0%), not the raw GenericTable cell value
    // (4,500) the old table rendered directly.
    expect(await mobilePanel.findByText("Bifrost Wallet")).toBeInTheDocument();
    expect(mobilePanel.getByText("45.0%")).toBeInTheDocument();
    expect(mobilePanel.getByText(/Well Distributed/)).toBeInTheDocument();
    expect(mobilePanel.getByText(/#2/)).toBeInTheDocument();

    // GenericTable's own raw-column header text ("Provider", "Allocation")
    // must not appear in the mobile panel — confirms this isn't still the
    // old desktop-table-squeezed-down presentation (the desktop grid
    // elsewhere in the test DOM still legitimately has these headers).
    expect(mobilePanel.queryByText("Provider")).not.toBeInTheDocument();
    expect(mobilePanel.queryByText("Allocation")).not.toBeInTheDocument();
  });

  it("still shows Claims History as a table on the Claims tab", async () => {
    server.use(
      http.get(`${API}/api/v1/portfolio/ftso/:address`, () => HttpResponse.json(PORTFOLIO_RESPONSE)),
    );
    const { container } = renderWithProviders(<ClaimsAndDelegationsSection />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    const mobilePanel = getMobilePanel(container);
    expect(await mobilePanel.findByText("219,040")).toBeInTheDocument();
  });
});
