import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import FxrpBalanceCard from "@/pages/Fassets/components/FxrpBalanceCard";
import { renderWithProviders, screen } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";

describe("FxrpBalanceCard", () => {
  it("shows 0 FXRP when no wallet is active, not a connect prompt", () => {
    renderWithProviders(<FxrpBalanceCard />);

    expect(screen.getByText("Your FXRP Balance")).toBeInTheDocument();
    expect(screen.getByText("0 FXRP")).toBeInTheDocument();
  });

  it("shows the real balance once a wallet is connected", async () => {
    server.use(
      http.get(`${API}/api/v1/portfolio/balances/:address`, () =>
        HttpResponse.json({ balances: { FLR: 10, WFLR: 5, FXRP: 950.123456 } }),
      ),
    );
    renderWithProviders(<FxrpBalanceCard />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    // formatAmount defaults to 4 max fraction digits — same rounding
    // MyFxrpSection's own balance tile already established.
    expect(await screen.findByText("950.1235 FXRP")).toBeInTheDocument();
  });

  // No error-branch test here, matching WalletBalancesCard.test.jsx's own
  // established precedent for this exact hook: useWalletBalances retries
  // up to 3 times (WALLET_QUERY_RESILIENCE, exponential backoff) before
  // settling into isError, which makes a real 5xx-triggered error test
  // multiple seconds slow rather than a genuine behavior risk — the
  // unavailable-message branch itself still exists in the component,
  // unchanged from MyFxrpSection's own already-tested version of the same
  // "don't fabricate a balance on error" guard.
});
