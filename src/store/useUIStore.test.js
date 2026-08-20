import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { useUIStore, applyThemeColorMeta } from "@/store/useUIStore";

function themeColorContent() {
  return document.querySelector('meta[name="theme-color"]')?.getAttribute("content");
}

describe("applyThemeColorMeta", () => {
  beforeEach(() => {
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", "#E62058");
    document.head.appendChild(meta);
  });

  it("matches DashboardLayout's own dark surface color", () => {
    applyThemeColorMeta(true);
    expect(themeColorContent()).toBe("#101115");
  });

  it("matches DashboardLayout's own light surface color", () => {
    applyThemeColorMeta(false);
    expect(themeColorContent()).toBe("#F0F4F9");
  });

  it("does nothing (doesn't throw) if the meta tag isn't present", () => {
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
    expect(() => applyThemeColorMeta(true)).not.toThrow();
  });
});

describe("useUIStore.setAppearance — theme-color side effect", () => {
  beforeEach(() => {
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", "#E62058");
    document.head.appendChild(meta);
    vi.useFakeTimers();
  });

  // setAppearance schedules a real `setTimeout` (removing the
  // `no-transition` class after 50ms — see useUIStore.js) that neither
  // test below ever waits for. Left as a real timer, it fires 50ms of
  // *wall-clock* time later, well after this synchronous test — and often
  // this file — has already finished, landing in whatever test file
  // happens to be running by then and throwing `document is not defined`
  // once its own jsdom environment has already been torn down. Faking
  // timers and flushing them before the test ends keeps the timeout's
  // entire lifecycle inside this test's own execution window, so nothing
  // is left pending to fire later into a torn-down environment.
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("updates theme-color to the dark surface when switching to dark mode", () => {
    useUIStore.getState().setAppearance("dark");
    expect(themeColorContent()).toBe("#101115");
  });

  it("updates theme-color to the light surface when switching to light mode", () => {
    useUIStore.getState().setAppearance("light");
    expect(themeColorContent()).toBe("#F0F4F9");
  });
});

// Regression test: Settings must always open on its default tab for a new
// visit, never resume wherever the user last left it (e.g. Security) days
// later — see the `partialize` exclusion this asserts against. Checking
// the actual localStorage payload zustand-persist writes, not just the
// live in-memory store, is what makes this a real regression guard: the
// in-memory value is expected to change immediately (Settings still works
// as a normal tab within the current session), only *persisting* it is
// the behavior being removed.
describe("useUIStore persistence — settingsActiveTab is excluded", () => {
  it("never writes settingsActiveTab to localStorage, even after changing it", () => {
    useUIStore.getState().setSettingsActiveTab("Security");
    const raw = localStorage.getItem("flaregpt_ui_preferences");
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw ?? "{}");
    expect(persisted.state).not.toHaveProperty("settingsActiveTab");
  });

  it("still persists other preferences normally — the exclusion is scoped to this one field", () => {
    useUIStore.getState().setCurrency("EUR");
    const raw = localStorage.getItem("flaregpt_ui_preferences");
    const persisted = JSON.parse(raw ?? "{}");
    expect(persisted.state.currency).toBe("EUR");
  });
});
