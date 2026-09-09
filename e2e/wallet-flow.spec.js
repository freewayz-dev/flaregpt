import { test, expect } from "@playwright/test";

import { ROUTES } from "../src/config/routes";
import { injectedWalletScript, MOCK_WALLET_ADDRESS } from "./mocks/injectedWallet";
import { mockRestEndpoints } from "./mocks/network";

const SHORTENED_ADDRESS = `${MOCK_WALLET_ADDRESS.slice(0, 6)}...${MOCK_WALLET_ADDRESS.slice(-4)}`;

test("routing + wallet connect: disconnected empty state -> connected populated state", async ({
  page,
}) => {
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
  // Scoped to FlrPriceChart's own card, not a bare
  // `page.locator("svg.recharts-surface path")` — a real CI failure
  // proved that matters. The Overview page also renders
  // NetworkActivityChart, a *separate* recharts LineChart (gas price)
  // that only mounts once it has 2+ live-polled samples and is flat (zero
  // geometric height — Playwright correctly reports that as hidden, not
  // visible) whenever those samples share the same mocked value, which is
  // exactly what a static E2E mock produces. An unscoped `.first()` has no
  // way to know which chart it lands on; it isn't guaranteed to be
  // FlrPriceChart's, and CI caught it grabbing NetworkActivityChart's flat
  // line instead, then waiting out the full timeout for a path that was
  // never going to become visible. Scoping to the card via its own heading
  // makes this deterministic regardless of which chart happens to mount
  // first.
  const flrPriceCard = page
    .locator("div.rounded-2xl")
    .filter({ has: page.getByRole("heading", { name: "FLR Price", exact: true }) });

  // A second, separate real CI failure (this one an outright "Couldn't
  // load FLR price history" error state, not a timing issue at all)
  // traced back to mockRestEndpoints() never actually mocking this chart's
  // data source: FlareGPT's own backend only exposes a current spot price,
  // not a time series, so historical FLR/USD data comes directly from
  // CoinGecko's public API instead (see dashboardService.js). That call
  // was silently real and live this whole time — invisible while it
  // happened to succeed fast enough, but a genuine, unintended dependency
  // on a rate-limited third party that no hermetic E2E suite should have.
  // Now mocked in mocks/network.js, matching every other endpoint here.
  //
  // The explicit 15s timeout (Playwright's own default is 5s) accounts for
  // what's left once that's fixed: the real, measured cost of a cold
  // production-bundle page load — parsing/executing the real bundle, the
  // injected wallet mock, React 19 hydration, and recharts' own
  // ResponsiveContainer measurement + first paint — all before this path
  // exists at all. CPU-throttled reproduction (Playwright CDP
  // `Emulation.setCPUThrottlingRate` against this exact build) measured
  // the real, successful time-to-path at ~8.5s completely unthrottled,
  // ~12s at 4x.
  await expect(flrPriceCard.locator("svg.recharts-surface path").first()).toBeVisible({
    timeout: 15_000,
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
});
