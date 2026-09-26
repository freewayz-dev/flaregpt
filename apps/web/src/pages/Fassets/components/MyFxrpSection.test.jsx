import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import MyFxrpSection from "@/pages/Fassets/components/MyFxrpSection";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";

const ACTIVITY_RESPONSE = {
  total_actions_indexed: 2,
  history: [
    {
      transaction_hash: "0xmint",
      block_number: 100,
      action_tag: "FXRP_MINT",
      asset: "FXRP",
      amount: 950.123456,
      timestamp: 1780863106,
    },
    {
      transaction_hash: "0xunrelated",
      block_number: 99,
      action_tag: "TOKEN_SEND",
      asset: "WFLR",
      amount: 5,
      timestamp: 1780863000,
    },
  ],
};

describe("MyFxrpSection", () => {
  it("shows a no-wallet-selected empty state when no wallet is active", () => {
    renderWithProviders(<MyFxrpSection />);

    expect(screen.getByText("My FXRP")).toBeInTheDocument();
    expect(screen.getByText("No wallet selected")).toBeInTheDocument();
  });

  it("shows the FXRP balance and filters activity to only FXRP-tagged entries once a wallet is connected", async () => {
    server.use(
      http.get(`${API}/api/v1/portfolio/balances/:address`, () =>
        HttpResponse.json({ balances: { FLR: 10, WFLR: 5, FXRP: 950.123456 } }),
      ),
      http.get(`${API}/api/v1/portfolio/activity/:address`, () =>
        HttpResponse.json({
          total_actions_indexed: 3,
          history: [
            {
              transaction_hash: "0xmint",
              block_number: 100,
              action_tag: "FXRP_MINT",
              asset: "FXRP",
              amount: 950.123456,
              timestamp: 1780863106,
            },
            {
              // A hypothetical redeem — never independently observed live
              // this round, but the filter matches by action_tag PREFIX
              // (see MyFxrpSection.jsx's own comment), so it must show up
              // here too without needing its own special case.
              transaction_hash: "0xredeem",
              block_number: 101,
              action_tag: "FXRP_REDEEM",
              asset: "FXRP",
              amount: 200,
              timestamp: 1780863200,
            },
            {
              transaction_hash: "0xunrelated",
              block_number: 99,
              action_tag: "TOKEN_SEND",
              asset: "WFLR",
              amount: 5,
              timestamp: 1780863000,
            },
          ],
        }),
      ),
    );
    renderWithProviders(<MyFxrpSection />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    // formatAmount defaults to 4 max fraction digits (see format.js), so the
    // raw 950.123456 balance renders rounded to "950.1235".
    expect(await screen.findByText("950.1235 FXRP")).toBeInTheDocument();
    expect(await screen.findByText("Recent FXRP Activity")).toBeInTheDocument();
    // Both FXRP-tagged entries show (TransactionRow's own formatActionLabel
    // humanizes the raw tag), the unrelated WFLR send doesn't.
    expect(await screen.findByText("Fxrp Mint")).toBeInTheDocument();
    expect(screen.getByText("Fxrp Redeem")).toBeInTheDocument();
    expect(screen.queryByText("Token Send")).not.toBeInTheDocument();
    expect(screen.getByText("View all in Wallet Activity")).toBeInTheDocument();
  });

  it("shows an empty state when the wallet has no FXRP activity at all", async () => {
    server.use(
      http.get(`${API}/api/v1/portfolio/balances/:address`, () =>
        HttpResponse.json({ balances: { FLR: 10, WFLR: 5, FXRP: 0 } }),
      ),
      http.get(`${API}/api/v1/portfolio/activity/:address`, () =>
        HttpResponse.json({
          total_actions_indexed: 1,
          history: [
            {
              transaction_hash: "0xunrelated",
              block_number: 99,
              action_tag: "TOKEN_SEND",
              asset: "WFLR",
              amount: 5,
              timestamp: 1780863000,
            },
          ],
        }),
      ),
    );
    renderWithProviders(<MyFxrpSection />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    expect(await screen.findByText("No FXRP activity yet.")).toBeInTheDocument();
    expect(screen.queryByText("View all in Wallet Activity")).not.toBeInTheDocument();
  });

  it("opens a transaction's details in place (no navigation) with a copyable hash, addresses once resolved, and an explorer link", async () => {
    server.use(
      http.get(`${API}/api/v1/portfolio/balances/:address`, () =>
        HttpResponse.json({ balances: { FLR: 10, WFLR: 5, FXRP: 950.123456 } }),
      ),
      http.get(`${API}/api/v1/portfolio/activity/:address`, () => HttpResponse.json(ACTIVITY_RESPONSE)),
      http.get(`${API}/api/v1/transaction/:txHash`, () =>
        HttpResponse.json({
          tx_hash: "0xmint",
          found: true,
          from: "0xFa712128E01CF5fcd210b0F530c216218944a83E",
          to: "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d",
          value_flr: 950.123456,
          status: "success",
          block_number: 100,
          confirmations: 1936,
          timestamp: "2026-09-18T09:42:24+00:00",
          tx_fee_flr: 0.108,
          action_tag: "FXRP_MINT",
          note: "Covers C-chain transactions only.",
        }),
      ),
    );
    renderWithProviders(<MyFxrpSection />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    fireEvent.click(await screen.findByText("Fxrp Mint"));

    // Opens the drawer in place — MyFxrpSection's own content is still on
    // screen, proving this didn't navigate to Wallet Activity the way it
    // used to (see MyFxrpSection.jsx's own comment on the old behavior).
    expect(await screen.findByText("Transaction Details")).toBeInTheDocument();
    expect(screen.getByText("My FXRP")).toBeInTheDocument();

    // Fields already known from the activity row render immediately, no
    // fetch required for these.
    expect(screen.getByText("Transaction Hash")).toBeInTheDocument();
    expect(screen.getByText("0xmint")).toBeInTheDocument();

    // Addresses are layered in once the hash lookup resolves — not part of
    // the activity row's own shape at all.
    expect(await screen.findByText("From")).toBeInTheDocument();
    expect(screen.getByText("0xFa71...a83E")).toBeInTheDocument();
    expect(screen.getByText("0x1D80...783d")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /View on FlareScan/ })).toHaveAttribute(
      "href",
      expect.stringContaining("0xmint"),
    );

    // The drawer's own header (title, close button) stays mounted at all
    // times — same always-mounted-but-visually-hidden shape InfoHint.jsx's
    // own popover uses — only the item-specific body content actually
    // unmounts once closed, so that's what closing is asserted against.
    fireEvent.click(screen.getByTitle("Close"));
    expect(screen.queryByText("0xmint")).not.toBeInTheDocument();
  });

  it("falls back to the activity row's own fields, with no address rows, when the hash lookup finds nothing", async () => {
    server.use(
      http.get(`${API}/api/v1/portfolio/balances/:address`, () =>
        HttpResponse.json({ balances: { FLR: 10, WFLR: 5, FXRP: 950.123456 } }),
      ),
      http.get(`${API}/api/v1/portfolio/activity/:address`, () => HttpResponse.json(ACTIVITY_RESPONSE)),
      http.get(`${API}/api/v1/transaction/:txHash`, () =>
        HttpResponse.json({ found: false, status: "not_found", note: "No matching transaction." }),
      ),
    );
    renderWithProviders(<MyFxrpSection />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    fireEvent.click(await screen.findByText("Fxrp Mint"));

    expect(await screen.findByText("Transaction Details")).toBeInTheDocument();
    expect(screen.getByText("0xmint")).toBeInTheDocument();
    expect(screen.queryByText("From")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View on FlareScan/ })).toBeInTheDocument();
  });
});
