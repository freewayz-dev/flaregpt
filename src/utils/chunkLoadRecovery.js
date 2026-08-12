// Recovery for the "stale SPA bundle across a deployment" failure: a tab
// that's been open since before a new deploy still holds JS that references
// the *previous* build's chunk filenames. Navigating (client-side) to a
// lazy-loaded route/component not yet fetched in this session triggers a
// dynamic import() for that old filename, which the new deployment has
// genuinely deleted (Vite doesn't keep prior build artifacts) — a clean
// 404 that throws as "Failed to fetch dynamically imported module" /
// "error loading dynamically imported module" (Chromium/Firefox wording)
// or "Importing a module script failed" (Safari's wording). This is a
// general SPA/rolling-deployment characteristic, not specific to any one
// lazy import — the MetaMask SDK chunk (@metamask/connect-evm) is subject
// to the exact same risk as any other route chunk, nothing about it is
// special here.
//
// ErrorFallback.tsx's "Try again" button (resetErrorBoundary) only remounts
// the *same already-loaded* bundle — the missing chunk reference is still
// missing, so it fails again identically. Only a real navigation
// (window.location.reload()) fetches a fresh index.html/app-shell.html
// referencing the *current* deployment's chunk hashes, which is why
// "Reload page" was the only button that ever actually recovered from this.

const CHUNK_LOAD_ERROR_PATTERN =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk .* failed/i;

export function isChunkLoadError(error) {
  if (!(error instanceof Error)) return false;
  return CHUNK_LOAD_ERROR_PATTERN.test(error.message);
}

// Session-scoped (not persisted): a fresh tab/PWA launch always gets a
// clean slate, so a *new* deployment later in the same day isn't
// permanently locked out by an earlier reload attempt. Guards against an
// infinite reload loop for the case a plain reload *doesn't* actually fix
// — e.g. the service worker itself is also serving a stale app-shell (see
// registerUpdatePolling in main.tsx, the fix for that specific gap) — by
// only ever attempting one automatic reload per tab lifetime; a second
// chunk-load error in the same session falls through to the ordinary
// error boundary UI (including its own manual "Reload page" button)
// instead of reloading again on its own.
const RELOAD_ATTEMPTED_KEY = "flaregpt_chunk_reload_attempted";

// Returns true if it handled the error (a reload is in flight, or was
// already attempted once this session) — the caller's own error boundary
// UI should still render normally either way (this never throws), but a
// `true` return means recovery is underway and no further action is
// needed. Wrapped in a try/catch around sessionStorage access — Safari
// Private Browsing can throw on sessionStorage.setItem under some
// conditions, and a storage failure here must never be the reason recovery
// itself breaks.
export function recoverFromChunkLoadError(error) {
  if (!isChunkLoadError(error)) return false;
  try {
    if (sessionStorage.getItem(RELOAD_ATTEMPTED_KEY)) return false;
    sessionStorage.setItem(RELOAD_ATTEMPTED_KEY, "1");
  } catch {
    // If we can't remember that we already tried, err on the side of not
    // reloading at all rather than risking an unguarded loop.
    return false;
  }
  window.location.reload();
  return true;
}
