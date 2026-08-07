import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { WalletIcon, ClipboardIcon, CheckIcon, ShareIcon } from "@heroicons/react/24/outline";

import { shortenAddress } from "@/utils/address";
import { isWebShareSupported } from "@/utils/share";
import type { WalletHubEntry } from "@/store/useWalletHubStore";

interface WalletRowProps {
  wallet: WalletHubEntry;
  isActive: boolean;
  copiedAddress: string | null;
  onSelect: () => void;
  // Named for what it does on a share-capable device (the common case on
  // mobile, where this matters most) — the handler itself falls back to a
  // plain clipboard copy on every browser that doesn't support
  // `navigator.share` (see shareOrCopy in utils/share.ts), so nothing
  // about the *behavior* actually regresses on desktop, only the label.
  onShare: (e: MouseEvent<HTMLButtonElement>, address: string) => void;
  variant?: "desktop" | "mobile";
}

// One selectable wallet row — used by the Navbar's wallet dropdown and by
// FlareGPT's wallet context pill, so both surfaces present a wallet the
// same way. No per-row type badge: callers group rows under their own
// "Primary"/"Watchlist" section headers, which already establishes type —
// repeating it per row would just be noise (see Navbar's wallet dropdown
// for the fuller reasoning). `isActive` drives the highlight independent
// of the row's title.
//
// The Primary wallet shows a shortened address as its title rather than
// `wallet.label` (always the hardcoded "Primary Wallet" string today,
// since there's no nickname system for the connected wallet). Watchlist
// rows keep their nickname.
export default function WalletRow({
  wallet,
  isActive,
  copiedAddress,
  onSelect,
  onShare,
  variant = "desktop",
}: WalletRowProps) {
  const { t } = useTranslation();
  const justCopied = copiedAddress === wallet.address;
  const isMobile = variant === "mobile";
  const canShare = isWebShareSupported();
  const displayName =
    wallet.type === "connected" ? shortenAddress(wallet.address) : wallet.label;

  // A <div role="button"> rather than a real <button> — it contains its
  // own nested copy <button>, and a <button> can never legally contain
  // another <button> (nested interactive elements are invalid HTML and
  // browsers handle the resulting DOM inconsistently). Same reasoning as
  // the address block in Donate's HeroReceiveCard.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`w-full text-left flex items-center justify-between gap-2 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
        isMobile
          ? "p-2.5 rounded-xl border dark:border-none text-[11px]"
          : "p-2 rounded-lg text-[10px]"
      } ${
        isActive
          ? isMobile
            ? "bg-brand/10 border-brand/20 text-brand font-bold"
            : "bg-brand/10 text-brand font-bold"
          : isMobile
            ? "bg-slate-50/50 dark:bg-[#21242B] border-transparent text-slate-600 dark:text-[#6D7A86]"
            : "hover:bg-slate-50 dark:hover:bg-[#1B1B1F] text-ink-secondary"
      }`}
    >
      <div className={`min-w-0 flex items-center ${isMobile ? "gap-2.5" : "gap-2"}`}>
        <WalletIcon className={`opacity-60 shrink-0 ${isMobile ? "h-3.5 w-3.5" : "h-3 w-3"}`} />
        <div className="min-w-0 truncate">
          <p className="font-semibold truncate leading-tight">{displayName}</p>
          <p className="font-mono text-[9px] opacity-70 truncate mt-0.5">
            {wallet.address}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => onShare(e, wallet.address)}
        aria-label={canShare ? t("navbar.shareAddress") : t("navbar.copyAddress")}
        title={canShare ? t("navbar.shareAddress") : t("navbar.copyAddress")}
        className="shrink-0 p-2 -m-1 rounded-md text-current opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
      >
        {justCopied ? (
          <CheckIcon className="h-3 w-3 text-emerald-500" />
        ) : canShare ? (
          <ShareIcon className="h-3 w-3" />
        ) : (
          <ClipboardIcon className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}
