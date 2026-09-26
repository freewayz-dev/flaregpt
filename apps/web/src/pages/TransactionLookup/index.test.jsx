import { describe, it, expect, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";

import TransactionLookup from "@/pages/TransactionLookup";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API } from "@/test/fixtures";

const TX_HASH = "0x47093d1f9fae76bf9b25a53cc5993891f3008ebdf0dd2c66330fcce2065e9e9d";

function search(hash) {
  fireEvent.change(screen.getByLabelText("Transaction Hash"), { target: { value: hash } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
}

// Same stub pattern HeroReceiveCard.test.jsx already uses for the exact
// same `copyWalletAddress` utility.
function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...window.navigator, clipboard: { writeText } });
  return writeText;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TransactionLookup", () => {
  it("shows the idle prompt before any search, with no wallet connection required", () => {
    // Deliberately rendered with no wagmi connection option at all (unlike
    // every wallet-scoped page's test) — this page has no wallet gate.
    renderWithProviders(<TransactionLookup />);
    expect(screen.getByText("Look Up a Transaction")).toBeInTheDocument();
  });

  it("renders a found, mined transaction's detail once searched", async () => {
    server.use(
      http.get(`${API}/api/v1/transaction/:txHash`, () =>
        HttpResponse.json({
          tx_hash: TX_HASH,
          found: true,
          from: "0xFa712128E01CF5fcd210b0F530c216218944a83E",
          to: "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d",
          value_flr: 992908.12278721,
          status: "success",
          block_number: 70056102,
          confirmations: 1936,
          timestamp: "2026-09-18T09:42:24+00:00",
          gas_used: 168628,
          effective_gas_price_gwei: 640.92,
          tx_fee_flr: 0.108,
          action_tag: "WRAP",
          note: "Covers C-chain transactions only.",
        }),
      ),
    );
    renderWithProviders(<TransactionLookup />);

    search(TX_HASH);

    expect(await screen.findByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Wrap")).toBeInTheDocument();
    expect(screen.getByText("Covers C-chain transactions only.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view on explorer/i })).toHaveAttribute(
      "href",
      `https://flarescan.com/tx/${TX_HASH}`,
    );
  });

  it("copies the From/To addresses and shows the notification pill", async () => {
    const writeText = stubClipboard();
    server.use(
      http.get(`${API}/api/v1/transaction/:txHash`, () =>
        HttpResponse.json({
          tx_hash: TX_HASH,
          found: true,
          from: "0xFa712128E01CF5fcd210b0F530c216218944a83E",
          to: "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d",
          value_flr: 992908.12278721,
          status: "success",
          note: "Covers C-chain transactions only.",
        }),
      ),
    );
    renderWithProviders(<TransactionLookup />);

    search(TX_HASH);
    await screen.findByText("Success");

    fireEvent.click(screen.getByTitle("0xFa712128E01CF5fcd210b0F530c216218944a83E"));
    expect(writeText).toHaveBeenCalledWith("0xFa712128E01CF5fcd210b0F530c216218944a83E");
    expect(await screen.findByText("Address copied")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d"));
    expect(writeText).toHaveBeenCalledWith("0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d");
  });

  it("shows a pending transaction with only its known fields", async () => {
    server.use(
      http.get(`${API}/api/v1/transaction/:txHash`, () =>
        HttpResponse.json({
          tx_hash: TX_HASH,
          found: true,
          from: "0xFa712128E01CF5fcd210b0F530c216218944a83E",
          to: "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d",
          value_flr: 10,
          status: "pending",
          note: "Covers C-chain transactions only.",
        }),
      ),
    );
    renderWithProviders(<TransactionLookup />);

    search(TX_HASH);

    expect(await screen.findByText("Pending")).toBeInTheDocument();
    // No block/confirmations/action-tag row for a still-pending transaction.
    expect(screen.queryByText("Block")).not.toBeInTheDocument();
    expect(screen.queryByText("Confirmations")).not.toBeInTheDocument();
  });

  it("shows a distinct message for a hash that doesn't exist on-chain", async () => {
    server.use(
      http.get(`${API}/api/v1/transaction/:txHash`, () =>
        HttpResponse.json({ found: false, status: "not_found", note: "No matching transaction." }),
      ),
    );
    renderWithProviders(<TransactionLookup />);

    search("0xnotarealhash");

    expect(await screen.findByText("Transaction Not Found")).toBeInTheDocument();
  });

  it("shows a distinct message for a malformed hash, using the backend's own note rather than generic copy", async () => {
    server.use(
      http.get(`${API}/api/v1/transaction/:txHash`, () =>
        HttpResponse.json({
          found: false,
          status: "invalid_format",
          note: "This looks like a P-chain transaction, which isn't supported yet.",
        }),
      ),
    );
    renderWithProviders(<TransactionLookup />);

    search("not-a-hash");

    expect(await screen.findByText("Not a Valid Hash")).toBeInTheDocument();
    expect(
      screen.getByText("This looks like a P-chain transaction, which isn't supported yet."),
    ).toBeInTheDocument();
  });

  it("shows an error state with a working retry button when the request fails", async () => {
    server.use(
      http.get(`${API}/api/v1/transaction/:txHash`, () =>
        HttpResponse.json({ error: "boom" }, { status: 500 }),
      ),
    );
    renderWithProviders(<TransactionLookup />);

    search(TX_HASH);

    expect(
      await screen.findByText("Couldn't load this transaction.", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
