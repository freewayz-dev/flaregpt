import { describe, it, expect, vi, afterEach } from "vitest";
import { http, HttpResponse} from "msw";
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

// A guest and a signed-in user store/sync their tracked wallets
// differently (local-only, capped at 3, vs. server-side and synced) — the
// Wallets tab must say so plainly, without ever claiming "unlimited"
// (there's no confirmed backend cap, but also no confirmed absence of
// one, so the wording stays literal instead of promising something the
// backend hasn't actually committed to).
describe("Wallets — guest vs authenticated sync-status messaging", () => {
  it("tells a guest their wallets are local-only, capped at 3, and won't sync", async () => {
    renderWallets();

    expect(
      await screen.findByText(
        "You can track up to 3 wallets without signing in. These wallets are stored on this device and won't sync across your other devices.",
      ),
    ).toBeInTheDocument();
  });

  it("tells a signed-in user their wallets sync across devices, without ever using the word 'unlimited'", async () => {
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderWallets();

    expect(
      await screen.findByText("Signed in. Your tracked wallets sync across your devices."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/unlimited/i)).not.toBeInTheDocument();
  });
});

// "It's now in the list" is not confirmation enough on its own — a
// dedicated toast must fire immediately so the user has explicit proof
// the add succeeded, independent of whether they're even looking at the
// list at that moment.
describe("Wallets — add-wallet success toast", () => {
  it("shows a success toast naming the wallet's nickname after a guest adds one", async () => {
    renderWallets();
    await screen.findByText("Add Watchlist Portfolio Account");

    fireEvent.change(screen.getByLabelText("Wallet nickname"), {
      target: { value: "My Main Wallet" },
    });
    fireEvent.change(screen.getByLabelText("Wallet address"), {
      target: { value: TEST_ADDRESSES.watchlist },
    });
    // The dynamic "(N Connected, N Remaining)"/"(N Tracked)" suffix is what
    // distinguishes the form's own submit button from the unrelated
    // "Connect Wallet" CTA the sync-status card above it also renders for a
    // guest (see Wallets.tsx) — both would otherwise match a bare
    // /Connect Wallet|Add Wallet/i.
    fireEvent.click(screen.getByRole("button", { name: /(Connect Wallet|Add Wallet) \(/i }));

    expect(await screen.findByText("Wallet added")).toBeInTheDocument();
    expect(
      await screen.findByText('"My Main Wallet" has been added to your watchlist.'),
    ).toBeInTheDocument();
  });
});

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
  function mockAddWatchlist409(detail) {
    server.use(
      http.post(`${API}/api/v1/watchlist`, () =>
        HttpResponse.json({ detail }, { status: 409 }),
      ),
    );
  }

  function fillAndSubmitAddForm(address) {
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

// A signed-in wallet's add/remove hit the real watchlist API
// (useWatchlistQueries.ts); a guest's are purely local (addTrackedWallet/
// removeTrackedWallet) — offline must only block the former. This is the
// exact distinction `offlineBlocked = hasSession && !isOnline` in
// Wallets.tsx exists to encode; these tests pin both halves of it, not
// just "offline disables things."
describe("Wallets — offline", () => {
  const originalOnLine = window.navigator.onLine;

  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true });
  });

  it("a guest can still remove a tracked wallet while offline — it's a local-only action", async () => {
    useWalletHubStore.setState({
      trackedWallets: [{ address: TEST_ADDRESSES.watchlist, label: "My Watchlist Wallet" }],
    });
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    renderWallets();
    expect(await screen.findByText("My Watchlist Wallet")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm remove?" }));

    await waitFor(() =>
      expect(screen.queryByText("My Watchlist Wallet")).not.toBeInTheDocument(),
    );
  });

  it("a signed-in user's Add Wallet submit is disabled while offline, with no network call attempted", async () => {
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    let addWasCalled = false;
    server.use(
      http.post(`${API}/api/v1/watchlist`, () => {
        addWasCalled = true;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    renderWallets();
    await screen.findByText("Add Watchlist Portfolio Account");

    expect(screen.getByRole("button", { name: /Add Wallet|Offline/i })).toBeDisabled();
    expect(screen.getByText("You're offline. This needs an internet connection.")).toBeInTheDocument();
    expect(addWasCalled).toBe(false);
  });

  it("a signed-in user's remove button is disabled while offline", async () => {
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    server.use(
      http.get(`${API}/api/v1/watchlist`, () =>
        HttpResponse.json({
          wallets: [{ address: TEST_ADDRESSES.watchlist, nickname: "Signed-in Watchlist Wallet" }],
        }),
      ),
    );

    renderWallets();
    expect(await screen.findByText("Signed-in Watchlist Wallet")).toBeInTheDocument();

    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    fireEvent(window, new Event("offline"));

    expect(await screen.findByTitle("You're offline. This needs an internet connection.")).toBeDisabled();
  });
});
