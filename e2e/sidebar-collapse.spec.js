import { test, expect } from "@playwright/test";

import { ROUTES } from "../src/config/routes";

// Regression coverage for a bug that has already shipped twice: the
// desktop sidebar's collapse toggle correctly hid the nav labels but the
// `<aside>` itself stayed at its full width, leaving empty space instead
// of actually shrinking to the icon rail. Root cause both times was the
// mobile drawer's `min-w-[*px]`/`max-w-[*px]` clamp (added unscoped, to
// keep `w-[70%]` sane across phone sizes) leaking into the `lg:` desktop
// tier, since `min-width`/`max-width` are different CSS properties from
// `width` and aren't overridden by the desktop `lg:w-[72px]`/
// `lg:w-[240px]` toggle. jsdom doesn't run a real layout engine — it
// can't compute cascade/specificity across a min-width clamp and a
// same-property override the way a real browser does — so a
// getBoundingClientRect()-based assertion in a Vitest test would pass
// unconditionally regardless of which CSS actually won. Only a real
// browser against the real production build can catch this, which is why
// it lives here rather than in Sidebar.test.jsx.
test.describe("Desktop sidebar collapse actually resizes the container", () => {
  test("collapsing shrinks the aside to the icon rail and reflows content; expanding restores it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(ROUTES.app);

    const aside = page.getByRole("complementary");
    const content = page.locator("#main-content");
    await expect(aside).toBeVisible();

    const expandedAside = await aside.boundingBox();
    const expandedContent = await content.boundingBox();
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    // 300ms CSS transition on `width` (see Sidebar.jsx's own
    // `transition-[width,transform] duration-300`) plus margin.
    await page.waitForTimeout(500);

    const collapsedAside = await aside.boundingBox();
    const collapsedContent = await content.boundingBox();

    // The actual regression: collapsed width staying pinned near the
    // mobile tier's 260-320px clamp instead of shrinking to the ~72px
    // icon rail. A loose "narrower than before" check alone wouldn't
    // discriminate a partial regression (e.g. clamped to 260px is still
    // "narrower" than a wider expanded state), so this asserts the
    // absolute icon-rail size, not just a relative decrease.
    expect(collapsedAside.width).toBeLessThan(100);
    expect(collapsedAside.width).toBeLessThan(expandedAside.width - 100);
    await expect(page.getByRole("link", { name: "Overview" })).toBeHidden();

    // Content is a flex sibling that should reclaim exactly the space the
    // aside gave up — not a separate hardcoded margin that could drift
    // out of sync with the aside's own width.
    expect(collapsedContent.x).toBeLessThan(expandedContent.x - 100);

    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await page.waitForTimeout(500);

    const reExpandedAside = await aside.boundingBox();
    expect(reExpandedAside.width).toBeGreaterThan(200);
    expect(Math.abs(reExpandedAside.width - expandedAside.width)).toBeLessThan(2);
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
  });

  test("mobile drawer sizing is unaffected by the desktop collapse fix", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ROUTES.app);

    // No collapse control at all below `lg` — it's `hidden lg:flex`.
    await expect(page.getByRole("button", { name: "Collapse sidebar" })).toBeHidden();

    await page.getByRole("button", { name: /menu/i }).first().click();
    await page.waitForTimeout(400);

    const aside = page.getByRole("complementary");
    const box = await aside.boundingBox();
    // Still clamped to the mobile tier's own 260-320px band (70% of a
    // 390px viewport = 273px) — proves the `lg:min-w-0`/`lg:max-w-none`
    // reset added for the desktop fix is itself scoped correctly and
    // doesn't also strip the mobile clamp it isn't meant to touch.
    expect(box.width).toBeGreaterThanOrEqual(260);
    expect(box.width).toBeLessThanOrEqual(320);
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
  });
});
