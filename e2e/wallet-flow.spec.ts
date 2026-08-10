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
  await expect(page.locator("svg.recharts-surface path").first()).toBeVisible();

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
