import { test, expect } from "@playwright/test";

import { ROUTES } from "../src/config/routes";
import { injectedWalletScript, MOCK_WALLET_ADDRESS } from "./mocks/injectedWallet";
import { mockRestEndpoints } from "./mocks/network";

const SHORTENED_ADDRESS = `${MOCK_WALLET_ADDRESS.slice(0, 6)}...${MOCK_WALLET_ADDRESS.slice(-4)}`;

// The 90s override (Playwright's own default is 30s) exists for the same
// measured reason as the chart assertion's own 45s below — the two
// timeouts are independent (a per-test ceiling on this whole function's
// total wall-clock time vs. a per-assertion retry budget), and a slow-but-
// successful chart render alone can already consume most of the default
// 30s test budget, leaving nothing for the real assertions/clicks after
// it. Without this, a run that would have passed the chart assertion
// eventually instead gets killed by the *test's* timeout first — visible
// in practice as "Protocol error... session closed" rather than the
// assertion's own timeout message, since the whole page tears down
// mid-wait. Repeated back-to-back local measurements (fresh production
// build + browser launch each time, no gap — real resource contention,
// not a clean isolated read) put the actual worst case well into the
// 25-30s range on ordinary hardware under load; a single real CI job
// builds and runs once, so this is deliberately padded well past that
// observed ceiling rather than tuned to the exact number, since neither
// this machine's load pattern nor GitHub's shared runners are precisely
// reproducible from here.
test(
  "routing + wallet connect: disconnected empty state -> connected populated state",
  { timeout: 90_000 },
  async ({ page }) => {
    await page.addInitScript(injectedWalletScript, MOCK_WALLET_ADDRESS);
    await mockRestEndpoints(page);

    // Hard navigation straight to an /app sub-route — the one thing
    // `vite preview` can't exercise, since it doesn't know about
    // vercel.json's `/app -> app-shell.html` rewrite. Landing here at all
    // (not a 404, not the landing page bleeding through) already proves the
    // static server's rewrite handling is faithful to production.
    await page.goto(ROUTES.app);

    // Recharts has a recurring bug class (most recently reported against
    // this exact library major in Jan 2026) where charts inside
    // ResponsiveContainer render blank in *minified production builds*
    // specifically — a displayName check that behaves differently pre/post
    // minification — with no console error. jsdom-based Vitest tests can
    // never catch this (they never run a minified bundle); this real
    // production build, served for real, is the only layer of the whole
    // suite that can. FlrPriceChart renders unconditionally on this page,
    // even disconnected, so this doesn't need to wait for the wallet flow
    // below — asserting a real <path> was drawn, not just that the <svg>
    // container exists, since an empty/childless surface is exactly what
    // the bug produces.
    //
    // The explicit 45s timeout (well above Playwright's 5s default) isn't
    // padding for flakiness — it's measured. This is the one assertion in
    // the whole suite waiting on the full real cost of a cold page load:
    // parsing/executing the real production bundle, the injected wallet
    // mock, React 19 hydration, and recharts' own ResponsiveContainer
    // measurement + first paint, all before this path exists at all. A
    // single CPU-throttled reproduction (Playwright CDP
    // `Emulation.setCPUThrottlingRate` against this exact build) measured
    // the real, successful time-to-path at ~8.5s completely unthrottled,
    // ~12s at 4x — already past the 5s default even with nothing wrong.
    // Repeated back-to-back local runs (harsher than a real CI job, which
    // builds and runs once rather than in a tight loop) pushed the
    // observed worst case into the high-20s/low-30s range under real
    // contention. A short default timeout here doesn't fail faster on a
    // genuine regression (the bug this assertion actually guards against
    // is a permanently blank chart, not a slow one) — it just made a
    // reliably-succeeding check flaky under normal CI load, so this is
    // padded generously past the worst case actually observed rather than
    // trimmed to it.
    await expect(page.locator("svg.recharts-surface path").first()).toBeVisible({
      timeout: 45_000,
    });

    await expect(page.getByText("No wallet selected").first()).toBeVisible();
    await expect(
      page.getByText("Connect a wallet or add one to your watchlist to see balances."),
    ).toBeVisible();

    // The sidebar's "Connect Wallet" button opens the modal directly (see
    // Sidebar.jsx) — deliberately using this one specific button rather than
    // a bare role/name locator, since several distinct "Connect Wallet"
    // buttons exist on screen at once (sidebar, navbar) and only this one
    // is a plain direct opener.
    await page.getByRole("complementary").getByRole("button", { name: "Connect Wallet" }).click();
    await page.getByRole("button", { name: "MetaMask" }).click();

    await expect(page.getByText(SHORTENED_ADDRESS).first()).toBeVisible();

    await expect(page.getByText("No wallet selected")).toHaveCount(0);
    await expect(page.getByText("FLR").first()).toBeVisible();
  },
);
