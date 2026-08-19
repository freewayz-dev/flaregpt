import { describe, it, expect, vi } from "vitest";

import { switchToConston2ViaRawRequest } from "@/utils/walletConnectChainSwitch";
import { coston2 } from "@/config/web3Config";

// Direct unit coverage for the actual reported bug: on WalletConnect-
// connected wallets (Bifrost, Trust Wallet, confirmed live on real
// devices), wagmi's own switchChain waits on a `chainChanged` session
// event these wallets never send back for a switch to an already-
// pre-approved chain — hanging forever with the approval already granted
// wallet-side and nothing left for the app to do. See this function's own
// comment for the full trace.
describe("switchToConston2ViaRawRequest", () => {
  // Per-connector, not a shared module singleton — see createConfig.ts's own
  // `setup()`: each connector gets its own `emitter`, attached directly to
  // the connector object wagmi hands back from `useConnection()`. A plain
  // stub here (rather than a real Emitter instance) keeps this test focused
  // on what switchToConston2ViaRawRequest itself is responsible for: calling
  // `connector.emitter.emit(...)` with the right arguments, not reproducing
  // eventemitter3's own subscribe semantics.
  it("sends the real request, then syncs the provider's own chainId and this connector's own emitter by hand — the exact thing the missing session event would otherwise have done", async () => {
    const request = vi.fn().mockResolvedValue(null);
    const provider = { chainId: 14, request }; // starts on Flare mainnet
    const emitter = { emit: vi.fn() };
    const connector = { getProvider: vi.fn().mockResolvedValue(provider), emitter };

    await switchToConston2ViaRawRequest(connector);

    expect(request).toHaveBeenCalledWith({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${coston2.id.toString(16)}` }],
    });
    expect(provider.chainId).toBe(coston2.id);
    expect(emitter.emit).toHaveBeenCalledWith("change", { chainId: coston2.id });
  });

  it("never syncs anything if the wallet's own response rejects — no chain state gets faked from an unconfirmed request", async () => {
    const request = vi.fn().mockRejectedValue(new Error("User rejected the request."));
    const provider = { chainId: 14, request };
    const emitter = { emit: vi.fn() };
    const connector = { getProvider: vi.fn().mockResolvedValue(provider), emitter };

    await expect(switchToConston2ViaRawRequest(connector)).rejects.toThrow(
      "User rejected the request.",
    );
    expect(provider.chainId).toBe(14);
    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
