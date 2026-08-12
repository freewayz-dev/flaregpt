import { describe, it, expect } from "vitest";

import { DONATION_COINS } from "@/config/donation";

// FlareGPT's real donation addresses — copied byte-for-byte from the
// request that provided them. This test exists specifically to catch any
// accidental reformatting/checksumming/truncation of these addresses,
// since a single wrong character here sends real donor funds nowhere
// recoverable.
const REAL_ADDRESSES = {
  flr: "0x8DFE259E4eA889463a5ED98CBcb02C74f5cBb914",
  sgb: "0x8DFE259E4eA889463a5ED98CBcb02C74f5cBb914",
  xrp: "rPTuMXgPUdbwbctEN4rEFjWm88Hvfd9wLK",
  btc: "bc1q20z6wq7lhg6w95hala8702pud7dcmdrc0v5nf0",
  doge: "D8ENqX9mMofTio3MTodyyjg4ti3yBLmV3A",
};

describe("DONATION_COINS", () => {
  it("has exactly the 5 supported coins, no more and no fewer", () => {
    expect(DONATION_COINS.map((c) => c.id).sort()).toEqual(
      Object.keys(REAL_ADDRESSES).sort(),
    );
  });

  it.each(Object.entries(REAL_ADDRESSES))(
    "uses the exact real %s address, unmodified",
    (id, expectedAddress) => {
      const coin = DONATION_COINS.find((c) => c.id === id);
      expect(coin?.address).toBe(expectedAddress);
    },
  );

  it("never has an isMultisig or receivedAmount field — these are not multisig wallets and there is no real donation-stats backend", () => {
    for (const coin of DONATION_COINS) {
      expect(coin).not.toHaveProperty("isMultisig");
      expect(coin).not.toHaveProperty("receivedAmount");
    }
  });

  it("does not export fabricated funding goals", async () => {
    const module = await import("@/config/donation");
    expect((module).FUNDING_GOALS).toBeUndefined();
  });
});
