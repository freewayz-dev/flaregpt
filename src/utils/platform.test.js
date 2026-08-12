import { describe, it, expect, afterEach, vi } from "vitest";

import { isIOSDevice, isStandaloneDisplayMode } from "@/utils/platform";

function setUserAgent(ua) {
  vi.stubGlobal("navigator", { ...window.navigator, userAgent: ua, platform: window.navigator.platform });
}

function setPlatformAndTouch(platform, maxTouchPoints) {
  vi.stubGlobal("navigator", { ...window.navigator, platform, maxTouchPoints });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isIOSDevice", () => {
  it("detects a classic iPhone/iPod/iPad user agent", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    );
    expect(isIOSDevice()).toBe(true);
  });

  it("detects modern iPadOS, which reports a MacIntel-style UA with multi-touch", () => {
    setPlatformAndTouch("MacIntel", 5);
    expect(isIOSDevice()).toBe(true);
  });

  it("does not misidentify a real Mac (MacIntel with no touch support)", () => {
    setPlatformAndTouch("MacIntel", 0);
    expect(isIOSDevice()).toBe(false);
  });

  it("returns false for a desktop Chrome user agent", () => {
    setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
    );
    expect(isIOSDevice()).toBe(false);
  });
});

describe("isStandaloneDisplayMode", () => {
  it("returns false when nothing indicates an installed app", () => {
    expect(isStandaloneDisplayMode()).toBe(false);
  });

  it("returns true when display-mode: standalone matches", () => {
    const original = window.matchMedia;
    window.matchMedia = (query) =>
      ({ ...original(query), matches: query === "(display-mode: standalone)" });
    expect(isStandaloneDisplayMode()).toBe(true);
    window.matchMedia = original;
  });

  it("returns true on iOS Safari's navigator.standalone", () => {
    vi.stubGlobal("navigator", { ...window.navigator, standalone: true });
    expect(isStandaloneDisplayMode()).toBe(true);
  });
});
