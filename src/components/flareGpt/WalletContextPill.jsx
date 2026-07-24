import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ChevronUpIcon,
  GlobeAltIcon,
  WalletIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

import { useFlareGptWalletContext } from "@/hooks/useFlareGptWalletContext";
import { useUIStore } from "@/store/useUIStore";
import { shortenAddress } from "@/utils/address";
import WalletBadge from "@/components/common/WalletBadge";
import WalletRow from "@/components/common/WalletRow";

// Sits directly above the composer rather than in a navbar-style control —
// deliberately styled as a small rounded-full chip (matching the network
// pill convention already used on the Donate page's HeroReceiveCard)
// rather than the Navbar's rectangular dropdown button, so it reads as
// "context for what I'm about to ask" rather than another dashboard
// widget. Reuses the exact same Primary/Watchlist row and badge
// components as the Navbar's wallet dropdown so switching surfaces never
// requires learning a new pattern — plus one addition specific to chat:
// an explicit "General" option, since not every question is wallet-
// specific.
export default function WalletContextPill({ onOpenWalletModal }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSettingsActiveTab = useUIStore((s) => s.setSettingsActiveTab);

  const { allWallets, effectiveAddress, effectiveWallet, setAiWalletAddress } =
    useFlareGptWalletContext();

  const [open, setOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const primaryWallet = allWallets.find((w) => w.type === "connected");
  const watchlistWallets = allWallets.filter((w) => w.type === "tracked");
  const isGeneral = effectiveAddress === null;

  const label = isGeneral
    ? t("flrgpt.wallet.general")
    : effectiveWallet
      ? effectiveWallet.type === "connected"
        ? shortenAddress(effectiveWallet.address)
        : effectiveWallet.label
      : t("flrgpt.wallet.general");

  const badge =
    !isGeneral && effectiveWallet
      ? effectiveWallet.type === "connected"
        ? { text: t("navbar.badgePrimary"), tone: "primary" }
        : { text: t("navbar.badgeWatchlist"), tone: "watchlist" }
      : null;

  const handleSelect = (address) => {
    setAiWalletAddress(address);
    setOpen(false);
  };

  const handleCopy = async (e, address) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success(t("navbar.addressCopied"));
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch {
      toast.error(t("navbar.copyFailed"));
    }
  };

  const handleConfigureWallets = () => {
    setSettingsActiveTab("Wallets");
    setOpen(false);
    navigate("/app/settings");
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11px] dark:border-none dark:bg-[#191A1F] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1F2027] transition-colors"
      >
        {isGeneral ? (
          <GlobeAltIcon className="h-3.5 w-3.5 text-ink-muted shrink-0" />
        ) : (
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
              effectiveWallet?.type === "connected" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
          />
        )}
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
            : "opacity-0 scale-95 translate-y-1 pointer-events-none"
        }`}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelect(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSelect(null);
            }
          }}
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
            isGeneral
              ? "bg-brand/10 text-brand font-bold"
              : "hover:bg-slate-50 dark:hover:bg-[#1B1B1F] text-ink-secondary"
          }`}
        >
          <GlobeAltIcon className="h-3.5 w-3.5 opacity-70" />
          <div>
            <p className="font-semibold leading-tight">{t("flrgpt.wallet.general")}</p>
            <p className="text-[9px] opacity-70">{t("flrgpt.wallet.generalHint")}</p>
          </div>
        </div>

        <p className="px-1.5 pt-1 pb-0.5 text-[8.5px] uppercase tracking-wider text-[#94A3B8] dark:text-[#6D7A86] font-bold border-t border-line">
          {t("navbar.primaryWalletSection")}
        </p>
        {primaryWallet ? (
          <WalletRow
            wallet={primaryWallet}
            isActive={effectiveAddress === primaryWallet.address}
            copiedAddress={copiedAddress}
            onSelect={() => handleSelect(primaryWallet.address)}
            onCopy={handleCopy}
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
              {t("navbar.watchlistSection", { current: watchlistWallets.length, max: 5 })}
            </p>
            <div className="max-h-32 overflow-y-auto space-y-0.5 scrollbar-none">
              {watchlistWallets.map((wallet) => (
                <WalletRow
                  key={wallet.address}
                  wallet={wallet}
                  isActive={effectiveAddress === wallet.address}
                  copiedAddress={copiedAddress}
                  onSelect={() => handleSelect(wallet.address)}
                  onCopy={handleCopy}
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
