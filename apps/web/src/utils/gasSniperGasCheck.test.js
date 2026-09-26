import { describe, it, expect, vi } from "vitest";
import { parseEther } from "viem";

import {
  assertSufficientCoston2GasBalance,
  InsufficientGasBalanceError,
  formatC2FlrShortfall,
} from "@/utils/gasSniperGasCheck";

function mockPublicClient({ gasEstimate, gasPrice, balance }) {
  return {
    estimateContractGas: vi.fn().mockResolvedValue(gasEstimate),
    getGasPrice: vi.fn().mockResolvedValue(gasPrice),
    getBalance: vi.fn().mockResolvedValue(balance),
  };
}

// Direct unit coverage for the actual reported "insufficient balance"
// case — investigated live against Coston2's real RPC rather than assumed
// to be a wallet UI quirk (see this function's own comment for the full
// trace: the keeper's own fee genuinely is 0 right now, ruling out an
// inflated `value`; the real cost is Coston2's current gas price times a
// real ~116,000-gas call, independently verified to match what MetaMask's
// own confirmation screen showed almost to the decimal).
describe("assertSufficientCoston2GasBalance", () => {
  it("does not throw when the balance comfortably covers gas + value", async () => {
    const client = mockPublicClient({
      gasEstimate: 116_000n,
      gasPrice: 650_000_000_000n, // 650 gwei, matching Coston2's live price
      balance: parseEther("1"),
    });

    await expect(
      assertSufficientCoston2GasBalance({ publicClient: client, account: "0xabc", value: 0n }),
    ).resolves.toBeUndefined();
  });

  it("throws InsufficientGasBalanceError with the exact shortfall when the balance falls short", async () => {
    const gasEstimate = 116_000n;
    const gasPrice = 650_000_000_000n;
    const required = gasEstimate * gasPrice; // ~0.0754 C2FLR, value = 0
    const balance = required - 1n; // one wei short

    const client = mockPublicClient({ gasEstimate, gasPrice, balance });

    const promise = assertSufficientCoston2GasBalance({
      publicClient: client,
      account: "0xabc",
      value: 0n,
    });

    await expect(promise).rejects.toThrow(InsufficientGasBalanceError);
    await promise.catch((error) => {
      expect(error.required).toBe(required);
      expect(error.available).toBe(balance);
    });
  });

  it("includes the transaction's own value in what's required, not just gas", async () => {
    const gasEstimate = 116_000n;
    const gasPrice = 650_000_000_000n;
    const value = parseEther("0.5");
    const gasCost = gasEstimate * gasPrice;
    // Enough for gas alone, not enough once value is added — proves value
    // is genuinely included in the required total, not silently dropped.
    const balance = gasCost + parseEther("0.1");

    const client = mockPublicClient({ gasEstimate, gasPrice, balance });

    await expect(
      assertSufficientCoston2GasBalance({ publicClient: client, account: "0xabc", value }),
    ).rejects.toThrow(InsufficientGasBalanceError);
  });

  it("passes the same value through to the gas estimate itself, not just the balance comparison", async () => {
    const client = mockPublicClient({
      gasEstimate: 116_000n,
      gasPrice: 650_000_000_000n,
      balance: parseEther("1"),
    });
    const value = parseEther("0.01");

    await assertSufficientCoston2GasBalance({ publicClient: client, account: "0xabc", value });

    expect(client.estimateContractGas).toHaveBeenCalledWith(
      expect.objectContaining({ account: "0xabc", value }),
    );
  });
});

describe("formatC2FlrShortfall", () => {
  it("formats a whole-token amount with no trailing decimal noise", () => {
    expect(formatC2FlrShortfall(parseEther("1"))).toBe("1");
  });

  it("trims to 4 decimal places, matching the precision the wallet's own UI showed", () => {
    // 0.0753876... C2FLR — the live-confirmed real estimate this app is
    // meant to match, trimmed rather than rounded.
    expect(formatC2FlrShortfall(75_387_650_000_000_000n)).toBe("0.0753");
  });

  it("does not pad a short fraction with trailing zeros", () => {
    expect(formatC2FlrShortfall(parseEther("0.5"))).toBe("0.5");
  });
});
