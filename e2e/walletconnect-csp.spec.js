import { test, expect, devices } from "@playwright/test";

import { ROUTES } from "../src/config/routes";

// Regression guard for a real, previously-shipped-with-CSP-violation bug:
// on mobile, with no injected wallet detected, every wallet in this app's
// own Connect Wallet modal correctly falls through to WalletConnect/AppKit
// — but AppKit's own "All Wallets" grid loads each wallet's logo as a
// `blob:` URL, which vercel.json's CSP `img-src` didn't allow (only
// `'self' data: https://*.walletconnect.*` were listed). The result: every
// wallet in that grid showed a broken-image icon with only its name
// visible, reproduced here on a real mobile viewport against the real
// production build/CSP (confirmed live — this test failed with CSP
// console errors before `blob:` was added to img-src). No injected wallet
// mock here on purpose — this app only routes to WalletConnect when none
// is detected, exactly the real mobile condition this bug depended on.
test("mobile: opening WalletConnect's own wallet grid produces no CSP violations and its icons actually load", async ({
  browser,
}) => {
  // This test's own defining feature is hitting WalletConnect's real
  // explorer API for AppKit's wallet grid (see the top-of-file comment —
  // a mock would defeat the point). GitHub Actions' runner network path to
  // that third-party API has measurably higher latency than a local dev
  // machine (observed: still under 4 images at the previous 15s sub-
  // timeout, but the grid did finish loading by ~25s total) — this raises
  // both the sub-assertion's patience and this test's own Playwright
  // timeout (default 30s) to match, without weakening what's actually
  // asserted.
  test.setTimeout(60_000);

  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();

  const cspViolations = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && msg.text().includes("Content Security Policy")) {
      cspViolations.push(msg.text());
    }
  });

  await page.goto(ROUTES.app, { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("complementary").getByRole("button", { name: "Connect Wallet" }).click();

  // Bifrost has no desktop extension to fall back to, so it always routes
  // through WalletConnect regardless of platform (see ConnectWalletModal's
  // own VISUAL_WALLETS comment) — the most direct, deterministic way to
  // reach AppKit's modal without depending on mobile-detection timing.
  await page.getByRole("button", { name: "Bifrost Wallet" }).click();

  // AppKit renders inside its own web component's shadow DOM — invisible
  // to `document.querySelectorAll`, which never pierces shadow boundaries
  // (confirmed live: that approach kept reporting this app's own 4 icons
  // even with AppKit's real wallet grid fully visible on screen).
  // Playwright's own `page.locator()` does pierce open shadow roots for
  // plain CSS selectors, which is what actually finds AppKit's images here.
  const allImages = page.locator("img");
  await expect(async () => {
    expect(await allImages.count()).toBeGreaterThan(4); // this app's own 4 + AppKit's own grid
  }).toPass({ timeout: 30_000 });

  const imgStates = await allImages.evaluateAll((imgs) =>
    (imgs).map((img) => ({
      src: img.src,
      naturalWidth: img.naturalWidth,
      complete: img.complete,
    })),
  );

  // Every rendered <img> (this app's own 4 plus whatever AppKit added)
  // must have actually decoded real pixel data — a blocked blob: load
  // leaves naturalWidth at 0 forever with no thrown error, so this is the
  // one direct signal a broken-icon regression would fail on.
  for (const img of imgStates) {
    expect(img.complete, `image did not finish loading: ${img.src}`).toBe(true);
    expect(img.naturalWidth, `image loaded with zero size (broken): ${img.src}`).toBeGreaterThan(0);
  }

  expect(cspViolations, `CSP violations occurred: ${cspViolations.join("\n")}`).toEqual([]);

  await context.close();
});
