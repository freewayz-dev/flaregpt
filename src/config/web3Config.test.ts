import { describe, it, expect, afterEach, vi } from "vitest";

import { getWalletConnectMetadata } from "@/config/web3Config";

afterEach(() => {
  vi.unstubAllGlobals();
});

// Regression coverage for a real mobile PWA bug: connecting via
// WalletConnect (e.g. tapping MetaMask) from inside the installed PWA sent
// the user back to a plain browser tab instead of the PWA after approving.
// Root cause was `metadata.redirect.universal` being hardcoded to the plain
// web URL unconditionally — an explicit navigation instruction a mobile OS
// resolves by opening a *new* browser tab, not the already-open standalone
// app. See getWalletConnectMetadata's own comment for the full writeup.
describe("getWalletConnectMetadata", () => {
  it("omits redirect.universal when running as an installed PWA (display-mode: standalone)", () => {
    const original = window.matchMedia;
    window.matchMedia = (query: string) =>
      ({ ...original(query), matches: query === "(display-mode: standalone)" }) as MediaQueryList;

    const metadata = getWalletConnectMetadata();

    expect(metadata.redirect).toBeUndefined();

    window.matchMedia = original;
  });

  it("omits redirect.universal on iOS Safari's home-screen PWA (navigator.standalone)", () => {
    vi.stubGlobal("navigator", { ...window.navigator, standalone: true });

    const metadata = getWalletConnectMetadata();

    expect(metadata.redirect).toBeUndefined();
  });

  it("sets redirect.universal to the canonical web URL in a plain browser tab — the original Verify-API/branding fix, unaffected", () => {
    const metadata = getWalletConnectMetadata();

    expect(metadata.redirect).toEqual({ universal: "https://www.flaregpt.io/" });
  });

  it("always identifies the app's real origin/name regardless of PWA vs. browser — Verify API correctness must not depend on display mode", () => {
    vi.stubGlobal("navigator", { ...window.navigator, standalone: true });

    const metadata = getWalletConnectMetadata();

    expect(metadata.name).toBe("FlareGPT");
    expect(metadata.url).toBe("https://www.flaregpt.io");
  });
});
