import { test, expect } from "@playwright/test";

import { ROUTES } from "../src/config/routes";
import { mockRestEndpoints } from "./mocks/network";

const WATCHLIST_ADDRESS = "0x444444444444444444444444444444444444444d";

// Overview's quick watchlist-onboarding path — no wallet connection, no
// signature, no injected provider at all (unlike wallet-flow.spec.ts's own
// MetaMask journey). Real production build, real static server, exercising
// the exact same store actions Settings > Wallets already uses.
test("Overview: add a watchlist wallet with no wallet connected — becomes active immediately", async ({
  page,
}) => {
  await mockRestEndpoints(page);
  await page.goto(ROUTES.app);

  await expect(page.getByText("No wallet selected").first()).toBeVisible();
  const addButton = page.getByRole("button", { name: "+ Add wallet to track" }).first();
  await expect(addButton).toBeVisible();
  await addButton.click();

  const dialog = page.getByRole("dialog", { name: "Add a wallet to track" });
  await expect(dialog).toBeVisible();

  await dialog.getByPlaceholder("0x... Flare Wallet Address").fill(WATCHLIST_ADDRESS);
  await dialog.getByPlaceholder("Account Name Label (e.g., Cold Storage)").fill("E2E Watchlist");
  await dialog.getByRole("button", { name: "Add wallet" }).click();

  // The modal closes on success, and — the actual point of this feature —
  // no separate step through the Navbar's wallet selector is needed for
  // the new wallet's data to appear.
  await expect(dialog).toBeHidden();
  await expect(page.getByText("No wallet selected")).toHaveCount(0);
  // The real proof the new wallet is now active: its balances render,
  // fetched against the address just added — no wallet was ever connected.
  await expect(page.getByText("FLR").first()).toBeVisible();

  // Still explicitly NOT a connected/authenticated wallet — the Navbar's
  // own "Connect Wallet" affordance must be completely unaffected by this.
  await expect(
    page.getByRole("complementary").getByRole("button", { name: "Connect Wallet" }),
  ).toBeVisible();
});

// Regression coverage for a real production bug: the modal's backdrop
// rendered visibly offset from the true viewport top whenever Overview had
// already been scrolled before opening it — confirmed live to be caused by
// AddWalletModal being mounted deep inside DashboardLayout's own scrollable
// `main`, which let the browser's native "scroll the newly-focused
// element's ancestors into view" behavior scroll `main` out from under a
// `position: fixed` overlay that was never meant to need that. Fixed by
// portaling the modal to `document.body` (see AddWalletModal.tsx's own
// comment) — this test reproduces the exact original repro steps (scroll
// first, then open) against the real production build, not just the
// fresh-page-load case the test above already covers.
test("Overview: add-wallet modal backdrop covers the full viewport even after scrolling", async ({
  page,
}) => {
  await mockRestEndpoints(page);
  await page.goto(ROUTES.app);
  await page.getByText("No wallet selected").first().waitFor();

  // Scroll the dashboard's real scroll container down before opening —
  // the exact condition that reproduced the bug.
  await page.evaluate(() => {
    document.getElementById("main-content")?.scrollTo(0, 300);
  });

  await page.getByRole("button", { name: "+ Add wallet to track" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add a wallet to track" });
  await expect(dialog).toBeVisible();

  // The backdrop is the dialog's previous sibling inside the portaled
  // wrapper (see AddWalletModal.tsx's own DOM structure) — asserting its
  // real bounding box reaches the true viewport top (y=0), not just that
  // it's "visible" (which toBeVisible() alone wouldn't catch — a backdrop
  // offset by exactly the same amount `main` was scrolled would still
  // report as "visible" while leaving a real, undimmed gap at the top of
  // the page).
  const backdropTop = await page.evaluate(() => {
    const dialogEl = document.querySelector('[role="dialog"][aria-labelledby="add-wallet-modal-title"]');
    const wrapper = dialogEl?.parentElement;
    return wrapper?.getBoundingClientRect().top;
  });
  expect(backdropTop).toBe(0);

  // Also confirms the fix didn't come at the cost of the wrapper's own
  // documented DOM location — a direct child of <body>, not still nested
  // inside `main`.
  const portalParentTag = await page.evaluate(() => {
    const dialogEl = document.querySelector('[role="dialog"][aria-labelledby="add-wallet-modal-title"]');
    return dialogEl?.parentElement?.parentElement?.tagName;
  });
  expect(portalParentTag).toBe("BODY");
});
