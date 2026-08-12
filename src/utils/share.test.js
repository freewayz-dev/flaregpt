import { describe, it, expect, afterEach, vi } from "vitest";

import { isWebShareSupported, shareOrCopy } from "@/utils/share";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isWebShareSupported", () => {
  it("is false when navigator.share doesn't exist (most desktop browsers)", () => {
    vi.stubGlobal("navigator", { ...window.navigator, share: undefined });
    expect(isWebShareSupported()).toBe(false);
  });

  it("is true when navigator.share exists", () => {
    vi.stubGlobal("navigator", { ...window.navigator, share: vi.fn() });
    expect(isWebShareSupported()).toBe(true);
  });
});

describe("shareOrCopy", () => {
  const data = { title: "FlareGPT", text: "Check this out", url: "https://www.flaregpt.io/app/defi?protocol=sceptre" };

  it("uses navigator.share when supported and reports 'shared' on success", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...window.navigator, share, clipboard: { writeText: vi.fn() } });

    const result = await shareOrCopy(data);

    expect(share).toHaveBeenCalledWith(data);
    expect(result).toBe("shared");
  });

  it("reports 'cancelled' (not 'failed') when the user dismisses the native share sheet", async () => {
    const abortError = Object.assign(new Error("The user aborted a request."), { name: "AbortError" });
    const share = vi.fn().mockRejectedValue(abortError);
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { ...window.navigator, share, clipboard: { writeText } });

    const result = await shareOrCopy(data);

    expect(result).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to clipboard when navigator.share rejects with something other than AbortError", async () => {
    const share = vi.fn().mockRejectedValue(new Error("share sheet unavailable"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...window.navigator, share, clipboard: { writeText } });

    const result = await shareOrCopy(data);

    expect(writeText).toHaveBeenCalledWith(data.url);
    expect(result).toBe("copied");
  });

  it("copies the url directly when Web Share isn't supported at all", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...window.navigator, share: undefined, clipboard: { writeText } });

    const result = await shareOrCopy(data);

    expect(writeText).toHaveBeenCalledWith(data.url);
    expect(result).toBe("copied");
  });

  it("reports 'failed' when neither share nor clipboard is available/working", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard denied"));
    vi.stubGlobal("navigator", { ...window.navigator, share: undefined, clipboard: { writeText } });

    const result = await shareOrCopy(data);

    expect(result).toBe("failed");
  });
});
