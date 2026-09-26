# PWA Phase 10 — Deep Linking & Sharing

Web Share API support where it genuinely helps, one real deep-linking gap
closed, and graceful fallback everywhere `navigator.share` isn't
available — which is most desktop browsers, so the fallback path matters
at least as much as the native one.

## What was already implemented

A full audit before writing anything found: 10 existing copy-to-clipboard
sites across the app, all following one identical, well-established
pattern (`navigator.clipboard.writeText` + a local `copied` state +
`toast.success`/`toast.error`) — the pattern this phase's new share
buttons extend rather than replace. `WalletActivity`'s transaction drawer
already had real, working URL-based deep-linking (`?tx=<actionId>`, via
`useSearchParams`) and an existing "View on FlareScan" explorer link.
`navigator.share` itself: zero existing usage anywhere. Governance: not
built (`ComingSoon` placeholder only) — nothing to add sharing to there.

## What was implemented, and why

**`src/utils/share.ts`** (new) — `isWebShareSupported()` and
`shareOrCopy({ title?, text?, url? })`, the one shared piece of logic
behind every share button added this phase. Native share always wins
when available (a real share sheet — Messages, WhatsApp, AirDrop — is
what actually improves on plain copy); every other browser falls back to
the exact clipboard behavior the existing copy buttons already had, so
nothing regresses on desktop. `AbortError` (the user closing the share
sheet without picking anything) is treated as `"cancelled"`, not a
failure — every browser reports a dismissed share sheet this way, and
showing an error toast for deliberately backing out would be wrong.
Matches this codebase's own established convention for this exact kind
of repeated-logic situation: shared logic, bespoke per-site UI (no new
generic `ShareButton` component — see "considered and declined" below).

**Fixed a real deep-linking gap: DeFi protocol selection now lives in the
URL.** Audited every route before deciding what to share, and found
`ProtocolExplorer.tsx`'s active protocol was pure component state — every
`/app/defi` link landed on MXRPY regardless of which protocol the sender
had open, making "share this protocol" impossible to build honestly.
Added `?protocol=` (mirroring `WalletActivity`'s own `?tx=` pattern
exactly — same `useSearchParams` + `replace: true` shape), with a share
button in both the desktop detail header and the mobile accordion. Each
protocol's `id` (`"mxrpy"`/`"sceptre"`/`"firelight"`/`"spectra"`) is a
fixed, stable string — genuinely safe to build a real link from, unlike
the case below.

**Wallet-address sharing** — the existing copy buttons in `Navbar.tsx`'s
wallet dropdown and `WalletContextPill.tsx` (both via the shared
`WalletRow.tsx` component) now call `shareOrCopy` instead of a raw
clipboard write. `WalletRow` itself decides which icon/label to show
(`ShareIcon`/"Share address" vs `ClipboardIcon`/"Copy address") based on
`isWebShareSupported()`, so the button's label always honestly describes
what tapping it will do — never "Copy" that actually opens a share sheet,
or vice versa. One component, two call sites, both upgraded at once.

**Donation address sharing** (`HeroReceiveCard.tsx`) — the clearest
"genuinely improves the experience" candidate in the whole app: a
donation address is *by definition* meant to be handed to someone else.
Both the dedicated "Copy/Share Address" button and the tap-to-copy
address block now use the same share-or-fallback behavior and label
logic as the wallet rows above.

**Transaction sharing** (`TransactionDrawer.tsx`) — shares the
**FlareScan explorer URL**, not this app's own `?tx=` deep link, and this
was a deliberate, verified decision, not an oversight: `?tx=`'s
`actionId` is computed as `` `${hash}_${asset}_${index}` `` (see
`deriveActivity.ts`'s own comment), where `index` depends on the
recipient's own fetch order/pagination/sort state — not portable to
someone else's session at all. The explorer URL, keyed by the raw
transaction hash, works for anyone regardless of whether they use this
app. Added as a second button next to the existing "View on Explorer"
link, not a replacement for either.

## Considered and declined

**A generic reusable `ShareButton` component.** The audit found this
codebase's own established convention for near-identical repeated logic
(the 10 existing copy buttons) is "shared logic function, bespoke button
per call site" — never a shared component, even though every one of
those 10 sites has nearly identical structure. Four real share call sites
across four visually distinct contexts (a dropdown row, a chat pill, a
donation hero card, a drawer footer) don't clear the bar for introducing
a *new* abstraction pattern this codebase has consistently avoided
elsewhere, per this phase's own "prefer extending existing infrastructure
... avoid new abstractions" instruction.

**Deep-linking the active wallet on `RflrVesting`/`FtsoRewards`.** Both
pages render entirely from `activeAddress` (Zustand store state, not the
URL) — a shared link opens to whichever wallet the *recipient* has
active, not the sender's. Fixing this would mean either accepting an
arbitrary wallet address as a URL param on a page that currently trusts
only the connected/watchlisted wallet set, or building real read-only
"view any address" support neither page has today — a materially larger
change than this phase's own scope, and not requested.

**Share Target API, Universal Links/App Links, referral systems** — all
explicitly excluded by this phase's own scope; not evaluated further.

## Files modified or added

- `src/utils/share.ts` (new, + test) — the shared share/fallback logic.
- `src/pages/DefiProtocols/components/ProtocolExplorer.tsx` (+ 3 new
  tests in its existing test file) — `?protocol=` deep link, share
  buttons (desktop + mobile).
- `src/components/common/WalletRow.tsx` (+ new test),
  `src/components/layout/Navbar.tsx`,
  `src/components/flareGpt/WalletContextPill.tsx` — wallet-address share/
  copy.
- `src/pages/Donate/components/HeroReceiveCard.tsx` — donation-address
  share/copy.
- `src/pages/WalletActivity/components/TransactionDrawer.tsx` —
  transaction (explorer link) sharing.
- `src/locales/*/common.json` (all 15) — new share/copy copy across
  `navbar`, `defiProtocols.explorer`, `donate.hero`,
  `wallet.activity.drawer`.

## Verified

- `npm run typecheck`, `npm run lint`, and the full Vitest suite (470
  tests, 28 files, including new/extended tests for `share.ts`,
  `WalletRow.tsx`, and `ProtocolExplorer`'s deep-link behavior) all pass.
  Clean `npm run build`, 4/4 Playwright e2e.
- **Driven in a real browser against the real production build**, not
  asserted from reading the code: a direct `/app/defi?protocol=sceptre`
  load rendered Sceptre's real detail content (confirmed via raw DOM
  text, after an initial overly-broad locator query hit Playwright's
  strict-mode ambiguity from the protocol name appearing twice on screen
  — list row and detail header — and silently reported `false`; the raw
  inspection is what actually settled it). Clicking Share with no
  `navigator.share` available (confirmed true for headless Chromium,
  matching most real desktop browsers) correctly wrote the right
  `?protocol=mxrpy` URL to the real OS clipboard. A separate session with
  a mocked `navigator.share` confirmed it's called with the exact
  `{ title, url }` for whichever protocol (`firelight`) was actually
  active — proving the share payload is genuinely derived from the live
  selection, not hardcoded.

## Not independently verified

An actual native share sheet's on-device appearance (Messages/WhatsApp/
AirDrop picker) — headless Chromium doesn't implement the share-sheet UI
at all, only the `navigator.share()` API surface; confirmed the correct
data reaches that API call, not what a real OS-level picker renders (same
category of hardware-boundary gap noted in Phases 4/5/6).

**Phase 10 is complete and production-ready.**
