import { describe, it, expect } from "vitest";

import { getActionDirection } from "@/pages/WalletActivity/utils/deriveActivity";

describe("getActionDirection", () => {
  it("reads RECEIVE as inbound and SEND as outbound", () => {
    expect(getActionDirection("TOKEN_RECEIVE")).toBe("in");
    expect(getActionDirection("TOKEN_SEND")).toBe("out");
  });

  it("treats a completed FXRP mint as inbound and a redeem as outbound", () => {
    expect(getActionDirection("FXRP_MINT")).toBe("in");
    expect(getActionDirection("FXRP_REDEEM")).toBe("out");
  });

  it("does not treat a not-yet-completed mint reservation as inbound", () => {
    expect(getActionDirection("FXRP_MINT_RESERVE")).toBe("neutral");
  });

  it("treats a core vault transfer as neutral — an agent operator action, not a user send/receive", () => {
    expect(getActionDirection("FXRP_CORE_VAULT_TRANSFER")).toBe("neutral");
  });

  it("falls back to neutral for an unrecognized or missing tag", () => {
    expect(getActionDirection("TOKEN_SWAP")).toBe("neutral");
    expect(getActionDirection(undefined)).toBe("neutral");
  });
});
