// src/components/layout/Navbar.jsx
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { toast } from "react-toastify";
import {
  ChevronDownIcon,
  WalletIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ClipboardIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useUIStore } from "@/store/useUIStore";
import { useDisconnectAllWallets } from "@/hooks/useDisconnectAllWallets";

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Navbar({
  flareWidgetOpen,
  setFlareWidgetOpen,
  setSidebarOpen,
  onOpenWalletModal,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isSidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSettingsActiveTab = useUIStore((state) => state.setSettingsActiveTab);

  // Controls
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Address currently showing a "Copied" confirmation on its row's copy
  // icon — a single string rather than per-row booleans, since only one
  // row can ever be mid-confirmation at a time.
  const [copiedAddress, setCopiedAddress] = useState(null);

  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const { address: connectedAddress, isConnected } = useConnection();
  const disconnectAll = useDisconnectAllWallets();

  const { activeAddress, allWallets, switchActiveAddress, maxSlots } =
    useDerivedWalletHub(connectedAddress, isConnected);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setWalletMenuOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        if (!event.target.closest(".mobile-trigger-btn")) {
          setMobileMenuOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getNavbarTitle = () => {
    const path = location.pathname.toLowerCase().replace(/\/$/, "");

    if (path === "" || path === "/app") return t("sidebar.overview");
    if (path.includes("flrgpt")) return t("sidebar.FlareGPT");
    if (path.includes("wallet")) return t("sidebar.walletActivity");
    if (path.includes("rewards")) return t("sidebar.ftsoRewards");
    if (path.includes("yield")) return t("sidebar.yield");
    if (path.includes("rflr")) return t("sidebar.rflrTracker");
    if (path.includes("governance")) return t("sidebar.governance");
    if (path.includes("fxrp")) return t("sidebar.fxrpPool");
    if (path.includes("settings")) return t("sidebar.settings");
    if (path.includes("help")) return t("sidebar.helpCenter");

    return t("sidebar.FlareGPT");
  };

  const handleConfigureWalletsRedirect = () => {
    setSettingsActiveTab("Wallets");
    setWalletMenuOpen(false);
    setMobileMenuOpen(false);
    navigate("/app/settings");
  };

  const handleOpenWalletModal = () => {
    setWalletMenuOpen(false);
    setMobileMenuOpen(false);
    onOpenWalletModal();
  };

  const handleDisconnect = () => {
    setWalletMenuOpen(false);
    setMobileMenuOpen(false);
    disconnectAll();
  };

  const handleSwitchActive = (address) => {
    switchActiveAddress(address);
    setWalletMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const handleCopyAddress = async (event, address) => {
    // Rows are clickable (switches the active wallet), so the copy icon
    // inside a row must stop that click from also firing — copying an
    // address shouldn't as a side effect also switch what's active.
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success(t("navbar.addressCopied", "Address copied to clipboard"));
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch {
      toast.error(t("navbar.copyFailed", "Couldn't copy address"));
    }
  };

  // Primary (the connected wallet, if any) and watchlist wallets are
  // rendered as two distinct sections rather than one flat list, so the
  // dropdown's shape stays identical whether or not a wallet is connected
  // — only the Primary slot's content changes.
  const primaryWallet = allWallets.find((w) => w.type === "connected");
  const watchlistWallets = allWallets.filter((w) => w.type === "tracked");
  const activeWalletObject = allWallets.find(
    (w) => w.address === activeAddress,
  );

  // The button always reflects whatever is actually driving the
  // dashboard right now (the active wallet), not just whether a Primary
  // wallet happens to be connected — a watchlist wallet can be active with
  // no Primary connected at all, and the button should say so rather than
  // falling back to a generic "Connect Wallet" that would misrepresent the
  // dashboard as showing nothing.
  //
  // The Primary wallet has no nickname system (deferred — see the Donate
  // page's precedent of using placeholders rather than half-built
  // features), so showing a literal "Primary Wallet" label next to a
  // "Primary" badge said the same thing twice with zero identifying
  // information. The shortened address fills that slot with something
  // real instead. Watchlist wallets keep their nickname, since a
  // user-chosen label there is genuinely distinct from the "Watchlist"
  // badge (identity vs. access level) and — with up to 5 tracked wallets —
  // easier to tell apart at a glance than similar-looking hex strings.
  const buttonLabel = activeWalletObject
    ? activeWalletObject.type === "connected"
      ? shortenAddress(activeWalletObject.address)
      : activeWalletObject.label
    : t("navbar.connectWallet", "Connect Wallet");

  const buttonBadge = activeWalletObject
    ? activeWalletObject.type === "connected"
      ? { text: t("navbar.badgePrimary", "Primary"), tone: "primary" }
      : { text: t("navbar.badgeWatchlist", "Watchlist"), tone: "watchlist" }
    : null;

  return (
    <>
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed left-0 right-0 top-12 bottom-0 z-40 bg-black/10 backdrop-blur-[3px] lg:hidden transition-all duration-300 ease-in-out"
        />
      )}

      <header className="sticky top-0 z-30 h-12 w-full grid grid-cols-3 lg:flex lg:items-center lg:justify-between pt-2 px-2 md:pt-0 xl:px-4 bg-inherit transition-colors duration-200">
        
        {/* LEFT ZONE */}
        <div className="flex items-center justify-start min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#1B1B1F] lg:hidden cursor-pointer shrink-0"
          >
            <svg
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="cursor-pointer"
            >
              <path
                d="M4 6H20M4 12H20M4 18H20"
                stroke="#9BA6B7"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
          </button>

          <div className="hidden lg:block min-w-0">
            <h1
              className={`text-[13px] pl-2 font-bold text-ink-primary truncate transition-all duration-200 ${
                isSidebarCollapsed
                  ? "opacity-100 translate-x-0"
                  : "lg:opacity-0 lg:-translate-x-2 pointer-events-none"
              }`}
            >
              {getNavbarTitle()}
            </h1>
          </div>
        </div>

        {/* MIDDLE ZONE */}
        <div className="flex items-center justify-center lg:hidden min-w-0">
          <h1 className="text-[13px] font-bold text-ink-primary truncate tracking-tight">
            {getNavbarTitle()}
          </h1>
        </div>

        {/* RIGHT ZONE */}
        <div className="flex items-center justify-end gap-2 lg:gap-3 font-medium tracking-normal select-none shrink-0">
          
          <div className="hidden lg:flex items-center gap-2 lg:gap-3">
            <button
              type="button"
              onClick={() => setFlareWidgetOpen(!flareWidgetOpen)}
              className="px-2.5 py-1.5 rounded-lg border border-brand/30 bg-brand/10 text-brand text-[10px] lg:text-[10.5px] font-semibold hover:bg-brand hover:text-white transition-all shadow-sm cursor-pointer"
            >
              {t("navbar.askFlareGPT")}
            </button>

            {/* Account Selector Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                aria-haspopup="true"
                aria-expanded={walletMenuOpen}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border dark:border-none text-[10px] lg:text-[10.5px] bg-slate-100 dark:bg-[#1B1B1F] text-slate-600 dark:text-zinc-300"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    activeWalletObject?.type === "connected"
                      ? "bg-emerald-500 animate-pulse"
                      : activeWalletObject?.type === "tracked"
                        ? "bg-amber-500"
                        : "bg-slate-400 dark:bg-zinc-600"
                  }`}
                />
                <span className="max-w-[92px] truncate">{buttonLabel}</span>
                {buttonBadge && (
                  <WalletBadge tone={buttonBadge.tone} text={buttonBadge.text} />
                )}
                <ChevronDownIcon
                  className={`h-2.5 w-2.5 opacity-60 transition-transform duration-200 ${walletMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Desktop Dropdown Panel Card */}
              <div
                className={`absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-[#FFFFFF] border border-[#E5E7EB] p-2 shadow-xl dark:bg-[#21242B] dark:border-none z-50 space-y-1 transition-all duration-200 ${
                  walletMenuOpen
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
                }`}
              >
                <p className="px-1.5 pb-1 text-[8.5px] uppercase tracking-wider text-[#94A3B8] dark:text-[#6D7A86] font-bold">
                  {t("navbar.primaryWalletSection")}
                </p>

                {primaryWallet ? (
                  <WalletRow
                    wallet={primaryWallet}
                    isActive={activeAddress === primaryWallet.address}
                    copiedAddress={copiedAddress}
                    onSelect={() => handleSwitchActive(primaryWallet.address)}
                    onCopy={handleCopyAddress}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenWalletModal}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-[10.5px] font-semibold transition-colors cursor-pointer"
                  >
                    <WalletIcon className="h-3.5 w-3.5" />
                    {t("navbar.connectWallet")}
                  </button>
                )}

                {primaryWallet && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[10px] text-ink-secondary hover:bg-slate-50 hover:text-red-500 dark:hover:bg-[#1B1B1F] dark:hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <ArrowRightOnRectangleIcon className="h-3.5 w-3.5 opacity-70" />
                    {t("navbar.disconnectWallet")}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfigureWalletsRedirect}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[10px] text-ink-secondary hover:bg-slate-50 hover:text-ink-primary dark:hover:bg-[#1B1B1F] dark:hover:text-white transition-colors cursor-pointer border-t border-line mt-1 pt-2"
                >
                  <Cog6ToothIcon className="h-3.5 w-3.5 opacity-70" />
                  {t("navbar.configureWatchlistWallets")}
                </button>

                {watchlistWallets.length > 0 && (
                  <div className="border-t border-line mt-1 pt-1.5">
                    <p className="px-1.5 pb-1 text-[8.5px] uppercase tracking-wider text-[#94A3B8] dark:text-[#6D7A86] font-bold">
                      {t("navbar.watchlistSection", {
                        current: watchlistWallets.length,
                        max: maxSlots,
                      })}
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-0.5 scrollbar-none">
                      {watchlistWallets.map((wallet) => (
                        <WalletRow
                          key={wallet.address}
                          wallet={wallet}
                          isActive={activeAddress === wallet.address}
                          copiedAddress={copiedAddress}
                          onSelect={() => handleSwitchActive(wallet.address)}
                          onCopy={handleCopyAddress}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 dark:bg-[#191A1F] border border-slate-100 dark:border-none text-slate-500 dark:text-[#6D7A86] shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="tracking-wide uppercase text-[8.5px] font-bold">
                {t("navbar.mainnetStatus")}
              </span>
            </div>
          </div>

          {/* MOBILE/TABLET 3-DOT HUD TRIGGER */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-trigger-btn lg:hidden rounded-lg p-1 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-[#1B1B1F] transition-colors cursor-pointer z-50 relative"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6 text-brand" />
            ) : (
              <svg
                width="25"
                height="25"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="cursor-pointer text-slate-500 dark:text-zinc-400"
              >
                <path
                  d="M5 12H5.01M12 12H12.01M19 12H19.01M6 12C6 12.2652 5.89464 12.5196 5.70711 12.7071C5.51957 12.8946 5.26522 13 5 13C4.73478 13 4.48043 12.8946 4.29289 12.7071C4.10536 12.5196 4 12.2652 4 12C4 11.7348 4.10536 11.4804 4.29289 11.2929C4.48043 11.1054 4.73478 11 5 11C5.26522 11 5.51957 11.1054 5.70711 11.2929C5.89464 11.4804 6 11.7348 6 12V12ZM13 12C13 12.2652 12.8946 12.5196 12.7071 12.7071C12.5196 12.8946 12.2652 13 12 13C11.7348 13 11.4804 12.8946 11.2929 12.7071C11.1054 12.5196 11 12.2652 11 12C11 11.7348 11.1054 11.4804 11.2929 11.2929C11.4804 11.1054 11.7348 11 12 11C12.2652 11 12.5196 11.1054 12.7071 11.2929C12.8946 11.4804 13 11.7348 13 12V12ZM20 12C20 12.2652 19.8946 12.5196 19.7071 12.7071C19.5196 12.8946 19.2652 13 19 13C18.7348 13 18.4804 12.8946 18.2929 12.7071C18.1054 12.5196 18 12.2652 18 12C18 11.7348 18.1054 11.4804 18.2929 11.2929C18.4804 11.1054 18.7348 11 19 11C19.2652 11 19.5196 11.1054 19.7071 11.2929C19.8946 11.4804 20 11.7348 20 12V12Z"
                  stroke="#9BA6B7"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ================= MOBILE/TABLET SYSTEM OVERLAY MENU PANEL ================= */}
      <div
        className={`lg:hidden fixed left-4 right-4 top-16 z-50 rounded-2xl border border-slate-100 dark:border-none bg-surface-card p-4 shadow-2xl transition-all duration-300 transform-gpu ${
          mobileMenuOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
        ref={mobileMenuRef}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2B2F36]">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 dark:text-[#6D7A86]">
                {t("navbar.mainnetStatus")}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-[#21242B] px-2 py-0.5 rounded-md">
              <CurrencyDollarIcon className="h-3 w-3 text-emerald-500" />
              <span>FLR: $0.0182</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-[#6D7A86] block px-1">
                {t("navbar.primaryWalletSection")}
              </label>

              {primaryWallet ? (
                <WalletRow
                  wallet={primaryWallet}
                  isActive={activeAddress === primaryWallet.address}
                  copiedAddress={copiedAddress}
                  onSelect={() => handleSwitchActive(primaryWallet.address)}
                  onCopy={handleCopyAddress}
                  variant="mobile"
                />
              ) : (
                <button
                  type="button"
                  onClick={handleOpenWalletModal}
                  className="w-full py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <WalletIcon className="h-3.5 w-3.5" />
                  {t("navbar.connectWallet")}
                </button>
              )}

              {primaryWallet && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] text-ink-secondary hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  <ArrowRightOnRectangleIcon className="h-3.5 w-3.5 opacity-70" />
                  {t("navbar.disconnectWallet")}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfigureWalletsRedirect}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-100 dark:border-[#2B2F36] text-[11px] text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
            >
              <Cog6ToothIcon className="h-3.5 w-3.5 opacity-70" />
              {t("navbar.configureWatchlistWallets")}
            </button>

            {watchlistWallets.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-[#2B2F36]">
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-[#6D7A86] block px-1 pt-2">
                  {t("navbar.watchlistSection", {
                    current: watchlistWallets.length,
                    max: maxSlots,
                  })}
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-none">
                  {watchlistWallets.map((wallet) => (
                    <WalletRow
                      key={wallet.address}
                      wallet={wallet}
                      isActive={activeAddress === wallet.address}
                      copiedAddress={copiedAddress}
                      onSelect={() => handleSwitchActive(wallet.address)}
                      onCopy={handleCopyAddress}
                      variant="mobile"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE FLOATING ACTION BUTTON (FAB) */}
      <button
        type="button"
        onClick={() => setFlareWidgetOpen(!flareWidgetOpen)}
        className="lg:hidden fixed bottom-10 right-5 z-30 flex items-center justify-center h-[52px] w-[52px] rounded-full bg-gradient-to-br from-brand to-brand-hover text-white shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/10"
        aria-label={t("navbar.askFlareGPT")}
      >
        <ChatBubbleLeftRightIcon className="h-5 w-5" />
      </button>
    </>
  );
}

// Small colored text pill communicating a wallet's permanent type (Primary
// vs Watchlist) — deliberately separate from the active-row highlight
// below, since a wallet's type never changes but which one is active does.
// Reused on both the collapsed trigger button and every dropdown row so
// the same visual language means the same thing everywhere.
function WalletBadge({ tone, text }) {
  return (
    <span
      className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
        tone === "primary"
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      }`}
    >
      {text}
    </span>
  );
}

// One row in the desktop dropdown — used for both the Primary wallet slot
// and every Watchlist row. Neither carries a per-row type badge: each row
// already lives inside a section explicitly labeled "Primary Wallet" or
// "Watchlist", so a badge here would just repeat the section header
// (that redundancy is exactly what prompted showing an address instead of
// the word "Primary" below). The collapsed trigger button is the one
// place a badge earns its keep, since it has no section header for
// context. `isActive` drives the highlight independent of the row's
// title, so switching to a watchlist wallet never looks like anything
// else changed about it.
//
// The Primary row shows a shortened address as its title rather than
// `wallet.label` (always the hardcoded "Primary Wallet" string today,
// since there's no nickname system for the connected wallet) — same
// reasoning as the collapsed button. Watchlist rows keep their nickname.
function WalletRow({ wallet, isActive, copiedAddress, onSelect, onCopy, variant = "desktop" }) {
  const justCopied = copiedAddress === wallet.address;
  const isMobile = variant === "mobile";
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
        onClick={(e) => onCopy(e, wallet.address)}
        className="shrink-0 p-1 rounded-md text-current opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
      >
        {justCopied ? (
          <CheckIcon className="h-3 w-3 text-emerald-500" />
        ) : (
          <ClipboardIcon className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}