# PWA Phase 0 — Security & Foundation Baseline

Reference doc for later PWA phases. This is where the two Phase 0 *decisions*
(not just the code changes) live, since Phase 2 and Phase 3 depend on them
directly.

## 1. Caching-sensitivity policy (for Phase 2)

Decided now, before any service worker or Workbox config exists, specifically
so Phase 2 has a policy to implement rather than inventing one under the
pressure of "I already wrote the caching code, what do I do about tokens."

FlareGPT is a wallet-connected financial dashboard, not a content site. The
policy is tiered by what the data actually is, not "cache everything the same
way":

| Data | Cache? | Strategy | Notes |
|---|---|---|---|
| Static build assets (JS/CSS/fonts/icons) | Yes | Cache-first | Vite's content-hashed filenames make this safe by construction — a new deploy is a new URL |
| Images | Yes | Cache-first + expiration | Low risk, low volatility |
| Live financial reads (prices, balances, portfolio value) | Yes, with conditions | Network-first, short timeout, fallback to cache **only** with a visible "as of [time]" indicator in the UI | Never serve a stale financial number as if it were live — this is a trust issue, not a UX nicety |
| Semi-static content (governance proposal text, protocol metadata) | Yes | Stale-while-revalidate | The one case where SWR is actually the right call |
| Auth endpoints, anything returning or carrying a bearer token | **Never** | N/A | No exceptions. `api.flaregpt.io` auth responses must never enter Cache Storage |
| Any other authenticated, personalized response | Cache only the minimum needed for the offline read-only views Phase 5 defines, nothing broader | — | Default to *not* caching unless a later phase gives a specific, named reason to |

## 2. Sign-out / cache-clearing hook (for Phase 3)

The app's real, single sign-out entry point is `logout()`, exported from
[`src/hooks/useAuthSync.ts`](../../src/hooks/useAuthSync.ts). It:

1. Calls `authService.logout()` (best-effort — clears local state even if this fails)
2. Calls `useAuthStore.getState().clearAuth()`

It's called from exactly one place today: the sign-out button in
`src/pages/Settings/tabs/Security.tsx`.

**This is where Phase 3's cache-clearing needs to attach** — specifically,
clearing any cached authenticated/personalized responses (per the policy
above) as part of this same function, not as a separate, easy-to-forget step
bolted on elsewhere. Confirmed via `grep -rn "logout()" src` that this really
is the only call site — no second, parallel sign-out path exists to also
account for.

## 3. Content-Security-Policy — origins and why each is there

Defined in `vercel.json`'s `headers`. Every third-party origin below was
confirmed by actually loading the app and driving its real connect-wallet
flow (including the third-party WalletConnect QR modal) with Playwright and
watching for live CSP violations — not guessed from documentation, because
two of them (`api.web3modal.org`, `fonts.reown.com`) don't appear in
`web3Config.ts` at all; they're internal to `@walletconnect/ethereum-
provider`'s own bundled modal.

- `connect-src`: `api.flaregpt.io` (+ `wss://` for chat), `api.coingecko.com`,
  `open.er-api.com`, Flare/Coston2 RPC endpoints — all confirmed directly in
  `apiClient.ts`/`chatSocket.ts`/`web3Config.ts`. Plus
  `*.walletconnect.com`/`.org` and `*.web3modal.org`/`*.reown.com` (wildcarded
  deliberately — WalletConnect's own infra spans several subdomains across
  relay/verify/registry/limits, and a narrower exact-match list is exactly
  the kind of thing that breaks wallet connect again the next time they add
  one)
- `font-src`: `fonts.gstatic.com` (the app's own Google Fonts) +
  `fonts.reown.com` (the WalletConnect QR modal's own custom typeface,
  loaded only once that modal actually opens — invisible until someone
  clicks "WalletConnect" specifically, which is exactly how this one was
  found)
- `frame-src`: scoped narrowly to `verify.walletconnect.com`/`.org` only —
  this is WalletConnect's "Verify API" iframe (confirms to a connecting
  wallet that this dApp's domain is known/legitimate), a real, security-
  relevant feature, not blanket-opened
- `script-src 'self'` with **no** `'unsafe-inline'` — the one inline
  `<script>` index.html used to have (dark-mode FOUC prevention) was
  extracted to `public/theme-init.js` specifically so this could stay strict
  rather than needing a CSP hash pinned against that script's exact
  whitespace (fragile — breaks silently on reformat) or `'unsafe-inline'`
  (defeats the point of a script-src policy at all)
- `style-src` keeps `'unsafe-inline'` — accepted trade-off, not an oversight.
  framer-motion writes inline `style` attributes directly to animated
  elements at runtime; those are dynamic and can't be hash-pinned the way a
  single static inline script can
- `worker-src 'self'` — added now, ahead of need, specifically so Phase 1's
  service worker registration doesn't have to also fight the CSP the moment
  it lands
- `frame-ancestors 'none'` + `X-Frame-Options: DENY` — clickjacking
  protection; genuinely important for a wallet app specifically (the classic
  attack is iframing the real dApp invisibly under fake UI to get a
  transaction approved)

Verified with zero violations across: landing page load, `/app` (dashboard
shell, disconnected), `/terms`, the app's own connect-wallet modal, and the
real third-party WalletConnect QR modal (including its live QR render and
wallet-search index loading — confirmed visually, not just "no console
error"). Also re-ran the full existing Playwright e2e suite (4/4 passing)
against these headers, including the guest-chat WebSocket test, which
exercises the `wss://api.flaregpt.io` entry specifically.

**Not independently verified**: a live, cross-device WalletConnect pairing
all the way through to a connected session (that needs a real mobile wallet
scanning a real QR code, not something drivable headlessly here). The QR
render, wallet list, and Verify iframe are confirmed; the relay handshake
itself past that point is not. Worth a real-device smoke test before or
shortly after this ships to production, same as any CSP change touching a
third-party widget this complex.

## 4. HTTPS / HSTS

No action needed — confirmed already active. `curl -I https://www.flaregpt.io/`
returns `strict-transport-security: max-age=63072000` today, applied by
Vercel automatically for every deployment on the platform, independent of
any project-level config. Deliberately not overriding this with a stronger
explicit header (e.g. adding `preload`) here — `preload` is a real, semi-
permanent commitment to browsers' HSTS preload lists that deserves its own
explicit decision, not a side effect of a Phase 0 audit.

## 5. Icons

Added the two genuinely missing pieces (the rest of the icon set — favicon,
apple-touch-icon, the existing 512 — was already correct from earlier work):

- `public/icon-192.png` — Chrome's own installability check wants an "any"
  purpose icon ≥192px; the manifest previously only had 32 and 512
- `public/icon-512-maskable.png` — safe-zone padded (glyph scaled to ~62%,
  centered) so Android's adaptive-icon masking doesn't clip it; verified by
  actually compositing it through a circular crop (the most aggressive
  common mask shape) and confirming no part of the glyph is cut off

Neither is wired into `site.webmanifest` yet — that's Phase 1 scope
(manifest configuration), not Phase 0 (asset creation). The files exist and
are correct; connecting them to the manifest's `icons` array happens next
phase.
