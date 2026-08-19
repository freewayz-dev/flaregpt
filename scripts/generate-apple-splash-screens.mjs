// Generates the iOS "Add to Home Screen" launch/splash images this app
// ships under public/splash/ and prints the matching
// <link rel="apple-touch-startup-image"> tags for index.html.
//
// iOS has no single catch-all splash image the way a favicon works — it
// matches one exact, pre-rendered PNG per (device-width, device-height,
// -webkit-device-pixel-ratio, orientation) media query, with no scaling
// fallback, so every screen size needs its own file. That list also isn't
// stable: it changes every year as Apple ships new panel sizes, which is
// exactly why this lives as a regenerable script (rerun it, don't hand-
// edit the PNGs or the device table below) rather than a one-off asset
// somebody edited manually and can no longer reproduce.
//
// DEVICES is deduplicated by distinct CSS-viewport size, not one entry per
// marketing name — several iPhone models within a generation share an
// identical physical panel (e.g. 16 Pro Max and 17 Pro Max both report
// 440x956), so one generated image legitimately covers every model in its
// `models` list. Every entry here ships Dynamic Island (14 Pro / 14 Pro Max
// onward for the Pro line; every model from the 15 generation onward) —
// confirmed against iosref.com/res, 2026-08.
//
// Run with: node scripts/generate-apple-splash-screens.mjs
import { chromium } from "playwright";
import fs from "fs/promises";
import path from "path";

const __dirname = import.meta.dirname;
const OUT_DIR = path.resolve(__dirname, "../public/splash");
const MARK_SVG_PATH = path.resolve(__dirname, "../src/assets/icons/flaregpt-mark.svg");

const DEVICES = [
  { id: "1320x2868", width: 440, height: 956, dpr: 3, models: "iPhone 16 Pro Max / 17 Pro Max" },
  { id: "1206x2622", width: 402, height: 874, dpr: 3, models: "iPhone 16 Pro / 17 Pro" },
  { id: "1290x2796", width: 430, height: 932, dpr: 3, models: "iPhone 14 Pro Max / 15 Pro Max / 15 Plus / 16 Plus" },
  { id: "1179x2556", width: 393, height: 852, dpr: 3, models: "iPhone 14 Pro / 15 Pro / 15 / 16" },
  { id: "1170x2532", width: 390, height: 844, dpr: 3, models: "iPhone 12 / 12 Pro / 13 / 13 Pro / 14 / 16e / 17" },
  // From here down: no Dynamic Island (notch, or on the 2x-DPR entry, no
  // notch at all) — included anyway since the splash media query only
  // matches on physical screen size/DPR/orientation, not on whether the
  // device has a notch or an island, and iPhones 11-13 are still common
  // enough in the wild to be worth covering explicitly.
  { id: "1125x2436", width: 375, height: 812, dpr: 3, models: "iPhone 12 mini / 13 mini / X / XS / 11 Pro" },
  { id: "1284x2778", width: 428, height: 926, dpr: 3, models: "iPhone 12 Pro Max / 13 Pro Max" },
  // 414x896 is shared by two genuinely different physical panels at two
  // different pixel densities — XS Max/11 Pro Max's OLED (@3x) and XR/11's
  // LCD (@2x) — so both need their own entry; -webkit-device-pixel-ratio
  // in the media query is what tells them apart, not device-width/height
  // alone. (This is also the size 12/13 Pro Max are *not* — 428x926 above
  // is a distinct, slightly larger panel, not a mislabel of this one.)
  { id: "1242x2688", width: 414, height: 896, dpr: 3, models: "iPhone XS Max / 11 Pro Max" },
  { id: "828x1792", width: 414, height: 896, dpr: 2, models: "iPhone XR / 11" },
];

// Matches DashboardLayout's own root background classes
// (`bg-[#F0F4F9] dark:bg-[#101115]`) — see src/store/useUIStore.js's
// applyThemeColorMeta, the single canonical source for this pair.
const THEMES = [
  { id: "dark", background: "#101115" },
  { id: "light", background: "#F0F4F9" },
];

function buildHtml(background, markSvg, logoSizePx) {
  return `<!doctype html>
<html><head><meta charset="utf-8" /><style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: ${background}; }
  body { display: flex; align-items: center; justify-content: center; }
  svg { width: ${logoSizePx}px; height: ${logoSizePx}px; display: block; }
</style></head><body>${markSvg}</body></html>`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const markSvg = await fs.readFile(MARK_SVG_PATH, "utf8");

  const browser = await chromium.launch();
  const linkTags = [];

  for (const device of DEVICES) {
    for (const orientation of ["portrait", "landscape"]) {
      const width = orientation === "portrait" ? device.width : device.height;
      const height = orientation === "portrait" ? device.height : device.width;
      const logoSizePx = Math.round(Math.min(width, height) * 0.28);

      for (const theme of THEMES) {
        const page = await browser.newPage({
          viewport: { width, height },
          deviceScaleFactor: device.dpr,
        });
        await page.setContent(buildHtml(theme.background, markSvg, logoSizePx));

        const fileName = `apple-splash-${device.id}-${orientation}-${theme.id}.png`;
        await page.screenshot({ path: path.join(OUT_DIR, fileName), type: "png" });
        await page.close();

        const orientationQuery = `and (orientation: ${orientation})`;
        linkTags.push(
          `<link rel="apple-touch-startup-image" href="/splash/${fileName}" media="(device-width: ${device.width}px) and (device-height: ${device.height}px) and (-webkit-device-pixel-ratio: ${device.dpr}) ${orientationQuery} and (prefers-color-scheme: ${theme.id})" />`,
        );
      }
    }
  }

  await browser.close();

  console.log(`Generated ${DEVICES.length * 2 * THEMES.length} splash images in ${OUT_DIR}\n`);
  console.log("Paste the following into index.html's <head> (apple-touch-startup-image block):\n");
  console.log(linkTags.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
