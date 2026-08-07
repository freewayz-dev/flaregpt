// src/components/layout/Sidebar.jsx
import { useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import {
  XMarkIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";

import FlareGptSimpleLogo from "@/components/common/Logo";
import FlareGptMark from "@/components/common/FlareGptMark";
import { shortenAddress } from "@/utils/address";
import { useUIStore } from "@/store/useUIStore";
import { useDisconnectAllWallets } from "@/hooks/useDisconnectAllWallets";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { NAV_LINKS as links } from "@/config/navigation";
import { ROUTES } from "@/config/routes";

interface SidebarProps {
  open: boolean;
  setOpen: (value: boolean) => void;
  onOpenWalletModal: () => void;
}

export default function Sidebar({ open, setOpen, onOpenWalletModal }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore(
    (state) => state.toggleSidebarCollapsed,
  );
  const setSettingsActiveTab = useUIStore(
    (state) => state.setSettingsActiveTab,
  );

  // Real Wagmi Account State variables
  const { address, isConnected } = useConnection();
  const disconnectAll = useDisconnectAllWallets();
  const { isCurrentWalletSignedIn } = useAuthStatus();
  // Wallet connection and authentication are separate states — being
  // connected-but-signed-out is a real, expected state (right after
  // logout), not an error one. The actual "Sign In" action lives only in
  // the Navbar's account dropdown; this footer just reflects the status so
  // there's never more than one Sign In control on screen at once.
  const needsSignIn = isConnected && !isCurrentWalletSignedIn;

  const isActive = (path: string) => location.pathname === path;

  // Matches every other dismissible overlay in the app — a keyboard user
  // shouldn't need to tab to the explicit close button to get out of the
  // mobile drawer.
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, setOpen]);

  const handleDeepLinkToWallets = () => {
    setSettingsActiveTab("Wallets");
    setOpen(false);
    navigate(ROUTES.settings);
  };

  return (
    <>
      {/* Mobile/Tablet Drawer Backdrop Overlay Mask */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 lg:hidden transition-all duration-300 ease-in-out backdrop-blur-[3px]
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      />

      {/* Core Component Frame Container.
          The bare `transform` utility (Tailwind's pre-JIT marker class) was
          dropped — `translate-x-*`/`lg:translate-x-0` below already set the
          full `transform` property on their own in JIT mode, so it did
          nothing. What's NOT removable: any non-`none` transform (even an
          identity translate(0,0), which this always computes to, mobile or
          desktop) makes this element the containing block for any
          `position: fixed` descendant, anchoring it to *this* box instead
          of the real viewport — precisely the bug DashboardLayout's own
          history with FlareWidget already hit once. That's fine as long as
          nothing fixed-positioned is ever nested inside this sidebar (true
          today — logo, nav links, footer wallet button only); if that ever
          changes, render the new element via createPortal(document.body)
          instead, the same fix already used for WalletActivity's
          TransactionDrawer, rather than nesting it here. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 h-full flex flex-col bg-surface-card shadow-[0_1px_3px_rgba(0,0,0,0.01)] border-r border-line lg:static
          pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]
          transition-[width,transform] duration-300 ease-in-out
          w-[240px] ${collapsed ? "lg:w-[72px]" : "lg:w-[240px]"}
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        {/* Header Block Panel */}
        <div className="px-4 pt-2.5 pb-4">
          <div
            className={`flex items-center justify-between pl-1 ${collapsed ? "lg:hidden" : ""}`}
          >
            <Link to={ROUTES.landing}>
              <FlareGptSimpleLogo />
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                aria-label={t("sidebar.collapseSidebar")}
                title={t("sidebar.collapseSidebar")}
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-card-hover cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                <ChevronDoubleLeftIcon className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("sidebar.closeMenu")}
                title={t("sidebar.closeMenu")}
                className="relative lg:hidden p-1 rounded-lg text-ink-secondary hover:bg-surface-card-hover cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 before:content-[''] before:absolute before:-inset-2"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Symmetrical Collapsed Indicator view */}
          {collapsed && (
            <div className="hidden lg:flex flex-col items-center gap-3 pt-1.5">
              <FlareGptMark className="w-5 h-5 shrink-0 shadow-md" />

              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                aria-label={t("sidebar.expandSidebar")}
                title={t("sidebar.expandSidebar")}
                className="h-8 w-8 pl-2 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-card-hover hover:text-ink-primary transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                <ChevronDoubleRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Navigation Interface Menu list */}
        <nav aria-label={t("sidebar.mainNavigation")} className="mt-4 flex-1 space-y-1 px-2 overflow-y-auto scrollbar-none">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);

            return (
              <Link
                key={link.translationKey}
                to={link.path}
                aria-current={active ? "page" : undefined}
                onMouseEnter={link.prefetch}
                onFocus={link.prefetch}
                onClick={() => setOpen(false)}
                className={`
                  ${link.hideOnMobile ? "hidden lg:flex" : "flex"} items-center rounded-xl py-3 text-xs font-medium transition-colors duration-150
                  px-3 gap-3 ${collapsed ? "lg:justify-center lg:px-2 lg:gap-0" : ""}
                  ${
                    active
                      ? "relative bg-brand/15 text-brand"
                      : "text-ink-secondary hover:bg-surface-card-hover hover:text-ink-primary dark:hover:text-white"
                  }
                `}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>
                  {t(`sidebar.${link.translationKey}`)}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Configuration Panel Hub */}
        <div className="px-4 pb-3 mt-auto">
          <div className="pt-6">
            <div className={`space-y-2 ${collapsed ? "lg:hidden" : ""}`}>
              {!isConnected ? (
                <>
                  <p className="text-xs text-ink-secondary">
                    {t("sidebar.notConnected")}
                  </p>
                  <button
                    type="button"
                    onClick={onOpenWalletModal}
                    className="w-full rounded-xl bg-brand px-3 py-2 text-xs font-medium text-white hover:bg-brand-hover transition-colors shadow-sm cursor-pointer"
                  >
                    {t("sidebar.connectWallet")}
                  </button>
                </>
              ) : needsSignIn ? (
                <>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-brand font-medium">
                      {t("sidebar.signInRequired", "Sign in required")}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-snug">
                      {t(
                        "sidebar.signInRequiredHint",
                        "Use the wallet menu in the top bar to sign in.",
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={disconnectAll}
                    className="w-full rounded-xl border border-[#E5E7EB] dark:border-none bg-[#FFFFFF] dark:bg-surface-inset px-3 py-2 text-xs text-ink-secondary hover:bg-surface-subtle dark:hover:bg-surface-card-hover hover:text-ink-primary dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {t("sidebar.disconnect")}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {t("sidebar.activeWallet", { address: shortenAddress(address) })}
                    </p>
                    <button
                      type="button"
                      onClick={handleDeepLinkToWallets}
                      className="text-left text-[10px] text-slate-400 dark:text-zinc-500 hover:text-brand dark:hover:text-brand transition-colors cursor-pointer w-fit font-medium"
                    >
                      {t("sidebar.addWatchlistWallet")}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={disconnectAll}
                    className="w-full rounded-xl border border-[#E5E7EB] dark:border-none bg-[#FFFFFF] dark:bg-surface-inset px-3 py-2 text-xs text-ink-secondary hover:bg-surface-subtle dark:hover:bg-surface-card-hover hover:text-ink-primary dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {t("sidebar.disconnect")}
                  </button>
                </>
              )}
            </div>

            {/* Micro Icon Context Action Button */}
            {collapsed && (
              <button
                type="button"
                onClick={() => (isConnected ? disconnectAll() : onOpenWalletModal())}
                title={
                  needsSignIn
                    ? t("sidebar.signInRequired", "Sign in required")
                    : isConnected
                      ? t("sidebar.disconnect")
                      : t("sidebar.connectWallet")
                }
                aria-label={
                  needsSignIn
                    ? t("sidebar.signInRequired", "Sign in required")
                    : isConnected
                      ? t("sidebar.disconnect")
                      : t("sidebar.connectWallet")
                }
                className={`hidden lg:flex w-full justify-center rounded-xl p-3 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${
                  needsSignIn ? "bg-brand text-white" : "bg-brand/10 text-brand"
                }`}
              >
                <WalletIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
