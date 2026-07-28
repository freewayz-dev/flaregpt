import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { useOutletContext } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  WalletIcon,
  TrashIcon,
  CheckIcon,
  PencilIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useAddWatchlistWallet, useRemoveWatchlistWallet } from "@/hooks/queries/useWatchlistQueries";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { shortenAddress } from "@/utils/address";
import CustomSelect from "@/components/common/CustomSelect";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";

// Click once to arm, click again (or wait ~3s) to cancel — an inline,
// unobtrusive confirm rather than a modal, since removing a watchlist
// entry is reversible-in-spirit (re-adding takes one form submit) but
// still not something a single stray tap should do silently.
const CONFIRM_WINDOW_MS = 3000;

// Search only earns its place once scanning the list by eye stops being
// faster than typing — below this, showing a search box is just another
// control competing for attention on an already-short list.
const SEARCH_THRESHOLD = 6;

// Matches this row's actual rendered height (content + the 12px gap that
// used to come from `space-y-3`, now applied per-row instead since
// absolutely-positioned virtual items can't rely on a parent's gap
// utility). Every row uses `truncate` specifically so long labels/addresses
// can never grow a row taller than this and desync it from the estimate
// (see ActivityFeed.jsx for the same constraint on transaction rows).
const ROW_HEIGHT = 76;

// Caps how tall the tracked-wallet list can grow before it scrolls
// internally, rather than pushing the add-wallet form and every card below
// it further down the page as the list grows toward "dozens or hundreds" —
// smaller on mobile, where vertical space is scarcer to begin with.
const LIST_MAX_HEIGHT_CLASS = "max-h-[45vh] sm:max-h-[420px]";
// Used only to decide whether the edge fade is warranted (an approximate
// "would this actually overflow" check, not a precise measurement) — a
// short list that fits within the cap shouldn't fade its own last row.
const APPROX_VISIBLE_ROWS = 5;

