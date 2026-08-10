import { isAxiosError } from "axios";
import type { TFunction } from "i18next";

// The backend distinguishes a duplicate address from a duplicate nickname
// only through this endpoint's own free-text `detail` — both cases share
// the same 409 status, and the wording is the only thing that tells them
// apart (confirmed live against both add and edit): "This address is
// already on your watchlist." vs "Nickname '<name>' is already used for
// another watched wallet." Showing the address-duplicate message for an
// actual nickname collision (what a flat "409 -> duplicateAddress" mapping
// used to do) is exactly the bug this exists to fix. If the backend ever
// adds a distinct error code, that becomes the primary check and this
// text sniff becomes the fallback.
//
// Shared by every entry point that adds/edits a watchlist wallet against
// the real backend (Settings' own form, and the Overview add-wallet
// modal) — moved out of Wallets.tsx so both call the same implementation
// instead of two copies drifting apart.
export function interpretWatchlistError(error: unknown, t: TFunction): string {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  const detail = (isAxiosError(error) ? error.response?.data?.detail : "") || "";

  if (status === 409) {
    return /nickname/i.test(detail)
      ? t("settings.wallets.duplicateNickname")
      : t("settings.wallets.duplicateAddress");
  }
  if (status === 404) {
    return t("settings.wallets.notFoundError");
  }
  if (status === 422) {
    return t("settings.wallets.invalidAddress");
  }
  return t("settings.wallets.registrationFailed");
}
