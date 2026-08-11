import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { isChunkLoadError, recoverFromChunkLoadError } from "@/utils/chunkLoadRecovery";

describe("isChunkLoadError", () => {
  it("matches Chromium/Firefox's dynamic-import failure wording", () => {
    expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module: /assets/foo.js"))).toBe(true);
  });

  it("matches Firefox's alternate wording", () => {
    expect(isChunkLoadError(new Error("error loading dynamically imported module"))).toBe(true);
  });

  it("matches Safari's wording", () => {
    expect(isChunkLoadError(new Error("Importing a module script failed"))).toBe(true);
  });

  it("matches webpack-style ChunkLoadError wording too, for robustness", () => {
    expect(isChunkLoadError(new Error("Loading chunk 42 failed."))).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isChunkLoadError(new Error("IMPORTING A MODULE SCRIPT FAILED"))).toBe(true);
  });

  it("does not match an unrelated application error", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'map')"))).toBe(false);
  });

  it("does not match a plain network/API error", () => {
    expect(isChunkLoadError(new Error("Request failed with status code 500"))).toBe(false);
  });

  it("returns false for a non-Error thrown value", () => {
    expect(isChunkLoadError("Importing a module script failed")).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("recoverFromChunkLoadError", () => {
  const originalReload = window.location.reload;

  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: vi.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { value: { ...window.location, reload: originalReload }, writable: true });
    sessionStorage.clear();
  });

  it("reloads the page for a genuine chunk-load error", () => {
    const handled = recoverFromChunkLoadError(new Error("Failed to fetch dynamically imported module"));

    expect(handled).toBe(true);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload for an unrelated application error", () => {
    const handled = recoverFromChunkLoadError(new Error("Cannot read properties of undefined"));

    expect(handled).toBe(false);
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  // The exact regression this guards against: "Try again" doing nothing
  // because the same stale bundle keeps hitting the same missing chunk —
  // if a reload genuinely doesn't fix it (e.g. the service worker is also
  // serving a stale app-shell), auto-reloading a second time would loop
  // forever rather than ever showing the user anything.
  it("only ever auto-reloads once per session, even for repeated chunk-load errors", () => {
    const first = recoverFromChunkLoadError(new Error("Failed to fetch dynamically imported module"));
    const second = recoverFromChunkLoadError(new Error("Importing a module script failed"));

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it("does not throw if sessionStorage access fails (e.g. Safari Private Browsing)", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() =>
      recoverFromChunkLoadError(new Error("Failed to fetch dynamically imported module")),
    ).not.toThrow();
    expect(window.location.reload).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
  });
});
