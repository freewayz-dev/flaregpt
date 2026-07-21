import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";
import { WalletIcon, TrashIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import Card from "@/pages/Settings/components/Card";

export default function Wallets() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useAccount();

  const {
    allWallets,
    trackedWallets,
    addTrackedWallet,
    removeTrackedWallet,
    maxSlots,
    remainingSlots,
  } = useDerivedWalletHub(connectedAddress, isConnected);

  const [inputAddress, setInputAddress] = useState("");
  const [inputLabel, setInputLabel] = useState("");
  const [errorText, setErrorText] = useState("");

  const totalCount = trackedWallets.length;

  const handleSave = (e) => {
    e.preventDefault();
    setErrorText("");

    if (!inputAddress.startsWith("0x") || inputAddress.length !== 42) {
      setErrorText(t("settings.wallets.invalidAddress"));
      return;
    }

    const success = addTrackedWallet(
      inputAddress.trim(),
      inputLabel.trim() || "Watchlist Wallet",
      connectedAddress,
      isConnected,
    );

    if (!success) {
      setErrorText(t("settings.wallets.registrationFailed"));
      return;
    }

    setInputAddress("");
    setInputLabel("");
  };

  return (
    <div className="space-y-6">
      <Card
        title={t("settings.cards.connectedWallets")}
        subtitle={t("settings.wallets.manageSubtitle")}
      >
        {allWallets.length === 0 ? (
          <div className="py-8 text-center rounded-2xl bg-surface-subtle px-4">
            <WalletIcon className="h-8 w-8 mx-auto text-ink-muted mb-2" />
            <p className="text-sm font-medium text-ink-primary">
              {t("settings.wallets.emptyTerminal")}
            </p>
            <p className="mt-0.5 text-xs text-[#475569] dark:text-[#6D7A86]">
              {t("settings.wallets.limit", { max: maxSlots })}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allWallets.map((wallet) => (
              <div
                key={wallet.address}
                className="flex items-center justify-between gap-4 rounded-xl bg-[#F3F4F6] dark:bg-[#21242B] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-[#121214] text-[#475569] dark:text-[#6D7A86]">
                    <WalletIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-primary truncate">
                      {wallet.label}
                    </p>
                    <p className="text-xs font-mono text-[#94A3B8] dark:text-[#6D7A86] mt-0.5 truncate">
                      {wallet.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                      wallet.type === "connected"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-amber-500/10 text-amber-500"
                    }`}
                  >
                    {wallet.type === "connected"
                      ? t("settings.wallets.liveConnected")
                      : t("settings.wallets.readOnly")}
                  </span>

                  {wallet.type === "tracked" && (
                    <button
                      type="button"
                      onClick={() =>
                        removeTrackedWallet(
                          wallet.address,
                          connectedAddress,
                          isConnected,
                        )
                      }
                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-brand hover:bg-brand/10 dark:text-[#6D7A86] dark:hover:text-brand dark:hover:bg-brand/10 transition-colors duration-150 cursor-pointer"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="mt-6 pt-6 border-t border-line space-y-3"
        >
          <h4 className="text-xs font-bold text-ink-primary">
            {t("settings.wallets.addFormTitle")}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder={t("settings.wallets.labelPlaceholder")}
              value={inputLabel}
              onChange={(e) => setInputLabel(e.target.value)}
              className="w-full bg-[#F3F4F6] dark:bg-[#21242B] px-3 py-2 text-base rounded-xl border border-transparent focus:border-brand/30 outline-none text-ink-primary"
            />
            <input
              type="text"
              placeholder={t("settings.wallets.addressPlaceholder")}
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              className="w-full bg-[#F3F4F6] dark:bg-[#21242B] px-3 py-2 text-base font-mono rounded-xl border border-transparent focus:border-brand/30 outline-none text-ink-primary"
            />
          </div>

          {errorText && (
            <p className="text-[10px] text-brand tracking-wide font-medium">
              {errorText}
            </p>
          )}

          <button
            type="submit"
            disabled={remainingSlots === 0}
            className={`
              mt-2 w-full rounded-xl py-2.5 text-sm font-medium transition duration-200 cursor-pointer shadow-sm text-center
              ${
                remainingSlots === 0
                  ? "bg-surface-subtle text-ink-muted cursor-not-allowed"
                  : "bg-brand text-white hover:bg-brand-hover hover:shadow-[0_4px_12px_rgba(230,32,88,0.2)]"
              }
            `}
          >
            {remainingSlots === 0
              ? t("settings.wallets.limitReached", {
                  current: totalCount,
                  max: maxSlots,
                })
              : t("settings.wallets.connectAction", {
                  current: totalCount,
                  remaining: remainingSlots,
                })}
          </button>
        </form>
      </Card>

      <Card
        title={t("settings.cards.walletCapacity")}
        subtitle={t("settings.descriptions.walletCapacity")}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="p-2 sm:p-3 rounded-xl bg-[#F3F4F6] dark:bg-[#21242B]">
              <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] dark:text-[#6D7A86]">
                {t("settings.wallets.maximum")}
              </p>
              <p className="text-base sm:text-lg font-semibold text-ink-primary mt-0.5">
                {maxSlots}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-[#F3F4F6] dark:bg-[#21242B]">
              <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] dark:text-[#6D7A86]">
                {t("settings.wallets.tracked")}
              </p>
              <p className="text-base sm:text-lg font-semibold text-ink-primary mt-0.5">
                {totalCount}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-[#F3F4F6] dark:bg-[#21242B]">
              <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] dark:text-[#6D7A86]">
                {t("settings.wallets.remainingSlots")}
              </p>
              <p className="text-base sm:text-lg font-semibold text-brand mt-0.5">
                {remainingSlots}
              </p>
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-surface-subtle overflow-hidden">
            <div
              className="h-2 rounded-full bg-brand transition-all duration-500 ease-out"
              style={{ width: `${(totalCount / maxSlots) * 100}%` }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
