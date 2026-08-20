import { describe, it, expect, vi, afterEach } from "vitest";

import {
  switchToConston2ViaRawRequest,
  assertConston2InWalletConnectSession,
  addConston2ToWalletConnectSession,
  withWalletConnectTimeout,
  WalletConnectChainUnsupportedError,
  WalletConnectAddChainUnsupportedError,
  WalletConnectRequestTimeoutError,
} from "@/utils/walletConnectChainSwitch";
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

  it("rejects with WalletConnectRequestTimeoutError if the wallet never responds", async () => {
    vi.useFakeTimers();
    try {
      const request = vi.fn(() => new Promise(() => {})); // never resolves
      const provider = { chainId: 14, request };
      const connector = { getProvider: vi.fn().mockResolvedValue(provider), emitter: { emit: vi.fn() } };

      const result = switchToConston2ViaRawRequest(connector);
      const assertion = expect(result).rejects.toThrow(WalletConnectRequestTimeoutError);
      await vi.advanceTimersByTimeAsync(60_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});

// Direct unit coverage for the third real cause found on a follow-up
// device round: the pre-flight namespace check kept failing even right
// after an explicit disconnect + fresh reconnect, meaning a genuinely new
// pairing offering Coston2 was still consistently declined by the wallet.
// See addConston2ToWalletConnectSession's own comment for the full trace.
describe("addConston2ToWalletConnectSession", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends a well-formed wallet_addEthereumChain request for Coston2", async () => {
    const request = vi.fn().mockResolvedValue(null);
    const provider = { request };
    const connector = { getProvider: vi.fn().mockResolvedValue(provider) };

    await addConston2ToWalletConnectSession(connector);

    expect(request).toHaveBeenCalledWith({
      method: "wallet_addEthereumChain",
      params: [
        expect.objectContaining({
          chainId: `0x${coston2.id.toString(16)}`,
          chainName: coston2.name,
          nativeCurrency: coston2.nativeCurrency,
          rpcUrls: [...coston2.rpcUrls.default.http],
        }),
      ],
    });
  });

  it("propagates a real rejection (e.g. the user declining the add-network prompt) as-is", async () => {
    const request = vi.fn().mockRejectedValue(new Error("User rejected the request."));
    const provider = { request };
    const connector = { getProvider: vi.fn().mockResolvedValue(provider) };

    await expect(addConston2ToWalletConnectSession(connector)).rejects.toThrow(
      "User rejected the request.",
    );
  });

  it("rejects with WalletConnectRequestTimeoutError if the wallet never responds to the add-chain request either", async () => {
    vi.useFakeTimers();
    const request = vi.fn(() => new Promise(() => {}));
    const provider = { request };
    const connector = { getProvider: vi.fn().mockResolvedValue(provider) };

    const result = addConston2ToWalletConnectSession(connector);
    const assertion = expect(result).rejects.toThrow(WalletConnectRequestTimeoutError);
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
  });

  // Direct unit coverage for the actual live-device response, confirmed
  // real rather than assumed: a wallet's own WalletConnect integration
  // rejecting the add-chain request outright — fast, not a hang — because
  // it doesn't support adding custom/unrecognized chains at all, not
  // because a human declined a prompt that was shown. See this function's
  // own comment for the full trace, including why this is treated
  // differently from a genuine user rejection.
  it("wraps a real wallet-side decline (not a user rejection) in WalletConnectAddChainUnsupportedError", async () => {
    const walletError = new Error("Chain with id 0x72 (114) is not possible to add.");
    const request = vi.fn().mockRejectedValue(walletError);
    const provider = { request };
    const connector = { getProvider: vi.fn().mockResolvedValue(provider) };

    const promise = addConston2ToWalletConnectSession(connector);
    await expect(promise).rejects.toThrow(WalletConnectAddChainUnsupportedError);
    await promise.catch((error) => {
      expect(error.cause).toBe(walletError);
    });
  });
});

