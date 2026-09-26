import { describe, it, expect, vi, afterEach } from "vitest";
import { http, HttpResponse} from "msw";

import AddWalletModal from "@/pages/Dashboard/components/AddWalletModal";
import { useAuthStore } from "@/store/useAuthStore";
import { useWalletHubStore } from "@/store/useWalletHubStore";
import { renderWithProviders, screen, fireEvent, waitFor } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";

function fillForm(address, nickname = "") {
  fireEvent.change(screen.getByPlaceholderText("0x... Flare Wallet Address"), {
    target: { value: address },
  });
  if (nickname) {
    fireEvent.change(screen.getByPlaceholderText("Account Name Label (e.g., Cold Storage)"), {
      target: { value: nickname },
    });
  }
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Add wallet" }));
}

// Guest path — no session, everything local via useWalletHubStore's
// addTrackedWallet/switchActiveAddress. Mirrors Wallets.test.tsx's own
// guest-path coverage, since this modal calls the exact same store
// actions, not a second implementation.
describe("AddWalletModal — guest, not connected", () => {
  it("rejects an invalid address without touching the store", async () => {
    renderWithProviders(<AddWalletModal isOpen onClose={vi.fn()} />);
    await screen.findByText("Track a Flare wallet");

    fillForm("not-an-address");
    submit();

    expect(
      await screen.findByText("Please enter a valid Flare EVM network address (starting with 0x)."),
    ).toBeInTheDocument();
    expect(useWalletHubStore.getState().trackedWallets).toHaveLength(0);
  });

  it("adds a valid wallet, makes it active immediately, and closes", async () => {
    const onClose = vi.fn();
    renderWithProviders(<AddWalletModal isOpen onClose={onClose} />);
    await screen.findByText("Track a Flare wallet");

    fillForm(TEST_ADDRESSES.watchlist, "Cold Storage");
    submit();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(useWalletHubStore.getState().trackedWallets).toEqual([
      { address: TEST_ADDRESSES.watchlist, label: "Cold Storage" },
    ]);
    // The core requirement: no manual Navbar wallet-switch step needed —
    // the newly added wallet is already the active one.
    expect(useWalletHubStore.getState().activeAddress).toBe(TEST_ADDRESSES.watchlist);
  });

  it("shows a success toast that explains the new wallet is now active, since a guest with no connection auto-selects it", async () => {
    renderWithProviders(<AddWalletModal isOpen onClose={vi.fn()} />);
    await screen.findByText("Track a Flare wallet");

    fillForm(TEST_ADDRESSES.watchlist, "Cold Storage");
    submit();

    expect(await screen.findByText("Wallet added")).toBeInTheDocument();
    expect(
      await screen.findByText('"Cold Storage" has been added and is now your active wallet.'),
    ).toBeInTheDocument();
  });

  it("rejects a duplicate address and leaves the modal open", async () => {
    useWalletHubStore.setState({
      trackedWallets: [{ address: TEST_ADDRESSES.watchlist, label: "Existing" }],
    });
    const onClose = vi.fn();
    renderWithProviders(<AddWalletModal isOpen onClose={onClose} />);
    await screen.findByText("Track a Flare wallet");

    fillForm(TEST_ADDRESSES.watchlist);
    submit();

    expect(
      await screen.findByText("Address registration failed. Check if it is a duplicate or if slots are filled."),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(useWalletHubStore.getState().trackedWallets).toHaveLength(1);
  });

  it("disables submission once the guest slot limit (3) is reached", async () => {
    useWalletHubStore.setState({
      trackedWallets: [
        { address: "0xAAAA111111111111111111111111111111111A", label: "A" },
        { address: "0xAAAA222222222222222222222222222222222A", label: "B" },
        { address: "0xAAAA333333333333333333333333333333333A", label: "C" },
      ],
    });
    renderWithProviders(<AddWalletModal isOpen onClose={vi.fn()} />);

    expect(await screen.findByRole("button", { name: /Wallet Limit Reached/i })).toBeDisabled();
  });

  it("cancel closes the modal without adding anything", async () => {
    const onClose = vi.fn();
    renderWithProviders(<AddWalletModal isOpen onClose={onClose} />);
    await screen.findByText("Track a Flare wallet");

    fillForm(TEST_ADDRESSES.watchlist);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(useWalletHubStore.getState().trackedWallets).toHaveLength(0);
  });
});

// Requirement: a connected wallet's own active selection must never be
// silently replaced by a newly tracked watchlist wallet.
describe("AddWalletModal — a wallet is already connected", () => {
  it("adds the new wallet to the watchlist but leaves the connected wallet active", async () => {
    const onClose = vi.fn();
    renderWithProviders(<AddWalletModal isOpen onClose={onClose} />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });
    await screen.findByText("Track a Flare wallet");

    fillForm(TEST_ADDRESSES.watchlist);
    submit();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(useWalletHubStore.getState().trackedWallets).toEqual([
      { address: TEST_ADDRESSES.watchlist, label: "Watchlist Account" },
    ]);
    // activeAddress is derived (useDerivedWalletHub reconciles it to the
    // connected wallet whenever one is live) — the connected wallet stays
    // the one actually displayed, not the wallet just added.
    expect(useWalletHubStore.getState().activeAddress).not.toBe(TEST_ADDRESSES.watchlist);
  });

  it("shows a success toast without an 'active wallet' claim, since the connected wallet stays active", async () => {
    renderWithProviders(<AddWalletModal isOpen onClose={vi.fn()} />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });
    await screen.findByText("Track a Flare wallet");

    fillForm(TEST_ADDRESSES.watchlist, "Trading Wallet");
    submit();

    expect(await screen.findByText("Wallet added")).toBeInTheDocument();
    expect(
      await screen.findByText('"Trading Wallet" has been added to your watchlist.'),
    ).toBeInTheDocument();
  });
});

