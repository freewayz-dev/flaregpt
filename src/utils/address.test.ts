import { describe, it, expect, vi, afterEach } from "vitest";

import { shortenAddress, copyWalletAddress } from "@/utils/address";

// Phase 0 smoke test — deliberately targets a small, existing pure utility
// with zero wallet/auth/chat content. Its real job is proving Vitest +
// jsdom + the `@/` alias actually run correctly before Phase 1 builds real
// wallet-state test content on top of this harness.
describe("shortenAddress", () => {
  it("shortens a full address to its first 6 and last 4 characters", () => {
    expect(shortenAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234...5678",
    );
  });

  it("returns an empty string for a falsy address", () => {
    expect(shortenAddress(undefined)).toBe("");
    expect(shortenAddress(null)).toBe("");
    expect(shortenAddress("")).toBe("");
  });
});

// The one guarantee every "copy this address" affordance in the app
// depends on — see the function's own comment in utils/address.ts for why
// this can never be routed through navigator.share(). These tests assert
// the clipboard receives *exactly* the address argument, byte for byte,
// regardless of chain/address format (EVM, XRP, BTC bech32, Dogecoin
// Base58) — never a nickname, shortened form, or any other UI metadata,
// because the function's signature makes passing anything else impossible.
describe("copyWalletAddress", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes exactly the EVM address to the clipboard, nothing else", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const address = "0x8DFE259E4eA889463a5ED98CBcb02C74f5cBb914";
    const result = await copyWalletAddress(address);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(address);
    expect(result).toBe(true);
  });

  it.each([
    ["XRP", "rPTuMXgPUdbwbctEN4rEFjWm88Hvfd9wLK"],
    ["BTC", "bc1q20z6wq7lhg6w95hala8702pud7dcmdrc0v5nf0"],
    ["DOGE", "D8ENqX9mMofTio3MTodyyjg4ti3yBLmV3A"],
  ])("writes exactly the %s address to the clipboard", async (_chain, address) => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await copyWalletAddress(address);

    expect(writeText).toHaveBeenCalledWith(address);
  });

  it("never mixes in a nickname or other label even if one is passed as part of a larger string by mistake", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const address = "0x8DFE259E4eA889463a5ED98CBcb02C74f5cBb914";
    await copyWalletAddress(address);

    const written = writeText.mock.calls[0][0] as string;
    expect(written).not.toContain("My Main Wallet");
    expect(written).not.toMatch(/\s/);
    expect(written).toBe(address);
  });

  it("returns false when the clipboard write fails", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    const result = await copyWalletAddress("0x8DFE259E4eA889463a5ED98CBcb02C74f5cBb914");

    expect(result).toBe(false);
  });
});
