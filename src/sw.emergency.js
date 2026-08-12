/// <reference lib="webworker" />
export {};


// EMERGENCY KILL-SWITCH — not part of the normal build. See
// docs/pwa/emergency-kill-switch.md for when and how to deploy this file.
// It exists for exactly one scenario: the real service worker (src/sw.ts)
// is stuck serving broken/wrong cached content to real users, and the
// normal update path (a polite "waiting" worker + an explicit user click
// — see UpdateAvailableToast.tsx) isn't fast enough or isn't reaching
// them because the thing that's broken *is* the update path itself.
//
// Deliberately the opposite of src/sw.ts's own philosophy in every way
// that file is careful: skips waiting immediately, claims every open
// client, deletes every cache this app could have created, and forces
// every open tab to reload. No staleness checks, no "is the chat
// mid-stream" guard — this is the "something is actively wrong right
// now" path, not the normal one, and getting every client back to a
// known-clean state takes priority over not interrupting whatever they
// were doing.
//
// Deliberately does NOT call `self.registration.unregister()` — confirmed
// empirically (not just reasoned about) that doing so causes an infinite
// reload loop: main.tsx's own registerSW() call runs again on every page
// load unconditionally, and the browser only skips reinstalling a service
// worker when an existing, byte-identical registration is already present
// at that scope. Unregistering destroys that fast path, so every forced
// reload below was re-triggering a brand-new install of this exact same
// script, which immediately repeated the whole cycle — observed directly
// via Playwright as dozens of reloads in a few seconds. Leaving the
// registration in place means the second load's registerSW() call finds
// an identical, already-active worker and does nothing further: caches
// are still fully cleared and every client still gets forced to a clean
// reload exactly once, it just settles instead of looping. This worker
// has no fetch handler, so staying registered has no ongoing effect on
// what clients see — reverting to the real src/sw.ts (a different
// filename, so a normal install/replace, not blocked by this still being
// registered) is how you actually come out of the incident.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      await self.clients.claim();

      const openClients = await self.clients.matchAll({ type: "window" });
      openClients.forEach((client) => {
        if ("navigate" in client) client.navigate(client.url);
      });
    })(),
  );
});