// Direct unit coverage for the second real cause found on a follow-up
// device round, after switchToConston2ViaRawRequest alone turned out not
// to fix Bifrost/Trust Wallet: Coston2 is only ever *offered* to a wallet
// as an optional chain at pairing time, and this app's own
// `isNewChainsStale: false` setting (see web3Config.js) means nothing
// re-validates it actually made it into the wallet's approved session
// namespace before this flow tries to use it. See
// assertConston2InWalletConnectSession's own comment for the full trace.
describe("assertConston2InWalletConnectSession", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not throw when Coston2 is in the session's approved chains", async () => {
    const connector = {
      getProvider: vi.fn().mockResolvedValue({}),
      getNamespaceChainsIds: vi.fn().mockReturnValue([14, coston2.id]),
    };
    await expect(assertConston2InWalletConnectSession(connector)).resolves.toBeUndefined();
  });

  it("throws WalletConnectChainUnsupportedError when the session's approved chains don't include Coston2", async () => {
    const connector = {
      getProvider: vi.fn().mockResolvedValue({}),
      getNamespaceChainsIds: vi.fn().mockReturnValue([14, 19]),
    };
    await expect(assertConston2InWalletConnectSession(connector)).rejects.toThrow(
      WalletConnectChainUnsupportedError,
    );
  });

  it("treats an empty/unknown chain list as inconclusive, not unsupported — matches walletConnect.ts's own isChainsStale() guard", async () => {
    const connector = {
      getProvider: vi.fn().mockResolvedValue({}),
      getNamespaceChainsIds: vi.fn().mockReturnValue([]),
    };
    await expect(assertConston2InWalletConnectSession(connector)).resolves.toBeUndefined();
  });

  it("ensures the provider is initialized before reading namespace chains, since getNamespaceChainsIds() reads from it", async () => {
    const connector = {
      getProvider: vi.fn().mockResolvedValue({}),
      getNamespaceChainsIds: vi.fn().mockReturnValue([]),
    };
    await assertConston2InWalletConnectSession(connector);
    expect(connector.getProvider).toHaveBeenCalled();
  });
});

describe("withWalletConnectTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the wrapped promise's value when it settles before the timeout", async () => {
    await expect(withWalletConnectTimeout(Promise.resolve("ok"))).resolves.toBe("ok");
  });

  it("rejects with WalletConnectRequestTimeoutError once the timeout elapses with no response", async () => {
    vi.useFakeTimers();
    const neverResolves = new Promise(() => {});
    const assertion = expect(withWalletConnectTimeout(neverResolves, 1_000)).rejects.toThrow(
      WalletConnectRequestTimeoutError,
    );
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
  });

  // Direct coverage for the actual reported bug: a live device showed the
  // wallet itself reporting its session as disconnected, well past this
  // timeout's own threshold, while this app's button stayed stuck — the
  // scheduled setTimeout never fired, because it was scheduled the instant
  // this tab/PWA got backgrounded for the wallet app-switch, and mobile
  // browsers suspend/throttle timers on a backgrounded page. This
  // simulates exactly that: real time passes (vi.setSystemTime, which
  // moves Date.now() without running any queued timer callback — the same
  // as a backgrounded page's frozen event loop), the scheduled setTimeout
  // is deliberately never advanced/flushed, and only `visibilitychange`
  // firing (the moment the user returns to the tab) is what recovers.
  it("recovers via visibilitychange even if the scheduled setTimeout itself never fires — the actual backgrounded-tab bug", async () => {
    vi.useFakeTimers();
    const neverResolves = new Promise(() => {});
    const assertion = expect(withWalletConnectTimeout(neverResolves, 60_000)).rejects.toThrow(
      WalletConnectRequestTimeoutError,
    );

    // Real wall-clock time passes while "backgrounded" — Date.now() moves
    // forward, but the setTimeout callback itself is never allowed to run
    // (no vi.advanceTimersByTimeAsync call), matching a suspended
    // background-tab event loop exactly.
    vi.setSystemTime(Date.now() + 60_000);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    await assertion;
  });

  it("does not reject early on visibilitychange if not enough real time has actually passed yet", async () => {
    vi.useFakeTimers();
    const request = vi.fn().mockResolvedValue("ok");
    const result = withWalletConnectTimeout(request(), 60_000);

    vi.setSystemTime(Date.now() + 5_000);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    await expect(result).resolves.toBe("ok");
  });
});
