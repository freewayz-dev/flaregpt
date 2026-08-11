// Browsers throttle their own native service-worker update check (checked
// on a fresh navigation to an SW-controlled page, but rate-limited by the
// browser itself to roughly once per day per registration) — and nothing
// in vite-plugin-pwa's own `registerSW` wrapper calls `registration.update()`
// on any kind of interval (confirmed by reading its installed client
// source: `wb.register({immediate})` sets up `onNeedRefresh` purely as a
// listener for workbox-window's own `waiting` event, with no polling of
// its own). Without an explicit poll, a user who reopens this tab/PWA
// several times within that native throttle window never triggers a fresh
// check at all — a real deployment can sit undetected for a long time,
// which is exactly why the update prompt stopped feeling reliable. This
// only adds *more frequent checks*; it doesn't touch anything about what
// happens once an update IS detected (onNeedRefresh -> promptForUpdate,
// sw.ts's own skipWaiting/clientsClaim handling) — all of that is
// untouched and already correct.
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes — frequent
// enough to notice a real deploy well within a single browsing session,
// while still being a negligible fraction of one extra conditional-GET
// request every half hour, nowhere near "hammering the server" (this is
// the exact same request, against the exact same `sw.js` URL, the
// browser's own native check already makes on its own schedule — this
// just makes it happen more often too).
export const MIN_MS_BETWEEN_UPDATE_CHECKS = 60 * 1000;

// Also checks the moment the user actually returns to this tab/installed
// app, on top of the interval above — catches a deploy that happened while
// they were away without waiting out the rest of the interval, which
// matters most for exactly the PWA-reopened-after-a-while pattern this
// whole update flow exists for. Debounced against the interval's own last
// check so a burst of focus/visibilitychange events (rapid app-switching)
// can't trigger more than one extra check per minute. Returns the raw
// `check` function and a `dispose()` for cleanup — split out from
// main.tsx as its own small module so it's directly unit-testable with
// fake timers, without needing to exercise the app's entire bootstrap.
export function registerUpdatePolling(registration: ServiceWorkerRegistration) {
  let lastCheck = Date.now();
  const check = () => {
    const now = Date.now();
    if (now - lastCheck < MIN_MS_BETWEEN_UPDATE_CHECKS) return;
    lastCheck = now;
    registration.update().catch(() => {
      // Offline, or a transient network blip — the next interval tick or
      // foreground event tries again; nothing here to surface to the user
      // for a background check that simply couldn't run this time.
    });
  };
  const intervalId = setInterval(check, UPDATE_CHECK_INTERVAL_MS);
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") check();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", check);

  return function dispose() {
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", check);
  };
}
