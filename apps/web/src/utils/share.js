// Feature-detection follows the same plain `export function is<Thing>():
// boolean` shape as platform.ts's isIOSDevice/isStandaloneDisplayMode —
// kept in its own file rather than added there since platform.ts is about
// device/display characteristics, not general browser API support, and
// this pairs directly with shareOrCopy below rather than standing alone.
export function isWebShareSupported() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

// `url` and `text` are each optional individually (the Web Share API
// itself allows either/both), but at least one of them has to be present
// — there'd be nothing to share or to fall back to copying otherwise.
// Genuinely two different shapes in practice: a real link (a transaction/
// protocol/app deep link) sets `url`; a plain value that isn't a URL at
// all (a wallet address) sets `text` instead, so it isn't misrepresented
// to the native share sheet — or the OS's own link-detection — as one.




// The one shared piece of logic behind every Share button in this app —
// every call site still renders its own bespoke button (matching this
// codebase's existing convention for the *nearly identical* copy-to-
// clipboard buttons already spread across Navbar/WalletContextPill/
// TransactionDrawer/Donate/etc.: shared logic, bespoke per-site UI, not a
// shared component none of those sites actually adopted either).
//
// Native share (mobile-first: Chrome/Safari on iOS and Android, plus
// Windows/macOS Chrome/Edge in some configurations) always wins when
// available — it's what actually improves on plain copy (a real share
// sheet: Messages, WhatsApp, AirDrop, ...). Desktop Firefox/Safari-macOS/
// most desktop Chrome installs don't implement it at all, so this falls
// back to the exact clipboard behavior every existing copy button already
// uses, rather than a new, different fallback experience.
export async function shareOrCopy(data) {
  if (isWebShareSupported()) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      // The user closing the native share sheet without picking anything
      // is not a failure — every browser reports it as an AbortError, and
      // treating it as one would show a spurious error toast for
      // deliberately backing out of a share, not actually failing one.
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
      // Any other rejection (a permissions issue, a transient OS-level
      // share-sheet failure, ...) falls through to the same clipboard
      // fallback unsupported browsers get, rather than surfacing a dead
      // end.
    }
  }

  try {
    // Prefer the link when both are present (sharing a page is more
    // useful to hand someone than its description) — but either alone is
    // enough to fall back on.
    await navigator.clipboard.writeText(data.url ?? data.text ?? "");
    return "copied";
  } catch {
    return "failed";
  }
}
