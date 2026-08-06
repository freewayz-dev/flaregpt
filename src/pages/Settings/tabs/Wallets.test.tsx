import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse, type PathParams } from "msw";
import { Routes, Route, Outlet } from "react-router";

import Wallets from "@/pages/Settings/tabs/Wallets";
import { useAuthStore } from "@/store/useAuthStore";
import { useWalletHubStore } from "@/store/useWalletHubStore";
import { renderWithProviders, screen, fireEvent, waitFor } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";

// Wallets reads useOutletContext() for openWalletModal — same stand-in
// pattern GasSniperCard.test.tsx established for the same reason.
function renderWallets(openWalletModal = vi.fn()) {
  const result = renderWithProviders(
    <Routes>
      <Route element={<Outlet context={{ openWalletModal }} />}>
        <Route index element={<Wallets />} />
      </Route>
    </Routes>,
  );
  return { ...result, openWalletModal };
}

describe("Wallets — guest confirm-then-remove", () => {
  // handleRemoveClick is a real two-click state machine (arm, then
  // confirm-or-expire) specifically so a single mis-tap can never delete a
  // tracked wallet — that safety property only exists if the first click
  // truly leaves the wallet in place and only a second click on the *same*
  // row removes it. A future refactor that collapses this back to a single
  // onClick={remove} would compile fine, pass a shallow "remove works"
  // test, and silently drop the protection this specifically guards.
  it("first click arms the confirmation without removing; second click removes", async () => {
    useWalletHubStore.setState({
      trackedWallets: [{ address: TEST_ADDRESSES.watchlist, label: "My Watchlist Wallet" }],
    });

    renderWallets();

    expect(await screen.findByText("My Watchlist Wallet")).toBeInTheDocument();

    const removeButton = screen.getByRole("button", { name: "Remove" });
    fireEvent.click(removeButton);

    // Still present — the first click only arms the confirmation.
    expect(screen.getByText("My Watchlist Wallet")).toBeInTheDocument();
    const confirmButton = await screen.findByRole("button", { name: "Confirm remove?" });

    fireEvent.click(confirmButton);

    await waitFor(() =>
      expect(screen.queryByText("My Watchlist Wallet")).not.toBeInTheDocument(),
    );
  });

  it("announces the armed state for screen readers via the live region", async () => {
    useWalletHubStore.setState({
      trackedWallets: [{ address: TEST_ADDRESSES.watchlist, label: "My Watchlist Wallet" }],
    });

    renderWallets();
    await screen.findByText("My Watchlist Wallet");

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(
      await screen.findByText("Press remove again to confirm removing My Watchlist Wallet."),
    ).toBeInTheDocument();
  });
});

// The backend tells a duplicate-address 409 apart from a duplicate-nickname
// 409 only via free-text `detail` on the same status code (see
// interpretWatchlistError in Wallets.tsx and watchlistService.ts's own
// comment on this). A refactor of that backend's wording, or a slip in the
// regex that sniffs it, would silently start showing a signed-in user the
// wrong one of these two messages — this pins the exact contract.
describe("Wallets — signed-in duplicate error disambiguation", () => {
  function mockAddWatchlist409(detail: string) {
    server.use(
      http.post<PathParams>(`${API}/api/v1/watchlist`, () =>
        HttpResponse.json({ detail }, { status: 409 }),
      ),
    );
  }

  function fillAndSubmitAddForm(address: string) {
    fireEvent.change(screen.getByLabelText("Wallet address"), {
      target: { value: address },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add Wallet/i }));
  }

  it("shows the duplicate-address message for a duplicate-address 409", async () => {
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    mockAddWatchlist409("This address is already on your watchlist.");

    renderWallets();
    await screen.findByText("Add Watchlist Portfolio Account");

    fillAndSubmitAddForm(TEST_ADDRESSES.watchlist);

    expect(
      await screen.findByText("This address is already on your watchlist."),
    ).toBeInTheDocument();
  });

  it("shows the duplicate-nickname message for a duplicate-nickname 409, not the address one", async () => {
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    mockAddWatchlist409("Nickname 'Trading' is already used for another watched wallet.");

    renderWallets();
    await screen.findByText("Add Watchlist Portfolio Account");

    fillAndSubmitAddForm(TEST_ADDRESSES.watchlist);

    expect(
      await screen.findByText(
        "A watchlist wallet with this nickname already exists. Please choose a different nickname.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("This address is already on your watchlist."),
    ).not.toBeInTheDocument();
  });
});
