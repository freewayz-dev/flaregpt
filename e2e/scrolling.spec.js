import { test, expect } from "@playwright/test";

import { ROUTES } from "../src/config/routes";

// Regression coverage for the table-scroll-trapping bug: an element with
// CSS `overscroll-behavior: contain` on *both* axes is already "at its
// boundary" the instant a scroll gesture starts on an axis it has no
// scroll room on, so the gesture never chains to the page behind it.
// GovernanceHistoryTable is the user-reported example — a purely
// horizontal-scroll desktop table with no vertical scroll of its own,
// where hovering over it and scrolling the mouse wheel vertically used to
// swallow the page's own scroll entirely. This can only be caught by a
// real browser (jsdom implements neither real wheel events nor
// `overscroll-behavior` scroll chaining), which is why this lives here
// rather than in a Vitest/jsdom test.
test.describe("Governance History table does not trap page scroll", () => {
  test("hovering the table and scrolling the wheel still scrolls the page", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(ROUTES.governance);

    const table = page
      .locator("div.overscroll-x-contain")
      .filter({ has: page.locator("table") })
      .first();
    await expect(table).toBeVisible({ timeout: 15_000 });
    await table.scrollIntoViewIfNeeded();

    const scroller = page.locator("#main-content");
    const before = await scroller.evaluate((el) => el.scrollTop);

    const box = await table.boundingBox();
    if (!box) throw new Error("table has no bounding box");
    // Clamped so the hover point is guaranteed to land inside the actual
    // viewport regardless of where scrollIntoViewIfNeeded placed the
    // table — a coordinate below the viewport silently no-ops the wheel
    // event instead of failing loudly.
    await page.mouse.move(box.x + box.width / 2, Math.min(box.y + box.height / 2, 850));
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);

    const after = await scroller.evaluate((el) => el.scrollTop);
    expect(after).toBeGreaterThan(before);
  });

  test("horizontal scroll stays uncontained (the one axis this table is meant to scroll)", async ({
    page,
  }) => {
    // The real historical-proposals table never has enough columns to
    // actually overflow at any real viewport width today, so a physical
    // scrollLeft assertion here would be unfalsifiable (nothing to
    // scroll, at any width tried). Asserting the CSS directly instead —
    // `overscroll-x-contain` present, the blanket `overscroll-contain`
    // absent — still catches the real regression risk (someone reverting
    // to the both-axis class) without depending on the current row
    // count.
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto(ROUTES.governance);

    const table = page
      .locator("div.overscroll-x-contain")
      .filter({ has: page.locator("table") })
      .first();
    await expect(table).toBeVisible({ timeout: 15_000 });

    await expect(table).toHaveClass(/overscroll-x-contain/);
    const classes = (await table.getAttribute("class"))?.split(/\s+/) ?? [];
    expect(classes).not.toContain("overscroll-contain");
  });
});
