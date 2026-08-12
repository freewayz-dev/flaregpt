// Runs before setup.js (see vite.config.js's `test.setupFiles` order) and
// deliberately has no imports of its own — jsdom doesn't implement
// `window.matchMedia` at all, but `useUIStore.js` calls it eagerly at
// module-evaluation time (`darkMode: getSystemPreference()` runs the
// instant the store module is first imported, not inside a function called
// later). Without this running first, simply importing any store — even
// indirectly, even just to reset it in setup.js — throws immediately and
// breaks every test. Defaults to `matches: false` (no dark-mode
// preference); a test that specifically needs a dark-mode system
// preference can override `window.matchMedia` itself.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom implements neither ResizeObserver (Wallets.tsx's tracked-wallet
// list and ActivityFeed.tsx both use @tanstack/react-virtual, which needs
// one to detect its scroll container's size) nor real layout, so every
// element's getBoundingClientRect() is always all-zero regardless. Without
// both stubs, a virtualizer computes a zero-height viewport and silently
// renders zero rows — no error, no warning, just an empty list — which is
// indistinguishable from "this list is genuinely empty" to a test that
// doesn't already know to suspect this. A fixed non-zero rect is enough for
// react-virtual's own range math; it doesn't need real per-element layout.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof Element !== "undefined") {
  Element.prototype.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 1000,
    bottom: 1000,
    width: 1000,
    height: 1000,
    toJSON() {},
  });
}
// @tanstack/react-virtual's own size read (see its measureElement /
// createResizeObserver) uses offsetWidth/offsetHeight specifically, not
// getBoundingClientRect — jsdom leaves both as permanently-0 read-only
// getters (no real layout engine), so this needs its own override.
if (typeof HTMLElement !== "undefined") {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get: () => 1000,
  });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => 1000,
  });
}
