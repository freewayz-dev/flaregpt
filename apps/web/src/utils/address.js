export function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// The exact shape check Settings' own watchlist form has always used
// (Wallets.tsx's handleSave/commitEdit) — a plain "0x" prefix + 42-char
// length check, not a real EIP-55 checksum (see useWalletHubStore.ts's own
// comment on why a guest's tracked-wallet entries are typed as plain
// `string`, not viem's branded `Address`, for exactly this reason).
// Extracted here so the Overview add-wallet flow validates identically
// instead of re-deriving its own copy of the same rule.
export function isValidTrackedWalletAddress(address) {
  return address.startsWith("0x") && address.length === 42;
}

// The one clipboard write every "copy this address" affordance in the app
// goes through — WalletAddressBadge, AddressPill, Navbar's wallet
// dropdown, WalletContextPill, WalletRow, Donate's HeroReceiveCard and
// SuggestedAmounts. Deliberately takes *only* `address`: no nickname, no
// shortened display string, no chain/currency label, no surrounding UI
// text can reach `navigator.clipboard.writeText` through this function,
// because it never accepts anything else to write in the first place —
// that's what actually guarantees "Copy always copies exactly the
// address" rather than just being a convention every call site has to
// remember to follow correctly on its own.
//
// Deliberately NOT routed through shareOrCopy (utils/share.ts) even
// though that already has its own clipboard fallback: shareOrCopy's
// whole point is handing off to `navigator.share()` when the platform
// supports it (real, correct behavior for sharing a *link* — see its own
// callers in TransactionDrawer/ProtocolExplorer), and once that native
// share sheet opens, this app has no control over what a "Copy" affordance
// *inside* that OS-level UI actually places on the clipboard — some
// targets are documented to fold a share payload's title in alongside its
// text. A wallet address has exactly one correct clipboard value on every
// platform; the only way to guarantee that on iOS Safari, Android Chrome,
// an installed PWA, or any desktop browser alike is to never hand the
// address to anything that isn't this direct API call.
export async function copyWalletAddress(address) {
  try {
    await navigator.clipboard.writeText(address);
    return true;
  } catch {
    return false;
  }
}
