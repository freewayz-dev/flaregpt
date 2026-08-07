// Chromium browsers (Chrome, Edge, Samsung Internet, ...) fire
// `beforeinstallprompt` and expose a real programmatic install flow — see
// usePwaInstallListeners.ts. Safari (iOS and iPadOS) never fires that
// event and has no equivalent API at all; "Add to Home Screen" only
// exists as a manual step inside the Share sheet. Detecting iOS here is
// what lets the install UI show real instructions there instead of a
// button that would silently do nothing.
export function isIOSDevice(): boolean {
  const ua = window.navigator.userAgent;
  // iPadOS 13+ deliberately reports a desktop-Safari-style UA (no
  // "iPad" substring) to get desktop-class sites by default — the
  // standard workaround is detecting its touch-capable "MacIntel"
  // platform instead, which a real Mac never reports alongside
  // multi-touch support.
  const isIPhoneOrIPod = /iPhone|iPod/.test(ua);
  const isClassicIPad = /iPad/.test(ua);
  const isModernIPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIPhoneOrIPod || isClassicIPad || isModernIPad;
}

// True once the app is actually running as an installed app, not a browser
// tab — checked both ways since no single signal covers every platform:
// `display-mode: standalone` is what Chromium/desktop PWAs report (and
// `window-controls-overlay` is the same "installed" state with an extra
// title-bar feature layered on, not a different state), while iOS Safari
// never implemented that media feature at all and instead sets
// `navigator.standalone` directly.
export function isStandaloneDisplayMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    window.navigator.standalone === true
  );
}