function WalletListRow({
  wallet,
  hasSession,
  editingAddress,
  editValue,
  setEditValue,
  editInputRef,
  startRename,
  commitRename,
  setEditingAddress,
  confirmingAddress,
  onRemoveClick,
  removePending,
  t,
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F3F4F6] dark:bg-[#21242B] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
      <div className="min-w-0 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white dark:bg-[#121214] text-[#475569] dark:text-[#6D7A86]">
          <WalletIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          {!hasSession && editingAddress === wallet.address ? (
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
              className="block w-full max-w-[220px] bg-transparent px-0 py-0 text-base sm:text-sm leading-5 font-medium text-ink-primary border-b border-brand/40 outline-none"
            />
          ) : (
            <p className="text-sm font-medium text-ink-primary truncate">{wallet.label}</p>
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
          {wallet.type === "connected" ? t("settings.wallets.liveConnected") : t("settings.wallets.readOnly")}
        </span>

        {wallet.type === "tracked" && (
          <>
            {!hasSession &&
              (editingAddress === wallet.address ? (
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
              ))}

            <button
              type="button"
              onClick={() => onRemoveClick(wallet.address)}
              disabled={removePending}
              title={confirmingAddress === wallet.address ? t("settings.wallets.confirmRemove") : t("settings.wallets.remove")}
              className={`flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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
  );
}

export default function Wallets() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { openWalletModal } = useOutletContext();
  const { hasSession, isCurrentWalletSignedIn, isAuthenticating, signIn } = useAuthStatus();

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

  // Only ever actually called when hasSession — see handleSave/handleRemoveClick.
  const addMutation = useAddWatchlistWallet();
  const removeMutation = useRemoveWatchlistWallet();

  const [inputAddress, setInputAddress] = useState("");
  const [inputLabel, setInputLabel] = useState("");
  const [errorText, setErrorText] = useState("");
  const [confirmingAddress, setConfirmingAddress] = useState(null);
  const confirmTimerRef = useRef(null);

  // Inline rename — guest-only. There's no backend endpoint yet to persist
  // a rename for an authenticated account (the add endpoint takes a
  // nickname *at creation*, but nothing updates one afterward), so this
  // entire flow simply never renders once signed in (see the JSX below) —
  // hidden rather than shown-disabled, since there's nothing a disabled
  // pencil icon would explain that hiding it doesn't already make obvious.
  const [editingAddress, setEditingAddress] = useState(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");

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

  const handleRemoveClick = async (address) => {
    if (confirmingAddress === address) {
      clearTimeout(confirmTimerRef.current);
      setConfirmingAddress(null);
      if (hasSession) {
        try {
          await removeMutation.mutateAsync(address);
        } catch {
          // Best-effort, same as the guest path (a synchronous removal
          // that can't "fail") — a 404 just means it's already gone, and
          // any other error simply leaves it in the list rather than
          // surfacing its own error UI for a background cleanup action.
        }
      } else {
        removeTrackedWallet(address, connectedAddress, isConnected);
      }
      return;
    }
    setConfirmingAddress(address);
    clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => setConfirmingAddress(null), CONFIRM_WINDOW_MS);
  };

  const totalCount = trackedWallets.length;
  const isUnlimited = !Number.isFinite(maxSlots);

  // The Primary (connected) wallet is pinned outside the searchable/
  // scrollable area entirely — there's only ever one, it's the row you
  // most need to still see at a glance no matter how far you've scrolled
  // into a long watchlist, and search filtering it away would be a strange
  // way to lose track of your own wallet.
  const primaryWallet = allWallets.find((w) => w.type === "connected");
  const trackedList = useMemo(() => allWallets.filter((w) => w.type === "tracked"), [allWallets]);

  const filteredTracked = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return trackedList;
    return trackedList.filter(
      (w) => w.label.toLowerCase().includes(q) || w.address.toLowerCase().includes(q),
    );
  }, [trackedList, searchQuery]);

  const scrollParentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: filteredTracked.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const isScrollable = trackedList.length > APPROX_VISIBLE_ROWS;
  const showSearch = trackedList.length > SEARCH_THRESHOLD;

  const walletSelectOptions = allWallets.map((w) => ({
    value: w.address,
    name: `${w.label} · ${shortenAddress(w.address)}`,
  }));
  const selectedDefaultWallet = preferredDefaultAddress
    ? (walletSelectOptions.find((o) => o.value === preferredDefaultAddress) ?? null)
    : { value: "", name: t("settings.wallets.noDefaultSelected") };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorText("");

    if (!inputAddress.startsWith("0x") || inputAddress.length !== 42) {
      setErrorText(t("settings.wallets.invalidAddress"));
      return;
    }

    if (hasSession) {
      try {
        await addMutation.mutateAsync({
          address: inputAddress.trim(),
          nickname: inputLabel.trim() || null,
        });
      } catch (error) {
        setErrorText(
          error?.response?.status === 409
            ? t("settings.wallets.duplicateAddress")
            : t("settings.wallets.registrationFailed"),
        );
        return;
      }
    } else {
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
    }

    setInputAddress("");
    setInputLabel("");
  };

  const handleSignInPrompt = () => {
    if (!isConnected) {
      openWalletModal();
    } else if (!isCurrentWalletSignedIn) {
      signIn();
    }
  };

  const submitLabel = remainingSlots === 0
    ? t("settings.wallets.limitReached", { current: totalCount, max: maxSlots })
    : isUnlimited
      ? t("settings.wallets.connectActionUnlimited", { current: totalCount })
      : t("settings.wallets.connectAction", { current: totalCount, remaining: remainingSlots });

  const isSubmitDisabled = remainingSlots === 0 || (hasSession && addMutation.isPending);

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
              {isUnlimited
                ? t("settings.wallets.noLimit")
                : t("settings.wallets.limit", { max: maxSlots })}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {primaryWallet && (
              <WalletListRow
                wallet={primaryWallet}
                hasSession={hasSession}
                editingAddress={editingAddress}
                editValue={editValue}
                setEditValue={setEditValue}
                editInputRef={editInputRef}
                startRename={startRename}
                commitRename={commitRename}
                setEditingAddress={setEditingAddress}
                confirmingAddress={confirmingAddress}
                onRemoveClick={handleRemoveClick}
                removePending={false}
                t={t}
              />
            )}

            {trackedList.length > 0 && (
              <div className="space-y-2">
                {showSearch && (
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("settings.wallets.searchPlaceholder", { count: trackedList.length })}
                      className="w-full rounded-xl bg-surface-inset pl-9 pr-3 py-2 text-sm text-ink-primary placeholder-ink-muted outline-none focus-within:outline focus-within:outline-2 focus-within:outline-brand/50 focus-within:outline-offset-2"
                    />
                  </div>
                )}

                {filteredTracked.length === 0 ? (
                  <p className="py-6 text-center text-xs text-ink-muted">
                    {t("settings.wallets.noSearchResults")}
                  </p>
                ) : (
                  <div
                    ref={scrollParentRef}
                    data-testid="watchlist-scroll-container"
                    className={`${LIST_MAX_HEIGHT_CLASS} overflow-y-auto overscroll-contain scrollbar-none`}
                    style={
                      isScrollable
                        ? {
                            WebkitMaskImage:
                              "linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)",
                            maskImage:
                              "linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)",
                          }
                        : undefined
                    }
                  >
                    <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                      {virtualizer.getVirtualItems().map((virtualRow) => {
                        const wallet = filteredTracked[virtualRow.index];
                        return (
                          <div
                            key={wallet.address}
                            className="pb-3"
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: virtualRow.size,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <WalletListRow
                              wallet={wallet}
                              hasSession={hasSession}
                              editingAddress={editingAddress}
                              editValue={editValue}
                              setEditValue={setEditValue}
                              editInputRef={editInputRef}
                              startRename={startRename}
                              commitRename={commitRename}
                              setEditingAddress={setEditingAddress}
                              confirmingAddress={confirmingAddress}
                              onRemoveClick={handleRemoveClick}
                              removePending={removeMutation.isPending && removeMutation.variables === wallet.address}
                              t={t}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
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
            disabled={isSubmitDisabled}
            className={`
              mt-2 w-full rounded-xl py-2.5 text-sm font-medium transition duration-200 cursor-pointer shadow-sm text-center
              ${
                isSubmitDisabled
                  ? "bg-surface-subtle text-ink-muted cursor-not-allowed"
                  : "bg-brand text-white hover:bg-brand-hover hover:shadow-[0_4px_12px_rgba(230,32,88,0.2)]"
              }
            `}
          >
            {submitLabel}
          </button>

          {/* A quiet upgrade nudge, not a blocking prompt — only ever shown
              to a guest who's actually hit the cap, framed around what
              signing in adds rather than what being a guest lacks. */}
          {!hasSession && remainingSlots === 0 && (
            <div className="rounded-xl bg-brand/5 border border-brand/15 p-3 space-y-2">
              <p className="text-xs font-medium text-ink-primary">
                {t("settings.wallets.guestLimitTitle")}
              </p>
              <ul className="text-[11px] text-ink-secondary space-y-1 list-disc list-inside marker:text-brand/50">
                <li>{t("settings.wallets.guestLimitBenefitSync")}</li>
                <li>{t("settings.wallets.guestLimitBenefitMore")}</li>
                <li>{t("settings.wallets.guestLimitBenefitBackup")}</li>
              </ul>
              <button
                type="button"
                onClick={handleSignInPrompt}
                disabled={isAuthenticating}
                className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {!isConnected
                  ? t("navbar.connectWallet")
                  : isAuthenticating
                    ? t("navbar.signingIn")
                    : t("navbar.signIn")}
                {" →"}
              </button>
            </div>
          )}
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
                {isUnlimited ? "∞" : maxSlots}
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
                {isUnlimited ? "∞" : remainingSlots}
              </p>
            </div>
          </div>

          {!isUnlimited && (
            <div className="h-2 w-full rounded-full bg-surface-subtle overflow-hidden">
              <div
                className="h-2 rounded-full bg-brand transition-all duration-500 ease-out"
                style={{ width: `${(totalCount / maxSlots) * 100}%` }}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
