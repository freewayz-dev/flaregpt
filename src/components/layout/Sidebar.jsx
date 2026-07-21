// src/components/layout/Sidebar.jsx
import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAccount, useDisconnect } from "wagmi";
import {
  WalletIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  XMarkIcon,
  QuestionMarkCircleIcon,
  CurrencyDollarIcon,
  Squares2X2Icon,
  ArrowTrendingUpIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";

import FlareGptSimpleLogo from "@/components/common/Logo";
import ConnectWalletModal from "@/components/common/ConnectWalletModal";
import Logo from "@/assets/icons/fl.png";
import { useUIStore } from "@/store/useUIStore";

// Asynchronous route code chunk-splitting anchors
const prefetchDashboard = () => import("@/pages/Dashboard");
const prefetchFlareGPT = () => import("@/pages/Flrgpt");
const prefetchWallet = () => import("@/pages/WalletActivity");
const prefetchSettings = () => import("@/pages/Settings");
const prefetchHelp = () => import("@/pages/Help");

const links = [
  {
    translationKey: "overview",
    path: "/app",
    icon: Squares2X2Icon,
    prefetch: prefetchDashboard,
  },
  {
    translationKey: "FlareGPT",
    path: "/app/flare-gpt",
    icon: ChatBubbleLeftRightIcon,
    prefetch: prefetchFlareGPT,
  },
  {
    translationKey: "walletActivity",
    path: "/app/wallet",
    icon: WalletIcon,
    prefetch: prefetchWallet,
  },
  {
    translationKey: "ftsoRewards",
    path: "/app/rewards",
    icon: GiftIcon,
  },
  {
    translationKey: "loops",
    path: "/app/loops",
    icon: ArrowTrendingUpIcon,
  },
  {
    translationKey: "rflrTracker",
    path: "/app/rflr",
    icon: ChartBarIcon,
  },
  
  {
    translationKey: "fxrpPool",
    path: "/app/fxrp",
    icon: CurrencyDollarIcon,
  },
  {
    translationKey: "governance",
    path: "/app/governance",
    icon: ShieldCheckIcon,
  },
  {
    translationKey: "settings",
    path: "/app/settings",
    icon: Cog6ToothIcon,
    prefetch: prefetchSettings,
  },
  {
    translationKey: "helpCenter",
    path: "/app/help",
    icon: QuestionMarkCircleIcon,
    prefetch: prefetchHelp,
  },
];
export default function Sidebar({ open, setOpen }) {
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

  // Local-only state managed within the Modal overlay system boundary
  const [modalOpen, setModalOpen] = useState(false);

  // Real Wagmi Account State variables
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Format long wallet addresses for your minimalist UI (e.g. 0x71C...3A90)
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
  };

  const isActive = (path) => location.pathname === path;

  const handleDeepLinkToWallets = () => {
    setSettingsActiveTab("Wallets");
    setOpen(false); // Close mobile drawer if open
    navigate("/app/settings");
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

      {/* Core Component Frame Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 h-full flex flex-col bg-surface-card shadow-[0_1px_3px_rgba(0,0,0,0.01)] border-r border-line transform lg:static lg:translate-x-0
          transition-[width,transform] duration-300 ease-in-out
          w-[240px] ${collapsed ? "lg:w-[72px]" : "lg:w-[240px]"}
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header Block Panel */}
        <div className="px-4 pt-2.5 pb-4">
          <div
            className={`flex items-center justify-between pl-1 ${collapsed ? "lg:hidden" : ""}`}
          >
            <Link to="/">
              <FlareGptSimpleLogo />
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-subtle cursor-pointer"
              >
                <ChevronDoubleLeftIcon className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="lg:hidden p-1 rounded-lg text-ink-secondary hover:bg-surface-subtle cursor-pointer"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Symmetrical Collapsed Indicator view */}
          {collapsed && (
            <div className="hidden lg:flex flex-col items-center gap-3 pt-1.5">
              <div className="relative w-5 h-5 flex items-center justify-center rounded-xl bg-brand shadow-md flex-shrink-0 overflow-hidden">
                <img alt="Logo" src={Logo} />
              </div>
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="h-8 w-8 pl-2 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary transition-colors cursor-pointer"
              >
                <ChevronDoubleRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Navigation Interface Menu list */}
        <nav className="mt-4 flex-1 space-y-1 px-2 overflow-y-auto scrollbar-none">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);

            return (
              <Link
                key={link.translationKey}
                to={link.path}
                onMouseEnter={link.prefetch}
                onFocus={link.prefetch}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center rounded-xl py-3 text-xs font-medium transition-colors duration-150
                  px-3 gap-3 ${collapsed ? "lg:justify-center lg:px-2 lg:gap-0" : ""}
                  ${
                    active
                      ? "relative bg-brand/15 text-brand"
                      : "text-[#475569] hover:bg-surface-subtle hover:text-ink-primary dark:text-[#6D7A86]"
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
                    Not Connected
                  </p>
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="w-full rounded-xl bg-brand px-3 py-2 text-xs font-medium text-white hover:bg-brand-hover transition-colors shadow-sm cursor-pointer"
                  >
                    Connect Wallet
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Active: {formatAddress(address)}
                    </p>
                    <button
                      type="button"
                      onClick={handleDeepLinkToWallets}
                      className="text-left text-[10px] text-slate-400 dark:text-zinc-500 hover:text-brand dark:hover:text-brand transition-colors cursor-pointer w-fit font-medium"
                    >
                      + Add Watchlist Wallet
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => disconnect()}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2 text-xs text-ink-secondary hover:bg-surface-subtle hover:text-[#0F172A] dark:border-none dark:hover:bg-[#1B1B1F]/70 transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>

            {/* Micro Icon Context Action Button */}
            {collapsed && (
              <button
                type="button"
                onClick={() =>
                  isConnected ? disconnect() : setModalOpen(true)
                }
                className="hidden lg:flex w-full justify-center rounded-xl p-3 bg-brand/10 text-brand cursor-pointer"
              >
                <WalletIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      <ConnectWalletModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
