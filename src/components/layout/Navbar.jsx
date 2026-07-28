// src/components/layout/Navbar.jsx
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { toast } from "react-toastify";
import {
  ChevronDownIcon,
  WalletIcon,
  SparklesIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useUIStore } from "@/store/useUIStore";
import { useFlareGptStore } from "@/store/useFlareGptStore";
import { useDisconnectAllWallets } from "@/hooks/useDisconnectAllWallets";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { shortenAddress } from "@/utils/address";
import { ROUTES } from "@/config/routes";
import WalletBadge from "@/components/common/WalletBadge";
import WalletRow from "@/components/common/WalletRow";

const FAB_HINT_SEEN_KEY = "flrgpt_fab_hint_seen";

export default function Navbar({
  onToggleFlareWidget,
  setSidebarOpen,
  onOpenWalletModal,
  hideAskFlareGpt = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isSidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSettingsActiveTab = useUIStore((state) => state.setSettingsActiveTab);
  const hideBalances = useUIStore((state) => state.hideBalances);
  const toggleHideBalances = useUIStore((state) => state.toggleHideBalances);

  // Controls
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Address currently showing a "Copied" confirmation on its row's copy
  // icon — a single string rather than per-row booleans, since only one
  // row can ever be mid-confirmation at a time.
  const [copiedAddress, setCopiedAddress] = useState(null);

  // The FlareGPT sidebar link is now desktop-only (see Sidebar.jsx) — the
  // one person who might go looking for it in the old spot is someone who
  // already has a conversation in this browser, i.e. a returning user, not
  // a first-time visitor. This nudge targets exactly that person, once,
  // then never again (persisted in localStorage, not this component's
  // state, so it survives reloads).
  const hasFlareGptHistory = useFlareGptStore((s) => s.messages.length > 0);
  const [showFabHint, setShowFabHint] = useState(false);

  useEffect(() => {
    if (hasFlareGptHistory && !localStorage.getItem(FAB_HINT_SEEN_KEY)) {
      setShowFabHint(true);
    }
  }, [hasFlareGptHistory]);

  const dismissFabHint = () => {
    localStorage.setItem(FAB_HINT_SEEN_KEY, "1");
    setShowFabHint(false);
  };

  useEffect(() => {
    if (!showFabHint) return;
    const timer = setTimeout(dismissFabHint, 6000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFabHint]);

  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const { address: connectedAddress, isConnected } = useConnection();
  const disconnectAll = useDisconnectAllWallets();
  const { isCurrentWalletSignedIn, isAuthenticating, signIn } = useAuthStatus();

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

    if (path === "" || path === ROUTES.app) return t("sidebar.overview");
    if (path === ROUTES.flareGpt) return t("sidebar.FlareGPT");
    if (path === ROUTES.walletActivity) return t("sidebar.walletActivity");
    if (path === ROUTES.ftsoRewards) return t("sidebar.ftsoRewards");
    if (path === ROUTES.rflrTracker) return t("sidebar.rflrTracker");
    if (path === ROUTES.governance) return t("sidebar.governance");
    if (path === ROUTES.defiProtocols) return t("sidebar.defiProtocols");
    if (path === ROUTES.settings) return t("sidebar.settings");
    if (path === ROUTES.help) return t("sidebar.helpCenter");

    return t("sidebar.FlareGPT");
  };

  const handleConfigureWalletsRedirect = () => {
    setSettingsActiveTab("Wallets");
    setWalletMenuOpen(false);
    setMobileMenuOpen(false);
    navigate(ROUTES.settings);
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
  // Whether the wallet that's actually *connected* needs to sign in — this
  // is a property of the connection itself (mirrors Sidebar.jsx's identical
  // check), completely independent of which wallet the dashboard happens to
  // be displaying right now. A watchlist wallet can be active while the
  // connected wallet sits signed out in the background; that combination
  // must still surface a way to sign in, since switching *back* to the
  // connected wallet first was exactly the confusing extra step this fixes.
  const connectedWalletNeedsSignIn = isConnected && !isCurrentWalletSignedIn;

  // Whether the *active* slot specifically is the one needing sign-in —
  // only true when the connected wallet is also what's currently active.
  // This (not the check above) is what the trigger's own label/badge reacts
  // to, so switching to a watchlist wallet still shows its own "Watchlist"
  // badge rather than a "Sign In" badge that would misrepresent what's
  // actually active.
  const activeWalletNeedsSignIn =
    activeWalletObject?.type === "connected" && connectedWalletNeedsSignIn;

  // The trigger's label always names the wallet actually driving the
  // dashboard — connection and authentication are separate states (see
  // useAuthStatus.js), and turning the label itself into "Sign In" would
  // collapse that distinction back into one, plus hide which wallet needs
  // it. The badge is what carries the "needs sign-in" signal instead.
  const buttonLabel = activeWalletObject
    ? activeWalletObject.type === "connected"
      ? shortenAddress(activeWalletObject.address)
      : activeWalletObject.label
    : t("navbar.connectWallet", "Connect Wallet");

  const buttonBadge = activeWalletNeedsSignIn
    ? { text: t("navbar.badgeSignIn", "Sign In"), tone: "warning" }
    : activeWalletObject
      ? activeWalletObject.type === "connected"
        ? { text: t("navbar.badgePrimary", "Primary"), tone: "primary" }
        : { text: t("navbar.badgeWatchlist", "Watchlist"), tone: "watchlist" }
      : null;

  // Surfaced only in the case the badge above can't: a watchlist wallet is
  // active (so the badge is rightly showing "Watchlist"), but the connected
  // wallet still needs attention in the background. A small corner dot on
  // the trigger itself is what lets a user notice this without having to
  // open the dropdown first.
  const showBackgroundSignInHint =
    connectedWalletNeedsSignIn && !activeWalletNeedsSignIn;

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

          <button
            type="button"
            onClick={toggleHideBalances}
            title={hideBalances ? t("navbar.showBalances") : t("navbar.hideBalances")}
            aria-pressed={hideBalances}
            className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#1B1B1F] cursor-pointer shrink-0"
          >
            {hideBalances ? (
              <EyeSlashIcon className="h-[18px] w-[18px]" />
            ) : (
              <EyeIcon className="h-[18px] w-[18px]" />
            )}
          </button>

          <div className="hidden lg:flex items-center gap-2 lg:gap-3">
            {!hideAskFlareGpt && (
              <button
                type="button"
                onClick={onToggleFlareWidget}
                className="px-2.5 py-1.5 rounded-lg border border-brand/30 bg-brand/10 text-brand text-[10px] lg:text-[10.5px] font-semibold hover:bg-brand hover:text-white transition-all shadow-sm cursor-pointer"
              >
                {t("navbar.askFlareGPT")}
              </button>
            )}

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 dark:bg-[#191A1F] border border-slate-100 dark:border-none text-slate-500 dark:text-[#6D7A86] shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="tracking-wide uppercase text-[8.5px] font-bold">
                {t("navbar.mainnetStatus")}
              </span>
            </div>

            {/* Account Selector Dropdown — rightmost: the highest-consequence,
                most interactive control in this cluster (it changes what the
                entire dashboard shows), so it anchors the position closest to
                where users expect an account/profile menu to live. Everything
                to its left decreases in either frequency of use (the privacy
                eye toggle) or interactivity (the network badge has no menu at
                all) as it moves away from that anchor. */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                aria-haspopup="true"
                aria-expanded={walletMenuOpen}
                title={
                  showBackgroundSignInHint
                    ? t(
                        "navbar.signInBackgroundHint",
                        "Your connected wallet needs to sign in",
                      )
                    : undefined
                }
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all border text-[10px] lg:text-[10.5px] cursor-pointer ${
                  activeWalletNeedsSignIn
                    ? "border-brand/30 bg-brand/10 text-brand hover:bg-brand hover:text-white"
                    : "dark:border-none bg-slate-100 dark:bg-[#1B1B1F] text-slate-600 dark:text-zinc-300"
                }`}
              >
                {showBackgroundSignInHint && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-brand ring-2 ring-white dark:ring-[#0B0B0D] animate-pulse" />
                )}
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    activeWalletNeedsSignIn
                      ? "bg-brand animate-pulse"
                      : activeWalletObject?.type === "connected"
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

                {/* The wallet row above always shows the connected wallet —
                    switching wallets must stay possible even while signed
                    out, since disconnecting/reconnecting isn't required to
                    fix this. This banner is the one place sign-in is
                    actually triggered from; nothing else in the app repeats
                    it. */}
                {connectedWalletNeedsSignIn && (
                  <div className="rounded-lg bg-brand/10 border border-brand/20 p-2 space-y-1.5">
                    <p className="text-[10px] text-brand font-medium leading-snug">
                      {t(
                        "navbar.signInPrompt",
                        "Sign a message to verify this wallet and continue.",
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={signIn}
                      disabled={isAuthenticating}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-white text-[10.5px] font-semibold transition-colors cursor-pointer"
                    >
                      {isAuthenticating
                        ? t("navbar.signingIn", "Signing in…")
                        : t("navbar.signIn", "Sign In")}
                    </button>
                  </div>
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
                        max: Number.isFinite(maxSlots) ? maxSlots : "∞",
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

              {connectedWalletNeedsSignIn && (
                <div className="rounded-xl bg-brand/10 border border-brand/20 p-2.5 space-y-2">
                  <p className="text-[10.5px] text-brand font-medium leading-snug">
                    {t(
                      "navbar.signInPrompt",
                      "Sign a message to verify this wallet and continue.",
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={signIn}
                    disabled={isAuthenticating}
                    className="w-full py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isAuthenticating
                      ? t("navbar.signingIn", "Signing in…")
                      : t("navbar.signIn", "Sign In")}
                  </button>
                </div>
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
                    max: Number.isFinite(maxSlots) ? maxSlots : "∞",
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
      {!hideAskFlareGpt && (
        <>
          {showFabHint && (
            <div
              role="status"
              onClick={dismissFabHint}
              className="lg:hidden fixed bottom-[104px] right-5 z-30 max-w-[190px] rounded-xl bg-ink-primary px-3 py-2 text-[11px] font-medium leading-snug text-white shadow-xl cursor-pointer"
            >
              {t("navbar.flareGptFabHint")}
              <span className="absolute -bottom-1 right-6 h-2.5 w-2.5 rotate-45 bg-ink-primary" />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              dismissFabHint();
              onToggleFlareWidget();
            }}
            className="lg:hidden fixed bottom-10 right-5 z-30 flex items-center justify-center h-[52px] w-[52px] rounded-full bg-gradient-to-br from-brand to-brand-hover text-white shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/10"
            aria-label={t("navbar.askFlareGPT")}
          >
            <SparklesIcon className="h-5 w-5" />
          </button>
        </>
      )}
    </>
  );
}
