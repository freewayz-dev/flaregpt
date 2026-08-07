import { isAddress } from "viem";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import { ChevronUpIcon, WalletIcon, Cog6ToothIcon, LockClosedIcon } from "@heroicons/react/24/outline";

import { useFlareGptWalletContext } from "@/hooks/useFlareGptWalletContext";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useUIStore } from "@/store/useUIStore";
import { shortenAddress } from "@/utils/address";
import { shareOrCopy } from "@/utils/share";
import { ROUTES } from "@/config/routes";
import WalletBadge, { type WalletBadgeTone } from "@/components/common/WalletBadge";
import WalletRow from "@/components/common/WalletRow";

interface WalletContextPillProps {
  onOpenWalletModal: () => void;
}

// Sits directly above the composer rather than in a navbar-style control —
// deliberately styled as a small rounded-full chip (matching the network
// pill convention already used on the Donate page's HeroReceiveCard)
// rather than the Navbar's rectangular dropdown button, so it reads as
// "context for what I'm about to ask" rather than another dashboard
// widget. Reuses the exact same Primary/Watchlist row and badge
// components as the Navbar's wallet dropdown so switching surfaces never
// requires learning a new pattern. Every question is answered in the
// context of some wallet — Primary (whichever wallet is actually
// connected) or a Specific watchlist wallet — there's no "General/no
// wallet" mode, since the backend always has some wallet in mind anyway.
export default function WalletContextPill({ onOpenWalletModal }: WalletContextPillProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSettingsActiveTab = useUIStore((s) => s.setSettingsActiveTab);
  const { hasSession, isConnected, isAuthenticating, signIn } = useAuthStatus();

  const { allWallets, effectiveWallet, walletMode, walletAddress, setFlareGptWalletContext, maxSlots } =
    useFlareGptWalletContext();

  const [open, setOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: globalThis.MouseEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Matches every other dismissible overlay in this app — a keyboard user
  // shouldn't need to Tab all the way through the panel to get out of it.
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  const primaryWallet = allWallets.find((w) => w.type === "connected");
  const watchlistWallets = allWallets.filter((w) => w.type === "tracked");

  // This pill only ever renders for a signed-in user (see Composer.jsx),
  // but being signed in doesn't guarantee a wallet is currently active —
  // the wallet can be disconnected while still authenticated, and there
  // may be no watchlist wallets either. That's the same "nothing to show
  // yet" state as everywhere else in the app, so it reuses the same
  // "Connect Wallet" copy rather than inventing a separate label for it.
  const label = effectiveWallet
    ? effectiveWallet.type === "connected"
      ? shortenAddress(effectiveWallet.address)
      : effectiveWallet.label
    : t("navbar.connectWallet");

  const badge: { text: string; tone: WalletBadgeTone } | null = effectiveWallet
    ? effectiveWallet.type === "connected"
      ? { text: t("navbar.badgePrimary"), tone: "primary" }
      : { text: t("navbar.badgeWatchlist"), tone: "watchlist" }
    : null;

  const handleSelectPrimary = () => {
    setFlareGptWalletContext("primary");
    setOpen(false);
  };

  // `address` is a plain `string` here (see useWalletHubStore.ts — a
  // guest's tracked-wallet address comes from free-typed input, never
  // checksummed), while the store expects viem's branded `Address`. Same
  // `isAddress()` real-runtime-check pattern as useFlareGptConversation.ts,
  // not an assertion — a malformed address is silently dropped rather than
  // asserted through, matching the "specific wallet couldn't be applied"
  // outcome a missing/invalid address already produced before this call.
  const handleSelectSpecific = (address: string) => {
    if (!isAddress(address)) return;
    setFlareGptWalletContext("specific", address);
    setOpen(false);
  };

  const handleShare = async (e: MouseEvent<HTMLButtonElement>, address: string) => {
    e.stopPropagation();
    const result = await shareOrCopy({ title: t("navbar.shareAddressTitle"), text: address });
    if (result === "copied") {
      setCopiedAddress(address);
      toast.success(t("navbar.addressCopied"));
      setTimeout(() => setCopiedAddress(null), 2000);
    } else if (result === "failed") {
      toast.error(t("navbar.copyFailed"));
    }
  };

  const handleConfigureWallets = () => {
    setSettingsActiveTab("Wallets");
    setOpen(false);
    navigate(ROUTES.settings);
  };

  // Connecting alone never gets here — useAuthSync auto-prompts a
  // signature the moment a wallet connects, so "connected but not
  // signed in" is real but normally brief (mid-signature-prompt, or a
  // rejected signature the visitor hasn't retried yet). Either way the
  // selector stays locked until `hasSession` is actually true: a
  // connection proves nothing on its own, only a verified signature does.
  const handleGuestCta = () => {
    if (!isConnected) {
      setOpen(false);
      onOpenWalletModal();
      return;
    }
    signIn();
  };

  // Kept visible rather than hidden entirely (see Composer.jsx) so the
  // capability is discoverable — a guest sees exactly what signing in
  // unlocks instead of it silently not existing. The wording here is
  // deliberately softer than "requires" — asking about a wallet by pasting
  // its address into the message still works without any of this (the
  // backend just parses it out of free text either way), but that's not
  // something to advertise as an alternative to signing in.
  if (!hasSession) {
    return (
      <div className="relative inline-block" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-haspopup="true"
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-[11px] dark:border-[#2A2B31] dark:bg-[#191A1F]/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1F2027] transition-colors"
        >
          <LockClosedIcon className="h-3 w-3 text-ink-muted shrink-0" />
          <span className="text-ink-muted">{t("flrgpt.wallet.guestLabel")}</span>
          <ChevronUpIcon
            className={`h-3 w-3 text-ink-muted transition-transform duration-200 ${open ? "" : "rotate-180"}`}
          />
        </button>

        <div
          className={`absolute bottom-full left-0 mb-2 w-72 origin-bottom-left rounded-xl bg-[#FFFFFF] border border-[#E5E7EB] p-4 shadow-xl dark:bg-[#21242B] dark:border-none z-50 transition-all duration-200 ${
            open
              ? "opacity-100 scale-100 translate-y-0"
              : "invisible opacity-0 scale-95 translate-y-1 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <LockClosedIcon className="h-3.5 w-3.5" />
            </div>
            <p className="text-[12.5px] font-semibold text-ink-primary">
              {t("flrgpt.wallet.locked.title")}
            </p>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-secondary">
            {t("flrgpt.wallet.locked.body")}
          </p>
          <button
            type="button"
            onClick={handleGuestCta}
            disabled={isAuthenticating}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-70 text-white text-[10.5px] font-semibold transition-colors cursor-pointer"
          >
            <WalletIcon className="h-3.5 w-3.5" />
            {isAuthenticating
              ? t("flrgpt.wallet.locked.signingIn")
              : isConnected
                ? t("flrgpt.wallet.locked.signInCta")
                : t("flrgpt.wallet.locked.connectCta")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11px] dark:border-none dark:bg-[#191A1F] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1F2027] transition-colors"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            !effectiveWallet
              ? "bg-slate-400 dark:bg-zinc-600"
              : effectiveWallet.type === "connected"
                ? "bg-emerald-500 animate-pulse"
                : "bg-amber-500"
          }`}
        />
        <span className="text-ink-muted">{t("flrgpt.wallet.analyzing")}</span>
        <span className="font-semibold text-ink-primary max-w-[120px] truncate">{label}</span>
        {badge && <WalletBadge tone={badge.tone} text={badge.text} />}
        <ChevronUpIcon
          className={`h-3 w-3 text-ink-muted transition-transform duration-200 ${open ? "" : "rotate-180"}`}
        />
      </button>

      <div
        className={`absolute bottom-full left-0 mb-2 w-72 origin-bottom-left rounded-xl bg-[#FFFFFF] border border-[#E5E7EB] p-2 shadow-xl dark:bg-[#21242B] dark:border-none z-50 space-y-1 transition-all duration-200 ${
          open
            ? "opacity-100 scale-100 translate-y-0"
            : "invisible opacity-0 scale-95 translate-y-1 pointer-events-none"
        }`}
      >
        <p className="px-1.5 pb-0.5 text-[8.5px] uppercase tracking-wider text-[#94A3B8] dark:text-[#6D7A86] font-bold">
          {t("navbar.primaryWalletSection")}
        </p>
        {primaryWallet ? (
          <WalletRow
            wallet={primaryWallet}
            isActive={walletMode === "primary"}
            copiedAddress={copiedAddress}
            onSelect={handleSelectPrimary}
            onShare={handleShare}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenWalletModal();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-[10.5px] font-semibold transition-colors cursor-pointer"
          >
            <WalletIcon className="h-3.5 w-3.5" />
            {t("navbar.connectWallet")}
          </button>
        )}

        {watchlistWallets.length > 0 && (
          <div className="border-t border-line pt-1 mt-1">
            <p className="px-1.5 pb-1 text-[8.5px] uppercase tracking-wider text-[#94A3B8] dark:text-[#6D7A86] font-bold">
              {t("navbar.watchlistSection", {
                current: watchlistWallets.length,
                max: Number.isFinite(maxSlots) ? maxSlots : "∞",
              })}
            </p>
            <div className="max-h-32 overflow-y-auto space-y-0.5 scrollbar-none">
              {watchlistWallets.map((wallet) => (
                <WalletRow
                  key={wallet.address}
                  wallet={wallet}
                  isActive={walletMode === "specific" && walletAddress === wallet.address}
                  copiedAddress={copiedAddress}
                  onSelect={() => handleSelectSpecific(wallet.address)}
                  onShare={handleShare}
                />
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleConfigureWallets}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[10px] text-ink-secondary hover:bg-slate-50 hover:text-ink-primary dark:hover:bg-[#1B1B1F] dark:hover:text-white transition-colors cursor-pointer border-t border-line mt-1 pt-2"
        >
          <Cog6ToothIcon className="h-3.5 w-3.5 opacity-70" />
          {t("navbar.configureWatchlistWallets")}
        </button>
      </div>
    </div>
  );
}
