import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { toast } from "react-toastify";

import { server } from "@/test/mocks/server";
import { initI18n } from "@/i18n";

// Unlike `window.scrollTo` (which jsdom stubs as a no-op that just logs a
// "not implemented" warning), jsdom doesn't implement
// `Element.prototype.scrollIntoView` at all — calling it throws
// `TypeError: ... is not a function`. Any test that renders a live
// message list (MessageList.jsx's own autoscroll effect calls this on
// mount) hits this, and an uncaught error there crashes past the
// component boundary and unmounts the whole render — not a bug in any one
// test, an infrastructure gap the first test to render real chat content
// was always going to hit.
Element.prototype.scrollIntoView = vi.fn();



// The real app never renders anything until `initI18n()` resolves (see
// main.jsx) — every `t("some.key")` call is a no-op returning the raw key
// string until react-i18next has real resources loaded. Nothing in the
// test environment was calling this, which meant every component test
// asserting on translated text was comparing against literal key strings
// like "dashboard.common.noWalletSelected" instead of "No wallet
// selected" — not a test bug, an infrastructure gap: every future test
// touching any translated UI would have hit the exact same wall. Reusing
// the app's real `initI18n()` (not a parallel test-only i18n stub) means
// tests see exactly the same English strings production does.
beforeAll(async () => {
  await initI18n();
});

// `onUnhandledRequest: "error"` — any test that accidentally hits a real,
// un-mocked network call fails loudly and immediately instead of either
// silently hanging or (worse) actually reaching a live third-party service.
// Every request this app makes must be explicitly handled in
// src/test/mocks/handlers.js or added per-test via `server.use(...)`.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

// Zustand stores are module-level singletons — without an explicit reset,
// one test's `setState` leaks into whatever test runs next in the same
// file/worker, producing exactly the order-dependent flakiness this suite
// exists to avoid. Auto-discovered via a glob (every store's own module,
// eagerly loaded) rather than a hand-maintained list of imports — a
// hardcoded list is exactly the kind of helper that quietly rots: it's
// correct the day it's written, then silently stops covering a new store
// added six months later, and nothing fails loudly when that happens, it
// just reintroduces the flakiness this exists to prevent. Detecting a
// store by `typeof export.getState === "function"` (every Zustand hook
// has this attached, regardless of name) means a new src/store file is
// covered automatically, with no setup.ts edit required.
const storeModules = import.meta.glob("../store/*.js", { eager: true });
const stores = Object.values(storeModules)
  .flatMap((mod) => Object.values(mod))
  .filter((exported) => typeof (exported)?.getState === "function");
const initialStates = stores.map((store) => store.getState());

// A single, explicitly-ordered afterEach rather than several independent
// ones — order matters here and leaving it to hook-registration order
// would be fragile. React Testing Library normally registers its own
// auto-cleanup automatically, but only when it detects a *global*
// `afterEach` — this config deliberately uses `globals: false` (see
// vite.config.js), so that auto-detection silently never fires and
// components from one test were staying mounted into the next. Confirmed
// live: a previous test's still-mounted probe component kept reacting to
// state changes and leaked its watchlist-selected `activeAddress` into an
// unrelated later test, well after Vitest itself had "finished" it. Not a
// test bug — every future test in the same file would have hit this.
// Explicit order: stop new mocked responses first, then unmount (letting
// any real effect-cleanup functions run one last time), then reset store
// state last, so it's the final word regardless of what unmounting itself
// triggered.
afterEach(() => {
  server.resetHandlers();
  // react-toastify's queue is a module-level singleton (not owned by
  // whichever ToastContainer happens to be mounted right now) — without
  // this, a toast triggered by one test but never awaited/dismissed could
  // still be active when the next test's fresh ToastContainer mounts,
  // leaking into an unrelated test's DOM.
  toast.dismiss();
  cleanup();
  stores.forEach((store, i) => store.setState(initialStates[i], true));
});
