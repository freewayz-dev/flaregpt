// Extracted from an inline <script> in index.html specifically so it can be
// allowed by a real Content-Security-Policy via `script-src 'self'` alone —
// no `'unsafe-inline'`, no CSP hash pinned against this file's exact
// whitespace (which would silently break the moment anyone reformats it).
// Same-origin external script, loaded without `async`/`defer`, executes
// synchronously at this exact point in the document exactly like the
// inline version it replaces — this ordering is load-bearing (see
// web3Config.ts's own comment on relying on it having already run).
(function () {
  var root = document.documentElement;
  // Mirrors useUIStore's own onRehydrateStorage decision exactly
  // (same storage key, same hasThemeOverride/system-preference
  // fallback) — this used to read a separate, dead "theme" key that
  // nothing in the app actually wrote to anymore, so this script's
  // one job (apply the right theme before first paint) was being
  // done from stale data: on a dark-system visitor with no saved
  // override, it decided "light" here, then zustand's rehydration
  // moments later decided "dark" from the real data and flipped it —
  // a visible flash on every such load. Reading the real key here
  // means both decisions agree from the start.
  var isDark = false;
  try {
    var raw = localStorage.getItem("flaregpt_ui_preferences");
    var state = raw && JSON.parse(raw).state;
    isDark = state && state.hasThemeOverride
      ? !!state.darkMode
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  if (isDark) root.classList.add("dark");
  else root.classList.remove("dark");

  // Matches DashboardLayout.tsx's own root background classes exactly
  // (`bg-[#F0F4F9] dark:bg-[#101115]`) — a native app's status bar/task-
  // switcher chrome blends into whatever's actually on screen, it doesn't
  // stay a fixed brand color regardless of theme. Same values are set
  // again at runtime by useUIStore.ts's setAppearance (the in-app toggle)
  // and App.tsx's OS-preference-change listener; this is only what covers
  // the gap between this script running and either of those ever firing.
  var themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) themeColorMeta.setAttribute("content", isDark ? "#101115" : "#F0F4F9");

  root.classList.add("no-transition");

  // Removing this only needs the initial paint to have settled, not a
  // full `load` (which waits on every sub-resource — fonts included —
  // finishing). `load` can legitimately never fire: a slow/stalled
  // font request, or the tab being backgrounded/frozen mid-fetch
  // (exactly what happens if a phone gets locked or the browser is
  // switched away from right after opening this page), pauses or
  // cancels that fetch indefinitely. Since `.no-transition *` applies
  // `transition: none !important` to *every element in the document*
  // and `<html>` is never recreated by client-side navigation, a
  // `load` that never fires means every CSS transition in the app —
  // every drawer, modal, and hover state — silently stops animating
  // for the rest of that tab's life, on every page, until a hard
  // reload. `DOMContentLoaded` (or a flat timeout if that's already
  // passed) removes the dependency on external resources entirely,
  // and the outer timeout is an unconditional last-resort fallback so
  // this can never get stuck no matter what does or doesn't fire.
  function clearNoTransition() {
    root.classList.remove("no-transition");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(clearNoTransition, 50); });
  } else {
    setTimeout(clearNoTransition, 50);
  }
  setTimeout(clearNoTransition, 2000);

  // A backgrounded/frozen tab can also come back via the
  // back-forward cache instead of a real reload — the browser
  // restores the exact JS/DOM state it froze, including whatever
  // this class was at the moment it froze, and fires none of the
  // events above again (no DOMContentLoaded, no load). `pageshow`
  // is what *does* fire on a bfcache restore (`event.persisted`
  // is true for it specifically), so this is the one path capable
  // of reviving a stuck class that every other listener here
  // can't reach.
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) clearNoTransition();
  });
})();
