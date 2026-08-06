import { describe, it, expect } from "vitest";

import { shortenAddress } from "@/utils/address";

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
