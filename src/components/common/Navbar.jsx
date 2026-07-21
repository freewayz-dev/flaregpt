// src/components/layout/Navbar.jsx
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // 🟢 ADDED: useNavigate
import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";
import {
  ChevronDownIcon,
  WalletIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  PlusIcon, // 🟢 ADDED: Micro Icon reference
} from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "../../store/useWalletHubStore";
import { useUIStore } from "../../store/useUIStore"; // 🟢 ADDED: Import UI store

export default function Navbar({
  flareWidgetOpen,
  setFlareWidgetOpen,
  setSidebarOpen,
  isSidebarCollapsed,
}) {
  const location = useLocation();
  const navigate = useNavigate(); // 🟢 ADDED: router instance
  const { t } = useTranslation();

  // 🟢 ADDED: Tab configuration state setter
  const setSettingsActiveTab = useUIStore((state) => state.setSettingsActiveTab);

  // Controls
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const { address: connectedAddress, isConnected } = useAccount();

  const { activeAddress, allWallets, switchActiveAddress } =
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

  // 🟢 ADDED: Reusable handler to trigger state update + redirect safely
  const handleConfigureWalletsRedirect = () => {
    setSettingsActiveTab("Wallets");
    setWalletMenuOpen(false);
    setMobileMenuOpen(false);
    navigate("/app/settings");
  };

  const activeWalletObject = allWallets.find(
    (w) => w.address === activeAddress,
  );

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
              className={`text-[13px] pl-2 font-bold text-[#0F172A] dark:text-[#FAFAFA] truncate transition-all duration-200 ${
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
          <h1 className="text-[13px] font-bold text-[#0F172A] dark:text-[#FAFAFA] truncate tracking-tight">
            {getNavbarTitle()}
          </h1>
        </div>

        {/* RIGHT ZONE */}
        <div className="flex items-center justify-end gap-2 lg:gap-3 font-medium tracking-normal select-none shrink-0">
          
          <div className="hidden lg:flex items-center gap-2 lg:gap-3">
            <button
              type="button"
              onClick={() => setFlareWidgetOpen(!flareWidgetOpen)}
              className="px-2.5 py-1.5 rounded-lg border border-[#E62058]/30 bg-[#E62058]/10 text-[#E62058] text-[10px] lg:text-[10.5px] font-semibold hover:bg-[#E62058] hover:text-white transition-all shadow-sm cursor-pointer"
            >
              {t("navbar.askFlareGPT")}
            </button>

            {/* Account Selector Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border dark:border-none text-[10px] lg:text-[10.5px] ${
                  activeWalletObject?.type === "connected"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : activeWalletObject?.type === "tracked"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-slate-100 dark:bg-[#1B1B1F] text-slate-500 dark:text-zinc-400"
                }`}
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
                <span className="font-mono tracking-wide">
                  {activeAddress
                    ? `${activeAddress.slice(0, 4)}...${activeAddress.slice(-4)}`
                    : t("navbar.noWallet", "No Wallet")}
                </span>
                <ChevronDownIcon
                  className={`h-2.5 w-2.5 opacity-60 transition-transform duration-200 ${walletMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Desktop Dropdown Panel Card */}
              <div
                className={`absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-[#FFFFFF] border border-[#E5E7EB] p-2 shadow-xl dark:bg-[#21242B] dark:border-none z-50 space-y-1 transition-all duration-200 ${
                  walletMenuOpen
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
                }`}
              >
                <div className="px-1.5 py-1 border-b border-[#E5E7EB] dark:border-[#1D1D20] mb-1 flex items-center justify-between gap-2">
                  <p className="text-[8.5px] uppercase tracking-wider text-[#94A3B8] dark:text-[#6D7A86] font-bold">
                    {t("navbar.dropdownTitle", "Active Target View")}
                  </p>
                  <div className="text-[8px] font-black text-slate-400 dark:text-[#6D7A86] tracking-wider uppercase whitespace-nowrap">
                    Flare Mainnet
                  </div>
                </div>

                {/* Wallets Conditional View List */}
                {allWallets.length === 0 ? (
                  /* 🟢 CHANGED: Replaced static text block with actionable contextual layout */
                  <div className="p-3 text-center space-y-2">
                    <p className="text-slate-400 dark:text-[#6D7A86] text-[9.5px] leading-relaxed">
                      {t("navbar.noTrackedNodes", "No tracked nodes.")}
                    </p>
                    <button
                      type="button"
                      onClick={handleConfigureWalletsRedirect}
                      className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#E62058] hover:bg-[#F03A6F] text-white text-[9.5px] font-semibold transition-colors cursor-pointer"
                    >
                      <PlusIcon className="h-3 w-3" />
                      Configure in Settings
                    </button>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-none">
                    {allWallets.map((wallet) => (
                      <button
                        key={wallet.address}
                        type="button"
                        onClick={() => {
                          switchActiveAddress(wallet.address);
                          setWalletMenuOpen(false);
                        }}
                        className={`w-full text-left flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer text-[10px] ${
                          activeAddress === wallet.address
                            ? "bg-[#E62058]/10 text-[#E62058] font-bold"
                            : "hover:bg-slate-50 dark:hover:bg-[#1B1B1F] text-[#475569] dark:text-[#A1A1AA]"
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <WalletIcon className="h-3 w-3 opacity-60" />
                          <div className="min-w-0 truncate">
                            <p className="font-semibold truncate leading-tight">
                              {wallet.label}
                            </p>
                            <p className="font-mono text-[9px] opacity-70 truncate mt-0.5">
                              {wallet.address}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ml-1.5 ${wallet.type === "connected" ? "bg-emerald-500" : "bg-amber-400"}`}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 dark:bg-[#191A1F] border border-slate-100 dark:border-none text-slate-500 dark:text-[#6D7A86] shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="tracking-wide uppercase text-[8.5px] font-bold">
                Flare Mainnet 
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
              <XMarkIcon className="h-6 w-6 text-[#E62058]" />
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
        className={`lg:hidden fixed left-4 right-4 top-16 z-50 rounded-2xl border border-slate-100 dark:border-none bg-[#FFFFFF] dark:bg-[#191A1F] p-4 shadow-2xl transition-all duration-300 transform-gpu ${
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
                Flare Mainnet
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-[#21242B] px-2 py-0.5 rounded-md">
              <CurrencyDollarIcon className="h-3 w-3 text-emerald-500" />
              <span>FLR: $0.0182</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-[#6D7A86] block px-1">
              {t("navbar.dropdownTitle", "Active Target View")}
            </label>

            {allWallets.length === 0 ? (
              /* 🟢 CHANGED: Replaced static text block with actionable context buttons for Mobile layout version */
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B1B1F]/40 text-center border border-dashed border-slate-100 dark:border-none space-y-2.5">
                <p className="text-slate-400 dark:text-[#6D7A86] text-[10px]">
                  {t("navbar.noTrackedNodes", "No tracked nodes.")}
                </p>
                <button
                  type="button"
                  onClick={handleConfigureWalletsRedirect}
                  className="w-full py-2 rounded-xl bg-[#E62058] hover:bg-[#F03A6F] text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Configure in Settings
                </button>
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-none">
                {allWallets.map((wallet) => (
                  <button
                    key={wallet.address}
                    type="button"
                    onClick={() => {
                      switchActiveAddress(wallet.address);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all border dark:border-none text-left ${
                      activeAddress === wallet.address
                        ? "bg-[#E62058]/10 border-[#E62058]/20 text-[#E62058] font-bold"
                        : "bg-slate-50/50 dark:bg-[#21242B] border-transparent text-slate-600 dark:text-[#6D7A86]"
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <WalletIcon className="h-3.5 w-3.5 opacity-60" />
                      <div className="min-w-0 truncate">
                        <p className="text-[11px] font-semibold truncate leading-tight">
                          {wallet.label}
                        </p>
                        <p className="font-mono text-[9px] opacity-60 truncate mt-0.5">
                          {wallet.address}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ml-2 ${
                        wallet.type === "connected"
                          ? "bg-emerald-500"
                          : "bg-amber-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE FLOATING ACTION BUTTON (FAB) */}
      <button
        type="button"
        onClick={() => setFlareWidgetOpen(!flareWidgetOpen)}
        className="lg:hidden fixed bottom-10 right-5 z-30 flex items-center justify-center h-[52px] w-[52px] rounded-full bg-gradient-to-br from-[#E62058] to-[#F03A6F] text-white shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/10"
        aria-label={t("navbar.askFlareGPT")}
      >
        <ChatBubbleLeftRightIcon className="h-5 w-5" />
      </button>
    </>
  );
}