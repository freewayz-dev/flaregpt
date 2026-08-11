// Extracted from an inline <script> in index.html specifically so it can be
// allowed by a real Content-Security-Policy via `script-src 'self'` alone —
// no `'unsafe-inline'`, no CSP hash pinned against this file's exact
// whitespace (which would silently break the moment anyone reformats it).
// Same-origin external script, same pattern theme-init.js already
// established for this exact problem. Loaded without `async`/`defer`, right
// where the inline version sat — the actual gtag.js library (loaded via its
// own <script async src="https://www.googletagmanager.com/gtag/js?...">
// tag, immediately before this one in index.html) reads from `dataLayer`
// once it finishes loading; `gtag()` here only ever pushes onto that queue,
// so it works regardless of which of the two scripts finishes loading
// first — this doesn't need to run before or after that one, only ever.
window.dataLayer = window.dataLayer || [];
// `window.dataLayer.push` rather than Google's own copy-paste snippet's bare
// `dataLayer.push` — functionally identical (`dataLayer` at script scope
// *is* `window.dataLayer`, since this file runs as a plain, non-module
// script), but the bare form reads as an undeclared identifier to static
// analysis (ESLint's `no-undef`), which doesn't apply to an inline
// <script> in index.html the same way it does to a real, linted .js file.
function gtag() {
  window.dataLayer.push(arguments);
}
gtag("js", new Date());

gtag("config", "G-Y88004SPTG");
