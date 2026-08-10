import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { toast } from "react-toastify";
import { XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub, DEFAULT_TRACKED_LABEL } from "@/store/useWalletHubStore";
import { useAddWatchlistWallet } from "@/hooks/queries/useWatchlistQueries";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { isValidTrackedWalletAddress } from "@/utils/address";
import { interpretWatchlistError } from "@/utils/watchlistErrors";
import { WalletAddedToastContent } from "@/components/common/WalletAddedToastContent";

// Overview's quick-onboarding entry point for the same watchlist feature
// Settings > Wallets already owns — same store actions (addTrackedWallet
// for a guest, useAddWatchlistWallet for a signed-in user), same address
// validation (isValidTrackedWalletAddress), same error interpretation
// (interpretWatchlistError). This does not duplicate that logic, it's a
// second, smaller entry point onto it — reachable from Overview's wallet-
// dependent empty states instead of only from Settings.
//
// Deliberately NOT the ConnectWalletModal flow: adding a watchlist wallet
// here never touches wagmi's connectors, never requests a signature, and
// never calls useAuthStatus().signIn() — this is add-a-read-only-address,
// not connect-a-wallet. The one thing this DOES do that Settings' own form
// doesn't: on success, if there's no live wagmi connection right now, it
// calls switchActiveAddress so the newly tracked wallet becomes the active
// one immediately (every dashboard query is already keyed on activeAddress
// — see useDashboardQueries.ts — so this is the same mechanism the Navbar's
// own wallet switcher already uses, not a new refetch path). A connected
// wallet's own active selection is left completely alone.
interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddWalletModal({ isOpen, onClose }: AddWalletModalProps) {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { addTrackedWallet, switchActiveAddress, hasSession, remainingSlots, maxSlots } =
    useDerivedWalletHub(connectedAddress, isConnected);
  const addMutation = useAddWatchlistWallet();
  const isOnline = useOnlineStatus();
  const offlineBlocked = hasSession && !isOnline;

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);
  const [address, setAddress] = useState("");
  const [nickname, setNickname] = useState("");
  const [errorText, setErrorText] = useState("");

  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, shouldRender);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
    if (shouldRender) {
      // `preventScroll: true` is defense-in-depth on top of the
      // `createPortal` below, not a second fix for a separate problem —
      // portaling to `document.body` already removes `main` (DashboardLayout's
      // scrollable content area) from this element's real DOM ancestry, which
      // is what actually stops the browser's native "scroll the newly-focused
      // element's scrollable ancestors into view" behavior from finding and
      // scrolling it. Before the portal existed, that native behavior was the
      // trigger confirmed live: opening this modal after scrolling partway
      // down Overview left `main` scrolled to wherever the focused input
      // happened to land in normal flow, and the modal's own `fixed inset-0`
      // box rendered offset from the true viewport top as a result — a
      // `position: fixed` element was never meant to need any ancestor
      // scrolled on its behalf in the first place. Kept explicit here too so
      // this stays correct on its own even if the DOM location ever changes.
      addressInputRef.current?.focus({ preventScroll: true });
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus?.();
      previouslyFocusedRef.current = null;
    }
  }, [shouldRender]);

  // Clean slate every time this reopens — same reasoning as
  // ConnectWalletModal's own equivalent reset effect.
  useEffect(() => {
    if (!isOpen) {
      setAddress("");
      setNickname("");
      setErrorText("");
      addMutation.reset();
    }
    // addMutation is a fresh object every render (useMutation's own
    // return value) — including it would re-run this on every render
    // rather than only on isOpen changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (isOpen) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  const isSubmitting = hasSession && addMutation.isPending;
  const isLimitReached = remainingSlots === 0;
  const isSubmitDisabled = isSubmitting || isLimitReached || offlineBlocked;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText("");

    const trimmedAddress = address.trim();
    if (!isValidTrackedWalletAddress(trimmedAddress)) {
      setErrorText(t("settings.wallets.invalidAddress"));
      return;
    }

    if (offlineBlocked) {
      setErrorText(t("settings.wallets.offline"));
      return;
    }

    if (hasSession) {
      try {
        await addMutation.mutateAsync({
          address: trimmedAddress,
          nickname: nickname.trim() || null,
        });
      } catch (error) {
        setErrorText(interpretWatchlistError(error, t));
        return;
      }
    } else {
      // No hardcoded fallback label here — same reasoning as leaving
      // `label` genuinely undefined for the store to fill in itself.
      // Wallets.tsx's own guest path passes a literal "Watchlist Wallet"
      // string when the nickname is blank, but the store already has a
      // real default (DEFAULT_TRACKED_LABEL, "Watchlist Account" — see
      // useWalletHubStore.ts) that Wallets.tsx's own fallback silently
      // shadows by always passing a truthy string first. Passing
      // `undefined` here instead lets that single, already-canonical
      // default apply, rather than inventing a third near-duplicate label.
      const success = addTrackedWallet(
        trimmedAddress,
        nickname.trim() || undefined,
        connectedAddress,
        isConnected,
      );
      if (!success) {
        setErrorText(t("settings.wallets.registrationFailed"));
        return;
      }
    }

    // Requirement: the newly added wallet becomes active immediately,
    // but only when nothing is actually connected right now — a
    // connected wallet's own active selection (and everything that
    // implies: it can sign, it's the one Navbar shows as "connected")
    // is left completely untouched. Every dashboard query already keys
    // on activeAddress (useDashboardQueries.ts), so this alone is what
    // makes Overview's cards show the new wallet's data — no separate
    // refetch/invalidation needed.
    const becameActive = !isConnected;
    if (becameActive) {
      switchActiveAddress(trimmedAddress);
    }

    // A toast, not just the wallet appearing in a list somewhere the user
    // may not even be looking at (Overview's own cards update a beat
    // later, off-screen if this modal is still animating closed) — the
    // one explicit, immediate confirmation that the add actually
    // succeeded. `becameActive` tells the user *why* Overview's cards are
    // about to show real data without them having to go find the Navbar's
    // wallet switcher themselves.
    toast.success(
      <WalletAddedToastContent
        label={nickname.trim() || DEFAULT_TRACKED_LABEL}
        becameActive={becameActive}
      />,
    );

    onClose();
  };

  const submitLabel = isLimitReached
    ? t("settings.wallets.limitReached", { current: maxSlots - remainingSlots, max: maxSlots })
    : isSubmitting
      ? t("settings.wallets.adding")
      : offlineBlocked
        ? t("settings.wallets.offline")
        : t("dashboard.addWallet.submit");

  const transitionStyles = animate
    ? "translate-y-0 opacity-100 sm:scale-100"
    : "translate-y-full opacity-0 sm:translate-y-4 sm:scale-95";

  // Portaled to `document.body` — this component is rendered from
  // Dashboard/index.tsx, several levels deep inside DashboardLayout's own
  // scrollable `main` (page -> Outlet -> Dashboard -> here). Confirmed
  // live: with a plain inline render, the backdrop's own `fixed inset-0`
  // box ends up visibly offset from the true viewport top the moment the
  // page has been scrolled before the modal opens — the browser's native
  // focus-scroll behavior (see the `preventScroll` effect above) walks
  // the real DOM tree, finds `main` as a scrollable ancestor, and scrolls
  // it, and the fixed-position box's composited layer doesn't recover
  // cleanly afterward even once that scroll is undone. This is the exact
  // same class of bug already diagnosed and fixed the same way in
  // TransactionDrawer.tsx (see that file's own comment) — rendering at
  // the body level, a sibling of #root rather than a descendant of any
  // scrollable/positioned ancestor, removes the ambiguity structurally
  // instead of patching around one symptom of it.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out ${
          animate ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-wallet-modal-title"
        className={`relative w-full bg-surface-card border border-[#E5E7EB] dark:border-none p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl transition-all duration-200 ease-out rounded-t-2xl max-w-none transform-gpu sm:relative sm:rounded-2xl sm:max-w-md sm:pb-5 ${transitionStyles}`}
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-300 dark:bg-zinc-800 sm:hidden" />

        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div>
            <h3 id="add-wallet-modal-title" className="text-sm font-bold text-ink-primary">
              {t("dashboard.addWallet.title")}
            </h3>
            <p className="text-[11px] text-ink-secondary mt-0.5">
              {t("dashboard.addWallet.subtitle")}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t("connectModal.close")}
            title={t("connectModal.close")}
            className="relative rounded-lg p-1 text-ink-secondary hover:bg-surface-subtle transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 before:content-[''] before:absolute before:-inset-2"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="overview-add-wallet-address" className="sr-only">
              {t("settings.wallets.addressLabel")}
            </label>
            <input
              ref={addressInputRef}
              type="text"
              id="overview-add-wallet-address"
              name="address"
              aria-describedby={errorText ? "overview-add-wallet-error" : undefined}
              aria-invalid={Boolean(errorText)}
              placeholder={t("settings.wallets.addressPlaceholder")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#F3F4F6] dark:bg-[#21242B] px-3 py-2 text-base font-mono rounded-xl border border-transparent focus:border-brand/30 outline-none text-ink-primary disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="overview-add-wallet-nickname" className="sr-only">
              {t("settings.wallets.nicknameLabel")}
            </label>
            <input
              type="text"
              id="overview-add-wallet-nickname"
              name="nickname"
              aria-describedby={errorText ? "overview-add-wallet-error" : undefined}
              aria-invalid={Boolean(errorText)}
              placeholder={t("settings.wallets.labelPlaceholder")}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={32}
              disabled={isSubmitting}
              className="w-full bg-[#F3F4F6] dark:bg-[#21242B] px-3 py-2 text-base rounded-xl border border-transparent focus:border-brand/30 outline-none text-ink-primary disabled:opacity-60"
            />
          </div>

          {errorText && (
            <p id="overview-add-wallet-error" className="text-[10px] text-brand tracking-wide font-medium">
              {errorText}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium text-ink-secondary bg-surface-subtle hover:bg-surface-card-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("dashboard.addWallet.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition duration-200 cursor-pointer shadow-sm text-center flex items-center justify-center gap-2 ${
                isSubmitDisabled
                  ? "bg-surface-subtle text-ink-muted cursor-not-allowed"
                  : "bg-brand text-white hover:bg-brand-hover hover:shadow-[0_4px_12px_rgba(230,32,88,0.2)]"
              }`}
            >
              {isSubmitting && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
