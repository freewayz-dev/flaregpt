import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { WalletIcon, TrashIcon, CheckIcon, PencilIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { shortenAddress } from "@/utils/address";
import CustomSelect from "@/components/common/CustomSelect";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";

// Click once to arm, click again (or wait ~3s) to cancel — an inline,
// unobtrusive confirm rather than a modal, since removing a watchlist
// entry is reversible-in-spirit (re-adding takes one form submit) but
// still not something a single stray tap should do silently.
const CONFIRM_WINDOW_MS = 3000;

export default function Wallets() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();

  const {
    allWallets,
    trackedWallets,
    addTrackedWallet,
    removeTrackedWallet,
    renameTrackedWallet,
    preferredDefaultAddress,
    setPreferredDefaultAddress,
    maxSlots,
    remainingSlots,
  } = useDerivedWalletHub(connectedAddress, isConnected);

  const [inputAddress, setInputAddress] = useState("");
  const [inputLabel, setInputLabel] = useState("");
  const [errorText, setErrorText] = useState("");
  const [confirmingAddress, setConfirmingAddress] = useState(null);
  const confirmTimerRef = useRef(null);

  // Inline rename — click the pencil, the label becomes a text input in
  // place (no modal): this is a one-word edit to data the user already
  // typed in themselves via the add-wallet form below, so a full dialog
  // would be more ceremony than the task warrants. Enter or blur saves,
  // Escape cancels; an empty value is ignored rather than saved, so a
  // wallet never ends up with a blank label.
  const [editingAddress, setEditingAddress] = useState(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef(null);

  useEffect(() => () => clearTimeout(confirmTimerRef.current), []);

  useEffect(() => {
    if (editingAddress) editInputRef.current?.focus();
  }, [editingAddress]);

  const startRename = (wallet) => {
    setEditingAddress(wallet.address);
    setEditValue(wallet.label);
  };

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed) renameTrackedWallet(editingAddress, trimmed);
    setEditingAddress(null);
  };

  const handleRemoveClick = (address) => {
    if (confirmingAddress === address) {
      clearTimeout(confirmTimerRef.current);
      setConfirmingAddress(null);
      removeTrackedWallet(address, connectedAddress, isConnected);
      return;
    }
    setConfirmingAddress(address);
    clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => setConfirmingAddress(null), CONFIRM_WINDOW_MS);
  };

  const totalCount = trackedWallets.length;

  const walletSelectOptions = allWallets.map((w) => ({
    value: w.address,
    name: `${w.label} · ${shortenAddress(w.address)}`,
  }));
  const selectedDefaultWallet = preferredDefaultAddress
    ? (walletSelectOptions.find((o) => o.value === preferredDefaultAddress) ?? null)
    : { value: "", name: t("settings.wallets.noDefaultSelected") };

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
                  <div className="min-w-0 flex-1">
                    {editingAddress === wallet.address ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitRename();
                          } else if (e.key === "Escape") {
                            setEditingAddress(null);
                          }
                        }}
                        className="w-full max-w-[220px] bg-white dark:bg-[#121214] px-2 py-1 text-sm font-medium text-ink-primary rounded-lg border border-brand/40 outline-none"
                      />
                    ) : (
                      <p className="text-sm font-medium text-ink-primary truncate">
                        {wallet.label}
                      </p>
                    )}
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
                    <>
                      {editingAddress === wallet.address ? (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setEditingAddress(null)}
                          title={t("settings.wallets.cancelRename")}
                          className="flex items-center rounded-lg p-1.5 text-[#94A3B8] hover:text-ink-primary hover:bg-surface-inset dark:text-[#6D7A86] transition-colors duration-150 cursor-pointer"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startRename(wallet)}
                          title={t("settings.wallets.rename")}
                          className="flex items-center rounded-lg p-1.5 text-[#94A3B8] hover:text-brand hover:bg-brand/10 dark:text-[#6D7A86] dark:hover:text-brand dark:hover:bg-brand/10 transition-colors duration-150 cursor-pointer"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveClick(wallet.address)}
                        title={
                          confirmingAddress === wallet.address
                            ? t("settings.wallets.confirmRemove")
                            : t("settings.wallets.remove")
                        }
                        className={`flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition-colors duration-150 cursor-pointer ${
                          confirmingAddress === wallet.address
                            ? "bg-red-500/10 text-red-500"
                            : "text-[#94A3B8] hover:text-brand hover:bg-brand/10 dark:text-[#6D7A86] dark:hover:text-brand dark:hover:bg-brand/10"
                        }`}
                      >
                        {confirmingAddress === wallet.address ? (
                          <>
                            <CheckIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">{t("settings.wallets.confirmRemove")}</span>
                          </>
                        ) : (
                          <TrashIcon className="h-4 w-4" />
                        )}
                      </button>
                    </>
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

      {allWallets.length > 0 && (
        <Card
          title={t("settings.cards.walletPreferences")}
          subtitle={t("settings.descriptions.walletPreferences")}
        >
          <div className="divide-y divide-divider">
            <RowItem
              icon={WalletIcon}
              title={t("settings.cards.defaultWallet")}
              description={t("settings.descriptions.defaultWallet")}
            >
              <div className="w-full sm:w-64">
                <CustomSelect
                  options={walletSelectOptions}
                  selectedValue={selectedDefaultWallet}
                  onChange={(option) => setPreferredDefaultAddress(option.value)}
                />
              </div>
            </RowItem>
          </div>
        </Card>
      )}

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
