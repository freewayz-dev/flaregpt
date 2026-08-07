import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useConnection } from "wagmi";
import { useOutletContext } from "react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "react-toastify";
import { isAxiosError } from "axios";
import {
  WalletIcon,
  TrashIcon,
  CheckIcon,
  PencilIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

import { useDerivedWalletHub, type WalletHubEntry } from "@/store/useWalletHubStore";
import {
  useAddWatchlistWallet,
  useRemoveWatchlistWallet,
  useUpdateWatchlistWallet,
} from "@/hooks/queries/useWatchlistQueries";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import Card from "@/pages/Settings/components/Card";
import type { DashboardOutletContext } from "@/components/layout/DashboardLayout";

// Click once to arm, click again (or wait ~3s) to cancel — an inline,
// unobtrusive confirm rather than a modal, since removing a watchlist
// entry is reversible-in-spirit (re-adding takes one form submit) but
// still not something a single stray tap should do silently.
const CONFIRM_WINDOW_MS = 3000;

// Search only earns its place once scanning the list by eye stops being
// faster than typing — below this, showing a search box is just another
// control competing for attention on an already-short list.
const SEARCH_THRESHOLD = 6;

// Only an *initial* guess for react-virtual's layout math before it's
// measured a real row (roughly a display-mode row's height). Unlike
// ActivityFeed.jsx — whose transaction rows are genuinely fixed-height and
// rely on the estimate alone — a wallet row's actual height varies (editing
// adds a second input plus an optional error line), so every row here is
// wired to `virtualizer.measureElement` instead, which corrects the real
// height via ResizeObserver. Skipping that and trusting this estimate for
// a *taller* editing row is exactly what silently clipped the error
// message behind the next row's opaque background during testing.
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

// The backend distinguishes a duplicate address from a duplicate nickname
// only through this endpoint's own free-text `detail` — both cases share
// the same 409 status, and the wording is the only thing that tells them
// apart (confirmed live against both add and edit): "This address is
// already on your watchlist." vs "Nickname '<name>' is already used for
// another watched wallet." Showing the address-duplicate message for an
// actual nickname collision (what a flat "409 -> duplicateAddress" mapping
// used to do) is exactly the bug this exists to fix. If the backend ever
// adds a distinct error code, that becomes the primary check and this
// text sniff becomes the fallback.
function interpretWatchlistError(error: unknown, t: TFunction) {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  const detail = (isAxiosError(error) ? error.response?.data?.detail : "") || "";

  if (status === 409) {
    return /nickname/i.test(detail)
      ? t("settings.wallets.duplicateNickname")
      : t("settings.wallets.duplicateAddress");
  }
  if (status === 404) {
    return t("settings.wallets.notFoundError");
  }
  if (status === 422) {
    return t("settings.wallets.invalidAddress");
  }
  return t("settings.wallets.registrationFailed");
}

interface WalletListRowProps {
  wallet: WalletHubEntry;
  hasSession: boolean;
  // A signed-in wallet's add/rename/remove all hit the real backend
  // (useWatchlistQueries.ts) — true only when signed in AND offline, so a
  // guest's purely-local watchlist (see addTrackedWallet/renameTrackedWallet/
  // removeTrackedWallet in Wallets.tsx's own handlers) is never touched by
  // this at all.
  offlineBlocked: boolean;
  isEditing: boolean;
  editNickname: string;
  setEditNickname: (value: string) => void;
  editAddress: string;
  setEditAddress: (value: string) => void;
  nicknameInputRef: RefObject<HTMLInputElement | null>;
  editError: string;
  isSaving: boolean;
  onStartEdit: (wallet: WalletHubEntry) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  confirmingAddress: string | null;
  onRemoveClick: (address: string) => void;
  removePending: boolean;
  t: TFunction;
}

function WalletListRow({
  wallet,
  hasSession,
  offlineBlocked,
  isEditing,
  editNickname,
  setEditNickname,
  editAddress,
  setEditAddress,
  nicknameInputRef,
  editError,
  isSaving,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  confirmingAddress,
  onRemoveClick,
  removePending,
  t,
}: WalletListRowProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommitEdit();
    } else if (e.key === "Escape") {
      onCancelEdit();
    }
  };

  return (
    <div className="rounded-xl bg-[#F3F4F6] dark:bg-[#21242B] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3 flex-1">
          <div className="p-2 rounded-lg bg-white dark:bg-[#121214] text-[#475569] dark:text-[#6D7A86] shrink-0">
            <WalletIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="space-y-1.5 max-w-[280px]">
                <input
                  ref={nicknameInputRef}
                  type="text"
                  aria-label={t("settings.wallets.nicknameLabel")}
                  aria-describedby={editError ? `settings-wallets-edit-error-${wallet.address}` : undefined}
                  aria-invalid={Boolean(editError)}
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSaving}
                  maxLength={32}
                  placeholder={t("settings.wallets.labelPlaceholder")}
                  className="block w-full bg-white dark:bg-[#121214] rounded-lg px-2 py-1.5 text-sm font-medium text-ink-primary outline-none border border-transparent focus:border-brand/40 disabled:opacity-60"
                />
                {hasSession && (
                  <input
                    type="text"
                    aria-label={t("settings.wallets.addressLabel")}
                    aria-describedby={editError ? `settings-wallets-edit-error-${wallet.address}` : undefined}
                    aria-invalid={Boolean(editError)}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSaving}
                    placeholder={t("settings.wallets.addressPlaceholder")}
                    className="block w-full bg-white dark:bg-[#121214] rounded-lg px-2 py-1.5 text-xs font-mono text-ink-secondary outline-none border border-transparent focus:border-brand/40 disabled:opacity-60"
                  />
                )}
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-ink-primary truncate">{wallet.label}</p>
                <p className="text-xs font-mono text-[#94A3B8] dark:text-[#6D7A86] mt-0.5 truncate">
                  {wallet.address}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isEditing && (
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                wallet.type === "connected"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-amber-500/10 text-amber-500"
              }`}
            >
              {wallet.type === "connected" ? t("settings.wallets.liveConnected") : t("settings.wallets.readOnly")}
            </span>
          )}

          {wallet.type === "tracked" && (
            <>
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={onCommitEdit}
                    disabled={isSaving || offlineBlocked}
                    title={offlineBlocked ? t("settings.wallets.offline") : t("settings.wallets.saveEdit")}
                    className="flex items-center rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckIcon className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onCancelEdit}
                    disabled={isSaving}
                    title={t("settings.wallets.cancelRename")}
                    className="flex items-center rounded-lg p-1.5 text-[#94A3B8] hover:text-ink-primary hover:bg-surface-inset dark:text-[#6D7A86] transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartEdit(wallet)}
                  title={t("settings.wallets.rename")}
                  className="flex items-center rounded-lg p-1.5 text-[#94A3B8] hover:text-brand hover:bg-brand/10 dark:text-[#6D7A86] dark:hover:text-brand dark:hover:bg-brand/10 transition-colors duration-150 cursor-pointer"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => onRemoveClick(wallet.address)}
                  disabled={removePending || offlineBlocked}
                  title={
                    offlineBlocked
                      ? t("settings.wallets.offline")
                      : confirmingAddress === wallet.address
                        ? t("settings.wallets.confirmRemove")
                        : t("settings.wallets.remove")
                  }
                  className={`flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    confirmingAddress === wallet.address
                      ? "bg-red-500/10 text-red-500"
                      : "text-[#94A3B8] hover:text-brand hover:bg-brand/10 dark:text-[#6D7A86] dark:hover:text-brand dark:hover:bg-brand/10"
                  }`}
                >
                  {removePending ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : confirmingAddress === wallet.address ? (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{t("settings.wallets.confirmRemove")}</span>
                    </>
                  ) : (
                    <TrashIcon className="h-4 w-4" />
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isEditing && editError && (
        <p
          id={`settings-wallets-edit-error-${wallet.address}`}
          className="mt-2 text-[10px] text-brand tracking-wide font-medium"
        >
          {editError}
        </p>
      )}
    </div>
  );
}

export default function Wallets() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { openWalletModal } = useOutletContext<DashboardOutletContext>();
  const { hasSession, isCurrentWalletSignedIn, isAuthenticating, signIn } = useAuthStatus();
  const isOnline = useOnlineStatus();
  // Add/rename/remove all fall through to a purely local path for a guest
  // (addTrackedWallet/renameTrackedWallet/removeTrackedWallet below) — only
  // the signed-in path calls the real watchlist API, so only that path
  // needs blocking while offline.
  const offlineBlocked = hasSession && !isOnline;

  const {
    allWallets,
    trackedWallets,
    addTrackedWallet,
    removeTrackedWallet,
    renameTrackedWallet,
    maxSlots,
    remainingSlots,
    watchlistIsError,
    refetchWatchlist,
  } = useDerivedWalletHub(connectedAddress, isConnected);

  // Only ever actually called when hasSession — see handleSave/handleRemoveClick/commitEdit.
  const addMutation = useAddWatchlistWallet();
  const removeMutation = useRemoveWatchlistWallet();
  const updateMutation = useUpdateWatchlistWallet();

  const [inputAddress, setInputAddress] = useState("");
  const [inputLabel, setInputLabel] = useState("");
  const [errorText, setErrorText] = useState("");
  const [confirmingAddress, setConfirmingAddress] = useState<string | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [removeAnnouncement, setRemoveAnnouncement] = useState("");
  const previousConfirmingAddressRef = useRef<string | null>(null);

  // The wallet currently in edit mode, snapshotted at the moment editing
  // started — comparing against this (rather than re-deriving from
  // `allWallets`) is what lets commitEdit send only the fields that
  // actually changed. Address editing is authenticated-only (the guest
  // list has no server identity to repoint — see useWalletHubStore.js —
  // so "changing" a local entry's address is just remove-and-re-add);
  // nickname editing works for both.
  const [editingWallet, setEditingWallet] = useState<WalletHubEntry | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editError, setEditError] = useState("");
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => () => clearTimeout(confirmTimerRef.current ?? undefined), []);

  // The "click again to confirm" arm/disarm cycle changes what the Remove
  // button *means* without changing anything a screen reader user would
  // otherwise notice — the button's accessible name doesn't update (see
  // WalletListRow) and nothing else on the page moves. This announces the
  // arm transition explicitly, same pattern as the FlareGPT response-ready
  // announcer: only on a genuine state change, not on every render. The
  // disarm transition is deliberately NOT announced here — it fires both on
  // a real cancel (timeout/click-away) and on the second confirming click
  // that actually performs the removal, and those two cases need different
  // wording; without a way to tell them apart from this state alone, saying
  // nothing is less misleading than guessing wrong.
  useEffect(() => {
    if (previousConfirmingAddressRef.current === confirmingAddress) return;
    previousConfirmingAddressRef.current = confirmingAddress;

    if (confirmingAddress) {
      const wallet = allWallets.find((w) => w.address === confirmingAddress);
      const name = wallet?.label || confirmingAddress;
      setRemoveAnnouncement(t("settings.wallets.removeArmed", { name }));
    }
  }, [confirmingAddress, allWallets, t]);

  useEffect(() => {
    if (editingWallet) nicknameInputRef.current?.focus();
  }, [editingWallet]);

  const startEdit = (wallet: WalletHubEntry) => {
    setEditingWallet(wallet);
    setEditNickname(wallet.label);
    setEditAddress(wallet.address);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingWallet(null);
    setEditError("");
  };

  const commitEdit = async () => {
    if (updateMutation.isPending) return;
    // Only reachable via a row's own Save button, which only renders while
    // that row is in edit mode — i.e. exactly when `editingWallet` is set
    // to that row's wallet (see WalletListRow/startEdit).
    if (!editingWallet) return;
    setEditError("");

    // The Save button is already disabled via `offlineBlocked` — this
    // guards the same Enter-key path (see WalletListRow's onKeyDown),
    // which calls this directly and doesn't go through that button at all.
    if (offlineBlocked) {
      setEditError(t("settings.wallets.offline"));
      return;
    }

    const trimmedNickname = editNickname.trim();

    if (!hasSession) {
      if (trimmedNickname) renameTrackedWallet(editingWallet.address, trimmedNickname);
      setEditingWallet(null);
      return;
    }

    const trimmedAddress = editAddress.trim();
    if (!trimmedAddress.startsWith("0x") || trimmedAddress.length !== 42) {
      setEditError(t("settings.wallets.invalidAddress"));
      return;
    }

    const payload: { nickname?: string | null; newAddress?: string } = {};
    if (trimmedNickname !== editingWallet.label) payload.nickname = trimmedNickname || null;
    if (trimmedAddress.toLowerCase() !== editingWallet.address.toLowerCase()) {
      payload.newAddress = trimmedAddress;
    }

    if (Object.keys(payload).length === 0) {
      setEditingWallet(null);
      return;
    }

    try {
      await updateMutation.mutateAsync({ address: editingWallet.address, ...payload });
      setEditingWallet(null);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        // The row this edit targeted is already gone (removed elsewhere,
        // another tab, another device) — nothing to save over. Refreshing
        // the list is more useful here than an inline error next to a row
        // that's about to disappear anyway.
        toast.error(t("settings.wallets.notFoundError"));
        setEditingWallet(null);
        return;
      }
      setEditError(interpretWatchlistError(error, t));
    }
  };

  const handleRemoveClick = async (address: string) => {
    if (confirmingAddress === address) {
      clearTimeout(confirmTimerRef.current ?? undefined);
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
    clearTimeout(confirmTimerRef.current ?? undefined);
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

  const scrollParentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredTracked.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const isScrollable = trackedList.length > APPROX_VISIBLE_ROWS;
  const showSearch = trackedList.length > SEARCH_THRESHOLD;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!inputAddress.startsWith("0x") || inputAddress.length !== 42) {
      setErrorText(t("settings.wallets.invalidAddress"));
      return;
    }

    // Same "the button is already disabled, this guards the Enter-to-
    // submit path" reasoning as commitEdit above — a <form>'s onSubmit
    // still fires from the keyboard even while its submit button is
    // disabled.
    if (offlineBlocked) {
      setErrorText(t("settings.wallets.offline"));
      return;
    }

    if (hasSession) {
      try {
        await addMutation.mutateAsync({
          address: inputAddress.trim(),
          nickname: inputLabel.trim() || null,
        });
      } catch (error) {
        setErrorText(interpretWatchlistError(error, t));
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
    : hasSession && addMutation.isPending
      ? t("settings.wallets.adding")
      : offlineBlocked
        ? t("settings.wallets.offline")
        : isUnlimited
          ? t("settings.wallets.connectActionUnlimited", { current: totalCount })
          : t("settings.wallets.connectAction", { current: totalCount, remaining: remainingSlots });

  const isSubmitDisabled = remainingSlots === 0 || (hasSession && addMutation.isPending) || offlineBlocked;

  return (
    <div className="space-y-6">
      <div role="status" aria-live="polite" className="sr-only">
        {removeAnnouncement}
      </div>
      <Card
        title={t("settings.cards.connectedWallets")}
        subtitle={t("settings.wallets.manageSubtitle")}
      >
        {watchlistIsError && allWallets.length === 0 ? (
          // Checked before the genuine-empty branch below — a signed-in
          // user whose watchlist fetch failed (or is offline-paused) was
          // previously shown the exact same "no wallets tracked yet" copy
          // as someone who truly has none, with no way to tell the two
          // apart or retry.
          <div className="py-8 text-center rounded-2xl bg-surface-subtle px-4">
            <p className="text-sm font-medium text-ink-primary">
              {t("settings.wallets.loadFailed")}
            </p>
            <p className="mt-0.5 text-xs text-[#475569] dark:text-[#6D7A86]">
              {t("dashboard.common.networkHiccup")}
            </p>
            <button
              type="button"
              onClick={() => refetchWatchlist()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              {t("dashboard.common.retry")}
            </button>
          </div>
        ) : allWallets.length === 0 ? (
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
                offlineBlocked={offlineBlocked}
                isEditing={false}
                editNickname={editNickname}
                setEditNickname={setEditNickname}
                editAddress={editAddress}
                setEditAddress={setEditAddress}
                nicknameInputRef={nicknameInputRef}
                editError=""
                isSaving={false}
                onStartEdit={startEdit}
                onCommitEdit={commitEdit}
                onCancelEdit={cancelEdit}
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
                      id="settings-wallets-search"
                      name="search"
                      aria-label={t("settings.wallets.searchPlaceholder", { count: trackedList.length })}
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
                        const isEditing = editingWallet?.address === wallet.address;
                        return (
                          <div
                            key={wallet.address}
                            ref={virtualizer.measureElement}
                            data-index={virtualRow.index}
                            className="pb-3"
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <WalletListRow
                              wallet={wallet}
                              hasSession={hasSession}
                              offlineBlocked={offlineBlocked}
                              isEditing={isEditing}
                              editNickname={editNickname}
                              setEditNickname={setEditNickname}
                              editAddress={editAddress}
                              setEditAddress={setEditAddress}
                              nicknameInputRef={nicknameInputRef}
                              editError={isEditing ? editError : ""}
                              isSaving={isEditing && updateMutation.isPending}
                              onStartEdit={startEdit}
                              onCommitEdit={commitEdit}
                              onCancelEdit={cancelEdit}
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
              id="settings-wallets-add-label"
              name="nickname"
              aria-label={t("settings.wallets.nicknameLabel")}
              aria-describedby={errorText ? "settings-wallets-add-error" : undefined}
              aria-invalid={Boolean(errorText)}
              placeholder={t("settings.wallets.labelPlaceholder")}
              value={inputLabel}
              onChange={(e) => setInputLabel(e.target.value)}
              maxLength={32}
              disabled={hasSession && addMutation.isPending}
              className="w-full bg-[#F3F4F6] dark:bg-[#21242B] px-3 py-2 text-base rounded-xl border border-transparent focus:border-brand/30 outline-none text-ink-primary disabled:opacity-60"
            />
            <input
              type="text"
              id="settings-wallets-add-address"
              name="address"
              aria-label={t("settings.wallets.addressLabel")}
              aria-describedby={errorText ? "settings-wallets-add-error" : undefined}
              aria-invalid={Boolean(errorText)}
              placeholder={t("settings.wallets.addressPlaceholder")}
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              disabled={hasSession && addMutation.isPending}
              className="w-full bg-[#F3F4F6] dark:bg-[#21242B] px-3 py-2 text-base font-mono rounded-xl border border-transparent focus:border-brand/30 outline-none text-ink-primary disabled:opacity-60"
            />
          </div>

          {errorText && (
            <p id="settings-wallets-add-error" className="text-[10px] text-brand tracking-wide font-medium">
              {errorText}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`
              mt-2 w-full rounded-xl py-2.5 text-sm font-medium transition duration-200 cursor-pointer shadow-sm text-center flex items-center justify-center gap-2
              ${
                isSubmitDisabled
                  ? "bg-surface-subtle text-ink-muted cursor-not-allowed"
                  : "bg-brand text-white hover:bg-brand-hover hover:shadow-[0_4px_12px_rgba(230,32,88,0.2)]"
              }
            `}
          >
            {hasSession && addMutation.isPending && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
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
            <div
              role="progressbar"
              aria-valuenow={totalCount}
              aria-valuemin={0}
              aria-valuemax={maxSlots}
              aria-label={t("settings.cards.walletCapacity")}
              className="h-2 w-full rounded-full bg-surface-subtle overflow-hidden"
            >
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
