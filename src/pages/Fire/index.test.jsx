import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import Fire from "@/pages/Fire";
import { renderWithProviders, screen } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API } from "@/test/fixtures";

const OVERVIEW_RESPONSE = {
  pools: [
    {
      id: "fdc",
      label: "FDC (attestation fees)",
      address: "0x0ce6831DF00A6018c4d316009980DbAa6c44E525",
      token: "FLR",
      balance: 2211064.386317,
      usd_value: 14342.09,
      burned: 0.0,
      burned_usd: 0.0,
    },
    {
      id: "fasset_minting_fee",
      label: "FAsset minting fees",
      address: "0xF55bcAd5568d1584ab6f013f144e1e433Ee551C7",
      token: "FXRP",
      balance: 14096.617233,
      usd_value: 20017.2,
      burned: 0.0,
      burned_usd: 0.0,
    },
  ],
  total_usd: 34359.29,
  total_burned_usd: 0.0,
  note: "Covers confirmed FIRE revenue pools — not necessarily all of them.",
};

describe("Fire", () => {
  it("shows the stat row, the note, and every pool row once data loads", async () => {
    server.use(
      http.get(`${API}/api/v1/fire/overview`, () => HttpResponse.json(OVERVIEW_RESPONSE)),
    );
    renderWithProviders(<Fire />);

    // Two matches per pool, not one — FirePoolsTable renders both a
    // mobile card list and a desktop table for the same data (see
    // FirePoolsTable.jsx); jsdom doesn't evaluate the `sm:hidden`/
    // `hidden sm:block` breakpoint classes that keep only one visible in
    // a real browser, so both are present in the test DOM. Same pattern
    // already used by Governance/index.test.jsx for its own responsive
    // table/card split.
    expect(await screen.findAllByText("FDC (attestation fees)")).toHaveLength(2);
    expect(screen.getAllByText("FAsset minting fees")).toHaveLength(2);
    expect(screen.getByText("2")).toBeInTheDocument(); // fee categories covered — stat row renders once, not per-layout
    expect(
      screen.getByText("Covers confirmed FIRE revenue pools — not necessarily all of them."),
    ).toBeInTheDocument();

    // Each pool with a real address gets a "view on explorer" link out to
    // FlareScan — 2 pools × 2 layouts (mobile card + desktop row) = 4.
    const links = screen.getAllByRole("link", { name: /view on explorer/i });
    expect(links.length).toBe(4);
    expect(links[0]).toHaveAttribute(
      "href",
      "https://flarescan.com/address/0x0ce6831DF00A6018c4d316009980DbAa6c44E525",
    );
  });

  it("shows an error state with a working retry button when the request fails", async () => {
    server.use(
      http.get(`${API}/api/v1/fire/overview`, () =>
        HttpResponse.json({ error: "boom" }, { status: 500 }),
      ),
    );
    renderWithProviders(<Fire />);

    // QUICK_RESILIENCE retries once with a ~1s backoff before settling
    // into isError — longer than testing-library's default findBy*
    // timeout, so this needs an explicit one that accounts for it.
    expect(
      await screen.findByText("Couldn't load FIRE revenue data.", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows the empty state when there are no pools", async () => {
    server.use(
      http.get(`${API}/api/v1/fire/overview`, () =>
        HttpResponse.json({ pools: [], total_usd: 0, total_burned_usd: 0, note: "" }),
      ),
    );
    renderWithProviders(<Fire />);

    expect(await screen.findByText("No FIRE Data Yet")).toBeInTheDocument();
  });
});
