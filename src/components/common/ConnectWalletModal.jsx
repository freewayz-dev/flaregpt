import { useEffect, useState } from "react";
import { useConnect, useAccount } from "wagmi";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";

import bifrostImg from "@/assets/wallets/bifrost.jpeg";
import rabbyImg from "@/assets/wallets/rabby.png";
import walletConnectImg from "@/assets/wallets/icon.png";
import metamask from "@/assets/wallets/MetaMask_Fox.svg.png";

const VISUAL_WALLETS = [
  {
    id: "bifrost",
    name: "Bifrost Wallet",
    type: "img",
    src: bifrostImg,
    recommended: true,
  },
  {
    id: "metamask",
    name: "MetaMask",
    type: "svg",
    src: metamask,
    recommended: false,
  },
  {
    id: "rabby",
    name: "Rabby Wallet",
    type: "img",
    src: rabbyImg,
    recommended: false,
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    type: "img",
    src: walletConnectImg,
    recommended: false,
  },
];

const getFriendlyErrorMessage = (error, t) => {
  if (!error) return null;
  const msg = error.message.toLowerCase();
  if (msg.includes("user rejected") || msg.includes("denied")) {
    return t("connectModal.errors.rejected");
  }
  if (msg.includes("already pending")) {
    return t("connectModal.errors.pending");
  }
  if (msg.includes("chain") || msg.includes("network")) {
    return t("connectModal.errors.wrongNetwork");
  }
  return t("connectModal.errors.generic");
};

export default function ConnectWalletModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { connect, connectors, error, isPending } = useConnect();
  const { isConnected } = useAccount();

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setAnimate(true), 20);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isConnected && isOpen) onClose();
  }, [isConnected, isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (e) => e.key === "Escape" && onClose();
    if (isOpen) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  const handleConnect = (walletId) => {
    if (walletId === "walletconnect") {
      const wcConnector = connectors.find((c) => c.id === "walletConnect");
      if (wcConnector) connect({ connector: wcConnector });
    } else {
      const injectedConnector = connectors.find((c) => c.id === "injected");
      if (injectedConnector) connect({ connector: injectedConnector });
    }
  };

  const transitionStyles = animate
    ? "translate-y-0 opacity-100 sm:scale-100"
    : "translate-y-full opacity-0 sm:translate-y-4 sm:scale-95";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out ${
          animate ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`relative w-full bg-surface-card border border-[#E5E7EB] dark:border-none p-5 shadow-xl transition-all duration-200 ease-out rounded-t-2xl max-w-none transform-gpu sm:relative sm:rounded-2xl sm:max-w-lg ${transitionStyles}`}
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-300 dark:bg-zinc-800 sm:hidden" />

        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div>
            <h3 className="text-sm font-bold text-ink-primary">
              {t("connectModal.title")}
            </h3>
            <p className="text-[11px] text-ink-secondary mt-0.5">
              {t("connectModal.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-secondary hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2 pb-4 sm:pb-0">
          {VISUAL_WALLETS.map((wallet) => (
            <button
              key={wallet.id}
              type="button"
              disabled={isPending}
              onClick={() => handleConnect(wallet.id)}
              className="w-full flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3 text-xs font-medium text-[#4F5B66] hover:bg-surface-subtle hover:text-ink-primary transition-all cursor-pointer disabled:opacity-50 dark:border-none dark:bg-surface-inset dark:text-[#A1A1AA] dark:hover:bg-surface-card-hover"
            >
              <div className="flex items-center gap-3">
                <WalletImage src={wallet.src} alt={wallet.name} />
                <span className="tracking-wide">{wallet.name}</span>
              </div>

              {wallet.recommended && (
                <span className="text-[9px] font-semibold bg-brand/10 text-brand px-2 py-0.5 rounded-md">
                  {t("connectModal.recommended")}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-center text-[10px] text-brand bg-brand/10 p-2 rounded-lg font-medium tracking-wide">
            {getFriendlyErrorMessage(error, t)}
          </p>
        )}

        <div className="mt-5 text-[10px] text-ink-muted text-center leading-relaxed">
          {t("connectModal.mobileHint")}
        </div>
      </div>
    </div>
  );
}

function WalletImage({ src, alt }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative w-6 h-6 flex items-center justify-center shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
      {/* Blur placeholder effect */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700 blur-sm" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={`h-5 w-5 object-contain transition-opacity rounded-md duration-500 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