// Signed-in path — hits the real watchlist API (mocked via MSW), same as
// Wallets.test.tsx's own signed-in coverage.
describe("AddWalletModal — signed in", () => {
  it("adds via the real API and closes on success", async () => {
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    server.use(
      http.post(`${API}/api/v1/watchlist`, () => HttpResponse.json({}, { status: 201 })),
      http.get(`${API}/api/v1/watchlist`, () =>
        HttpResponse.json({
          wallets: [{ address: TEST_ADDRESSES.watchlist, nickname: "Trading" }],
        }),
      ),
    );
    const onClose = vi.fn();

    renderWithProviders(<AddWalletModal isOpen onClose={onClose} />);
    await screen.findByText("Track a Flare wallet");

    fillForm(TEST_ADDRESSES.watchlist, "Trading");
    submit();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("shows the duplicate-address message on a 409 and keeps the modal open", async () => {
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    server.use(
      http.post(`${API}/api/v1/watchlist`, () =>
        HttpResponse.json({ detail: "This address is already on your watchlist." }, { status: 409 }),
      ),
    );
    const onClose = vi.fn();

    renderWithProviders(<AddWalletModal isOpen onClose={onClose} />);
    await screen.findByText("Track a Flare wallet");

    fillForm(TEST_ADDRESSES.watchlist);
    submit();

    expect(
      await screen.findByText("This address is already on your watchlist."),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

// Regression coverage for a real mobile/PWA bug: opening this modal used to
// unconditionally call addressInputRef.current.focus() the instant it
// rendered — on a touch device, focusing a text input programmatically
// (not from a genuine tap) still pops the on-screen keyboard immediately,
// before the visitor has tapped anything, covering the just-opened bottom
// sheet before it could even be seen. Same "pointer: coarse" check and fix
// as Composer.tsx's own mount-time focus effect (see that file's comment).
// Desktop (matchMedia "matches: false", the test polyfill's default — see
// src/test/polyfills.ts) keeps the original immediate-focus behavior.
describe("AddWalletModal — auto-focus is skipped on touch devices", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("does not focus the address input on a touch device (pointer: coarse)", async () => {
    window.matchMedia = (query) => ({
      matches: query === "(pointer: coarse)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });

    renderWithProviders(<AddWalletModal isOpen onClose={vi.fn()} />);
    const input = await screen.findByPlaceholderText("0x... Flare Wallet Address");

    expect(document.activeElement).not.toBe(input);
  });

  it("still focuses the address input immediately on a non-touch device — desktop behavior unchanged", async () => {
    renderWithProviders(<AddWalletModal isOpen onClose={vi.fn()} />);
    const input = await screen.findByPlaceholderText("0x... Flare Wallet Address");

    await waitFor(() => expect(document.activeElement).toBe(input));
  });
});
