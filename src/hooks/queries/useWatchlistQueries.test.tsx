import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import { useWatchlist } from "@/hooks/queries/useWatchlistQueries";
import { useAuthStore } from "@/store/useAuthStore";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";

const { primary: WALLET_A, watchlist: WALLET_B } = TEST_ADDRESSES;

function WatchlistProbe() {
  const { data, isFetching } = useWatchlist(true);
  return (
    <p>
      watchlist: {(data ?? []).map((w) => w.address).join(",") || "(empty)"}
      {isFetching ? " (fetching)" : ""}
    </p>
  );
}

// Regression test for the reported bug: switching authenticated wallets
// through disconnect -> connect (not logout -> connect) left the newly
// signed-in wallet's watchlist looking empty/stale until a manual page
// refresh. Root cause was queryKeys.watchlist.list() being a single,
// identity-independent cache key — a fast switch inside its own
// staleTime window served the previous wallet's cached response to the
// new one. The fix scopes the key by authenticatedAddress; this test
// proves a switch mid-staleTime-window still shows the new wallet's real
// data, not the old wallet's cached one.
describe("useWatchlist — identity-scoped cache", () => {
  it("shows Wallet B's own watchlist immediately after switching from Wallet A, even within Wallet A's staleTime window", async () => {
    server.use(
      http.get(`${API}/api/v1/watchlist`, ({ request }) => {
        const auth = request.headers.get("Authorization");
        if (auth?.includes("wallet-a-token")) {
          return HttpResponse.json({ wallets: [] });
        }
        if (auth?.includes("wallet-b-token")) {
          return HttpResponse.json({ wallets: [{ address: WALLET_B, nickname: "Cold Storage" }] });
        }
        return HttpResponse.json({ wallets: [] });
      }),
    );

    useAuthStore.setState({ token: "wallet-a-token", authenticatedAddress: WALLET_A });
    const { rerender } = renderWithProviders(<WatchlistProbe />);

    await waitFor(() => {
      expect(screen.getByText("watchlist: (empty)")).toBeInTheDocument();
    });

    // Simulate the real disconnect -> connect wallet-switch path: useAuthSync's
    // own wallet-switch effect clears the old session synchronously, then a
    // successful sign-in sets the new one — well inside watchlist's own 30s
    // staleTime, exactly the timing the real bug depended on.
    useAuthStore.setState({ token: null, authenticatedAddress: null });
    useAuthStore.setState({ token: "wallet-b-token", authenticatedAddress: WALLET_B });
    rerender(<WatchlistProbe />);

    await waitFor(() => {
      expect(screen.getByText(`watchlist: ${WALLET_B}`, { exact: false })).toBeInTheDocument();
    });
    expect(screen.queryByText("watchlist: (empty)")).not.toBeInTheDocument();
  });
});
