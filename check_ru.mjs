import { chromium } from "playwright";
const OUT = "/private/tmp/claude-501/-Users-macbookpro-Fred-Codebase-flr-gpt-dashboard-flr-gpt-dashboard/cbe3c03f-7f0b-41aa-9587-54df78bae36a/scratchpad";
const browser = await chromium.launch();

// Desktop full page
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 3200 } });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("language", "ru"));
  await page.goto("http://localhost:8086/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/ru_desktop_full.png`, fullPage: true });
  await context.close();
}

// Mobile 320
{
  const context = await browser.newContext({ viewport: { width: 320, height: 2600 } });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("language", "ru"));
  await page.goto("http://localhost:8086/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/ru_mobile_full.png`, fullPage: true });
  await context.close();
}

await browser.close();
console.log("done");
