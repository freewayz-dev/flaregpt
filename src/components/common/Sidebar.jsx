// src/components/layout/Sidebar.jsx
import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom"; // 🟢 ADDED: useNavigate
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

import FlareGptSimpleLogo from "./Logo";
import ConnectWalletModal from "./ConnectWalletModal";
import Logo from "../../assets/icons/fl.png";
import { useUIStore } from "../../store/useUIStore"; // 🟢 ADDED: Import UI store

// Asynchronous route code chunk-splitting anchors
const prefetchDashboard = () => import("../../pages/Dashboard");
const prefetchFlareGPT = () => import("../../pages/Flrgpt");
const prefetchWallet = () => import("../../pages/WalletActivity");
const prefetchSettings = () => import("../../pages/Settings");
const prefetchHelp = () => import("../../pages/Help");

const links = [
  {
    translationKey: "overview",
    path: "/app", // 🟢 UPDATED: Points to your dashboard index route endpoint directly
    icon: Squares2X2Icon,
    prefetch: prefetchDashboard,
  },
  {
    translationKey: "FlareGPT",
    path: "/app/flare-gpt", // 🟢 UPDATED
    icon: ChatBubbleLeftRightIcon,
    prefetch: prefetchFlareGPT,
  },
  {
    translationKey: "walletActivity",
    path: "/app/wallet", // 🟢 UPDATED
    icon: WalletIcon,
    prefetch: prefetchWallet,
  },
  {
    translationKey: "ftsoRewards",
    path: "/app/rewards", // 🟢 UPDATED
    icon: GiftIcon,
  },
  {
    translationKey: "yield",
    path: "/app/yield", // 🟢 UPDATED
    icon: ArrowTrendingUpIcon,
  },
  {
    translationKey: "rflrTracker",
    path: "/app/rflr", // 🟢 UPDATED
    icon: ChartBarIcon,
  },
  {
    translationKey: "governance",
    path: "/app/governance", // 🟢 UPDATED
    icon: ShieldCheckIcon,
  },
  {
    translationKey: "fxrpPool",
    path: "/app/fxrp", // 🟢 UPDATED
    icon: CurrencyDollarIcon,
  },
  {
    translationKey: "feeds",
    path: "/app/feeds", // 🟢 UPDATED
    icon: CurrencyDollarIcon,
  },
  {
    translationKey: "settings",
    path: "/app/settings", // 🟢 UPDATED
    icon: Cog6ToothIcon,
    prefetch: prefetchSettings,
  },
  {
    translationKey: "helpCenter",
    path: "/app/help", // 🟢 UPDATED
    icon: QuestionMarkCircleIcon,
    prefetch: prefetchHelp,
  },
];
export default function Sidebar({ collapsed, setCollapsed, open, setOpen }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate(); // 🟢 ADDED: router hook

  // 🟢 ADDED: Tab management setter action
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

  // Intercept the toggle to write cleanly to context and localStorage simultaneously
  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem("sidebar-collapsed", nextState);
      return nextState;
    });
  };

  // 🟢 ADDED: Smooth routing navigation utility handler
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
        className={`fixed inset-y-0 left-0 z-50 h-full flex flex-col bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.01)] dark:bg-[#161619] border-r border-[#E5E7EB] dark:border-[#1D1D20] transform lg:static lg:translate-x-0
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
                onClick={handleToggleCollapse}
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-[#475569] dark:text-[#A1A1AA] hover:bg-[#F3F4F6] dark:hover:bg-[#1B1B1F] cursor-pointer"
              >
                <ChevronDoubleLeftIcon className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="lg:hidden p-1 rounded-lg text-[#475569] hover:bg-[#F3F4F6] dark:text-[#A1A1AA] dark:hover:bg-[#1B1B1F] cursor-pointer"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Symmetrical Collapsed Indicator view */}
          {collapsed && (
            <div className="hidden lg:flex flex-col items-center gap-3 pt-1.5">
              <div className="relative w-5 h-5 flex items-center justify-center rounded-xl bg-[#E62058] shadow-md flex-shrink-0 overflow-hidden">
                <img alt="Logo" src={Logo} />
              </div>
              <button
                type="button"
                onClick={handleToggleCollapse}
                className="h-8 w-8 pl-2 items-center justify-center rounded-lg text-[#475569] dark:text-[#A1A1AA] hover:bg-[#F3F4F6] dark:hover:bg-[#1B1B1F] hover:text-[#0F172A] dark:hover:text-[#FAFAFA] transition-colors cursor-pointer"
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
                      ? "relative bg-[#E62058]/15 text-[#E62058]"
                      : "text-[#475569] hover:bg-[#F3F4F6] hover:text-[#0F172A] dark:text-[#A1A1AA] dark:hover:bg-[#1B1B1F] dark:hover:text-[#FAFAFA]"
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
                  <p className="text-xs text-[#475569] dark:text-[#A1A1AA]">
                    Not Connected
                  </p>
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="w-full rounded-xl bg-[#E62058] px-3 py-2 text-xs font-medium text-white hover:bg-[#F03A6F] transition-colors shadow-sm cursor-pointer"
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
                    {/* 🟢 ADDED: Minimal sub-border action link button for managing/adding tracking variables */}
                    <button
                      type="button"
                      onClick={handleDeepLinkToWallets}
                      className="text-left text-[10px] text-slate-400 dark:text-zinc-500 hover:text-[#E62058] dark:hover:text-[#E62058] transition-colors cursor-pointer w-fit font-medium"
                    >
                      + Add Watchlist Wallet
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => disconnect()}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2 text-xs text-[#475569] hover:bg-[#F3F4F6] hover:text-[#0F172A] dark:border-none dark:bg-[#1B1B1F] dark:text-[#A1A1AA] dark:hover:bg-[#1B1B1F]/70 transition-colors cursor-pointer"
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
                className="hidden lg:flex w-full justify-center rounded-xl p-3 bg-[#E62058]/10 text-[#E62058] cursor-pointer"
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
