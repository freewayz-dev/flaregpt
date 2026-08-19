import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router";
import { toast } from "react-toastify";
import { isAxiosError } from "axios";
import {
  useConnection,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  BoltIcon,
  ShieldExclamationIcon,
  LinkSlashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useAuthStore } from "@/store/useAuthStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { coston2 } from "@/config/web3Config";
import {
  CLAIM_SETUP_MANAGER_ADDRESS,
  CLAIM_SETUP_MANAGER_ABI,
  GAS_SNIPER_KEEPER_ADDRESS,
} from "@/config/claimSetupManager";
import {
  useGasSniperStatus,
  useEnableGasSniper,
  useDisableGasSniper,
} from "@/hooks/queries/useLoopsQueries";
import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import Toggle from "@/pages/Settings/components/Toggle";


import { zeroAddress} from "viem";

// Mobile-only fix for a real bug: on a phone, opening the wallet's
// confirmation UI for `switchChainAsync`/`writeContractAsync` below never
// happened at all — not a rejection, not a timeout, just silence, and the
// call eventually failed with nothing for the user to have acted on.
// Confirmed by reading the actual installed WalletConnect SDK
// (@walletconnect/utils's `handleDeeplinkRedirect`, which every single
// wallet request — not just the first — routes through): it deep-links to
// the wallet app only if `document.hasFocus()` is true at that exact
// moment, and silently no-ops (one console.warn, nothing the user ever
// sees) otherwise. On desktop this is never false — the wallet lives on a
// separate device (phone, scanning a QR), so the desktop tab keeps focus
// the whole time regardless of what the phone is doing. On mobile the
// wallet is a *different app on the same phone*; by the time someone
// reaches this flow (several screens past the initial connect, not
// immediately after it), the browser tab can easily have lost focus for
// reasons that have nothing to do with this app, silently defeating the
// exact redirect this flow depends on to show the user anything at all.
//
// Guarded on `!document.hasFocus()` now — an earlier version called
// window.focus() unconditionally on every attempt, which caused a real
// regression: an already-focused tab (the common case — most of this flow
// still runs with the tab genuinely focused) doesn't need reasserting at
// all, and doing it anyway turned out to have two costly side effects
// elsewhere in this same app. First, this app's QueryClient defaults to
// `refetchOnWindowFocus: true` (see main.jsx) — a redundant focus() call
// can still fire a real `focus` event, which fans out into a refetch of
// every mounted query, including this card's own status/approval reads,
// racing against whatever the toggle click right after it was expecting
// to land. Second, at least one mobile browser is documented to sometimes
// swallow the very next tap anywhere on the page as a focus-recovery
// gesture rather than deliver it as a real click after a redundant
// self-focus call — which is exactly what "the first click after Approve
// does nothing, the second one works" looks like from the outside. Only
// calling this when focus is actually missing removes both side effects
// in the (common) case they were happening in, while still firing for the
// one case that actually matters: a backgrounded mobile tab, right before
// the wallet round trip that needs the deep link.
//
// `window.focus()` on a page's own current window is one of the few
// focus-steal cases browsers reliably honor — it's the tab reasserting
// itself, not stealing focus from a *different* one — and this is called
// synchronously, as the immediate consequence of the click that starts
// handleApprove (and again right before the write), not after crossing
// another `await` first, which is what keeps each call inside the same
// trusted-gesture window a mobile browser expects for a real user-
// initiated action. Deliberately no artificial wait after calling
// focus() — an earlier version added one on the theory that focus() is a
// request, not a synchronous guarantee, and the browser might need a
// moment to actually apply it. That's true, but it traded one problem for
// a worse one: the actual redirect this whole thing exists to trigger
// (@walletconnect/utils's own `handleDeeplinkRedirect`, once its
// document.hasFocus() check passes) ends in a plain `window.open(url,
// target, "noreferrer noopener")` — and *that* call is itself gated by
// the browser's own popup-blocker/user-activation heuristics, which get
// stricter the further removed a call is from the original click. Every
// extra tick between the tap and that window.open() is one more chance
// for it to be silently blocked, no error, nothing the user ever sees —
// the same failure mode as the focus gate, just a different gate,
// downstream of it, inside code this app has no way to patch (it's
// buried in the SDK's own internals, not something exposed to callers).
// Keeping this whole function synchronous minimizes that distance instead
// of adding to it.
function reassertWindowFocus() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (document.hasFocus?.() !== false) return;
  if (typeof window.focus !== "function") return;
  window.focus();
}

// The backend enforces `user_wallet` as the caller's own authenticated
// address specifically (confirmed live: a mismatched address 403s) — never
// a watchlist pick the way DeFi Protocols' wallet context can be, so
// there's no wallet *selector* here, only a sign-in gate. That also means
// the address to send is `authenticatedAddress` itself, not whatever's
// live-connected right now (apiClient's own interceptor already withholds
// the token entirely on a connected/authenticated mismatch, so a stale
// address here would 401 rather than silently act on the wrong wallet).
//
// A signed-in wallet still can't enable this until it's approved Flare's
// Gas Sniper keeper as a claim executor on-chain (Coston2's
// `ClaimSetupManager.setClaimExecutors`, confirmed live — see
// claimSetupManager.js) — checked proactively here via `isClaimExecutor`.
// The toggle itself always appears as soon as a wallet is signed in,
// whether or not approval is still outstanding (connecting must never by
// itself surface anything approval-related); only an explicit toggle-on
// click reveals the Approval Required state, so nobody sees a 409 either
// — the check just moved from render time to click time, not away.
export default function GasSniperCard() {
  const { t } = useTranslation();
  const { openWalletModal } = useOutletContext();
  const { hasSession, isConnected, isCurrentWalletSignedIn, isAuthenticating, signIn } =
    useAuthStatus();
  const authenticatedAddress = useAuthStore((s) => s.authenticatedAddress);
  const { chainId: connectedChainId } = useConnection();
  // Enabling/disabling hits the backend (useLoopsQueries.ts) and approving
  // is an on-chain write — both genuinely need connectivity, unlike the
  // status *read* above (StaleWhileRevalidate, so it's fine showing a
  // cached "who's opted in" view offline, see sw.ts).
  const isOnline = useOnlineStatus();

  const {
    data: status,
    isLoading: isLoadingStatus,
    isError: isStatusError,
    isFetching: isFetchingStatus,
    refetch: refetchStatus,
  } = useGasSniperStatus();
  const enableMutation = useEnableGasSniper();
  const disableMutation = useDisableGasSniper();

  const {
    data: isApproved,
    isLoading: isCheckingApproval,
    refetch: refetchApproval,
  } = useReadContract({
    address: CLAIM_SETUP_MANAGER_ADDRESS,
    abi: CLAIM_SETUP_MANAGER_ABI,
    functionName: "isClaimExecutor",
    // The zero-address fallback is never actually sent — `enabled` below
    // is false whenever `authenticatedAddress` is null, so this only
    // satisfies the arg's non-null type, not a real call.
    args: [authenticatedAddress ?? zeroAddress, GAS_SNIPER_KEEPER_ADDRESS],
    chainId: coston2.id,
    query: { enabled: hasSession && Boolean(authenticatedAddress) },
  });

  // Read fresh rather than assumed free — confirmed live this keeper's fee
  // is currently 0, but it's the contract's own owner-adjustable setting,
  // not a constant this app controls.
  const { data: keeperFee } = useReadContract({
    address: CLAIM_SETUP_MANAGER_ADDRESS,
    abi: CLAIM_SETUP_MANAGER_ABI,
    functionName: "getExecutorCurrentFeeValue",
    args: [GAS_SNIPER_KEEPER_ADDRESS],
    chainId: coston2.id,
    query: { enabled: hasSession },
  });

  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [approveTxHash, setApproveTxHash] = useState(undefined);
  const [isApproving, setIsApproving] = useState(false);
  // Whether the user has actually asked for this loop to be ON — distinct
  // from `isEnabled` (backend truth) and `isApproved` (on-chain truth).
  // Connecting/signing in alone must never surface the approval flow;
  // only an explicit toggle click does (see handleToggle). Starts false on
  // every mount/wallet switch, which is also what makes a plain page
  // refresh land back on a plain OFF toggle rather than mid-approval-flow
  // for a loop that was never actually approved — the already-enabled
  // case doesn't need this at all, since `isEnabled` drives the toggle's
  // checked state independently of whether this flag is set.
  const [approvalRequested, setApprovalRequested] = useState(false);
  const { isSuccess: approveTxConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    chainId: coston2.id,
  });

  useEffect(() => {
    if (!approveTxConfirmed) return;
    refetchApproval();
    setIsApproving(false);
    setApproveTxHash(undefined);
    setApprovalRequested(false);
    // The only way this effect's flow is reachable at all is a user having
    // already asked to turn the loop on (see handleToggle) — approval
    // succeeding should land them at Active directly, not back on a
    // freshly-OFF toggle demanding a second manual click for something
    // they already asked for once. Reuses the existing "enabled" copy
    // (already accurate, already fully translated) rather than the old
    // "Approved. You can now turn Gas Sniper on." string, which promised a
    // manual step that no longer exists now that this happens
    // automatically.
    // `!` — this flow is only reachable once signed in (see above), which
    // guarantees `authenticatedAddress` is set.
    enableMutation.mutateAsync(authenticatedAddress).then(
      () => toast.success(t("loops.gasSniper.enabled")),
      () => toast.error(t("loops.gasSniper.toggleFailed")),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveTxConfirmed]);

  // This card stays mounted across disconnects and wallet switches (it's
  // not remounted per-wallet), but an in-flight approve click — and the
  // fact that one was ever requested — belongs to whichever wallet was
  // authenticated when it started. Without this, a cancelled approval that
  // a wallet never cleanly rejects (leaving isApproving stuck true), or a
  // switch away mid-approval, would still read as "in progress"/"approval
  // requested" once a different wallet signs in — reset explicitly rather
  // than relying on every wallet's cancel path to behave the same way.
  useEffect(() => {
    setIsApproving(false);
    setApproveTxHash(undefined);
    setApprovalRequested(false);
  }, [authenticatedAddress]);

  const isEnabled = Boolean(
    authenticatedAddress &&
      status?.opted_in_wallets?.some(
        (w) => w.toLowerCase() === authenticatedAddress.toLowerCase(),
      ),
  );
  const isMutating = enableMutation.isPending || disableMutation.isPending;

  const handleSignInPrompt = () => {
    if (!isConnected) {
      openWalletModal();
    } else if (!hasSession) {
      signIn();
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      if (connectedChainId !== coston2.id) {
        reassertWindowFocus();
        await switchChainAsync({ chainId: coston2.id });
      }
      reassertWindowFocus();
      const hash = await writeContractAsync({
        address: CLAIM_SETUP_MANAGER_ADDRESS,
        abi: CLAIM_SETUP_MANAGER_ABI,
        functionName: "setClaimExecutors",
        args: [[GAS_SNIPER_KEEPER_ADDRESS]],
        chainId: coston2.id,
        // `chain`/`account` passed explicitly, not left to wagmi's own
        // connected-client inference — confirmed via a minimal reproduction
        // that this exact wagmi/viem generic chain (SelectChains ->
        // UnionCompute over a mapped `chains` type) doesn't fully resolve
        // to an optional `chain`/`account` even with a single, literally-
        // typed chain and an explicit `config`, so TypeScript demands both
        // regardless. Both values are already known and correct here
        // (coston2 is this flow's one fixed target chain; authenticatedAddress
        // is the signed-in wallet this approval is for) — not placeholders.
        chain: coston2,
        account: authenticatedAddress,
        value: keeperFee ?? 0n,
      });
      setApproveTxHash(hash);
      // isApproving stays true until the receipt confirms (see the effect
      // above) — the transaction is sent but not yet mined.
    } catch {
      toast.error(t("loops.gasSniper.approveFailed"));
      setIsApproving(false);
    }
  };

  const handleToggle = async (next) => {
    // Turning it on for a wallet that hasn't approved the keeper on-chain
    // yet would just 409 — reveal the Approval Required state instead of
    // calling the API. This is the one and only place approvalRequested
    // ever becomes true: connecting/signing in must never set it on its
    // own, only an explicit ask to turn the loop on does.
    if (next && needsApproval) {
      setApprovalRequested(true);
      return;
    }
    // `!` — the toggle this handles only renders once signed in (see the
    // JSX below), which guarantees `authenticatedAddress` is set.
    try {
      if (next) {
        await enableMutation.mutateAsync(authenticatedAddress);
        toast.success(t("loops.gasSniper.enabled"));
      } else {
        await disableMutation.mutateAsync(authenticatedAddress);
        toast.success(t("loops.gasSniper.disabled"));
      }
    } catch (error) {
      // A 401 here means the session expired mid-toggle — apiClient.ts's
      // own response interceptor already clears the session and shows its
      // own "Your session expired" toast for exactly this case (any 401,
      // not just this endpoint), which also flips `hasSession` false and
      // correctly swaps this toggle out for the sign-in prompt on the next
      // render. A second, Gas-Sniper-specific "couldn't update" toast on
      // top of that would just be confusing noise about the same event,
      // not a distinct failure the user needs to act on separately.
      if (isAxiosError(error) && error.response?.status === 401) return;
      // Defensive fallback, not the primary path — the approval check
      // above should mean nobody reaches this, but a race (e.g. the
      // keeper being unset again between the check and this click) still
      // deserves its own clear message rather than a generic failure.
      const isExecutorNotSet = error?.response?.data?.detail?.error === "EXECUTOR_NOT_SET";
      toast.error(
        isExecutorNotSet
          ? t("loops.gasSniper.executorNotSet")
          : t("loops.gasSniper.toggleFailed"),
      );
    }
  };

  // `isLoadingState` gates which of {toggle, approve panel} is allowed to
  // render at all — without it, the brief window before the on-chain read
  // resolves (isCheckingApproval still true, isApproved still undefined)
  // would fall through to "not needsApproval" and flash the toggle for a
  // wallet that turns out to need approval a moment later, on every fresh
  // check including right after a wallet switch.
  const isLoadingState = isLoadingStatus || isCheckingApproval;
  const needsApproval = hasSession && !isLoadingState && !isApproved;
  // needsApproval alone is just the on-chain fact; approvalFlowActive is
  // what's allowed to actually change the UI. Gating on approvalRequested
  // here (not just at the toggle) keeps the badge and the reconnect prompt
  // consistent with the button/panel — otherwise a wallet that hasn't
  // asked to enable yet could still see a "needs approval" warning with no
  // way to act on it, which is the same premature-disclosure bug just
  // moved into the badge instead of the button.
  const approvalFlowActive = needsApproval && approvalRequested;
  // The on-chain approve step needs a live signature from the *same*
  // wallet the session belongs to — unlike Enable/Disable (plain API
  // calls, fine while disconnected), a transaction can't be sent with no
  // wallet connected, or signed correctly by a different wallet than the
  // one `isApproved` was even checked for. Covers both "disconnected
  // entirely" and "a different wallet is connected than the one signed
  // in" (isCurrentWalletSignedIn is false in either case).
  const needsReconnect = approvalFlowActive && !isCurrentWalletSignedIn;

  // A failed status check used to fall straight through to "Inactive" —
  // `status` stays `undefined`, so `isEnabled` (and therefore every branch
  // below it) silently computed to `false` with no indication the check
  // itself never actually succeeded. That's a real wallet potentially
  // *already* enabled being told it isn't, with no retry offered.
  //
  // `null` only for the genuinely-nothing-to-show case (signed out) —
  // while actually loading, the header below renders a skeleton in this
  // spot instead of leaving it blank until the status/approval checks
  // resolve (both the badge and the toggle used to just disappear here).
  const statusInfo = !hasSession
    ? null
    : isLoadingState
      ? undefined
      : isStatusError
        ? { label: t("loops.gasSniper.statusUnknown"), tone: "neutral" }
        : needsReconnect
          ? { label: t("loops.gasSniper.needsReconnect"), tone: "warning" }
          : approvalFlowActive
            ? { label: t("loops.gasSniper.needsApproval"), tone: "warning" }
            : isEnabled
              ? { label: t("loops.gasSniper.active"), tone: "success" }
              : { label: t("loops.gasSniper.inactive"), tone: "neutral" };

  return (
    <div className="rounded-2xl bg-surface-card shadow-sm border border-[#E5E7EB] dark:border-none p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <BoltIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink-primary">
              {t("loops.gasSniper.title")}
            </h3>
            {statusInfo === undefined ? (
              <span role="status" className="mt-1 inline-block h-2.5 w-16 rounded-full bg-surface-inset animate-pulse" />
            ) : (
              statusInfo && <StatusBadge label={statusInfo.label} tone={statusInfo.tone} dot />
            )}
          </div>
        </div>

        {!hasSession ? (
          <button
            type="button"
            onClick={handleSignInPrompt}
            disabled={isAuthenticating}
            className="shrink-0 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
          >
            {!isConnected
              ? t("sidebar.connectWallet")
              : isAuthenticating
                ? t("navbar.signingIn")
                : t("navbar.signIn")}
          </button>
        ) : isLoadingState ? (
          <span role="status" className="shrink-0 inline-block w-8 h-4 rounded-full bg-surface-inset animate-pulse" />
        ) : !approvalFlowActive && !isStatusError ? (
          <span title={!isOnline ? t("loops.gasSniper.offline") : undefined}>
            <Toggle
              checked={isEnabled}
              onChange={handleToggle}
              disabled={isMutating || !isOnline}
              label={t("loops.gasSniper.title")}
            />
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-secondary max-w-lg">
        {t("loops.gasSniper.description")}
      </p>

      {hasSession && !isLoadingState && isStatusError && (
        <div role="alert" className="mt-4 rounded-xl bg-surface-inset px-4 py-3 text-center">
          <p className="text-xs font-medium text-ink-primary">
            {t("loops.gasSniper.statusCheckFailed")}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
          <button
            type="button"
            onClick={() => refetchStatus()}
            disabled={isFetchingStatus}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${isFetchingStatus ? "animate-spin" : ""}`} />
            {isFetchingStatus ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      )}

      {needsReconnect && (
        <div className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <LinkSlashIcon className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-primary">
                {t("loops.gasSniper.reconnectTitle")}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted max-w-lg">
                {t("loops.gasSniper.reconnectDescription")}
              </p>
              <button
                type="button"
                onClick={openWalletModal}
                className="mt-3 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                {t("sidebar.connectWallet")}
              </button>
            </div>
          </div>
        </div>
      )}

      {approvalFlowActive && !needsReconnect && (
        <div className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <ShieldExclamationIcon className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-primary">
                {t("loops.gasSniper.approveTitle")}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted max-w-lg">
                {t("loops.gasSniper.approveDescription")}
              </p>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving || !isOnline}
                title={!isOnline ? t("loops.gasSniper.offline") : undefined}
                className="mt-3 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                {isApproving
                  ? approveTxHash
                    ? t("loops.gasSniper.confirmingApproval")
                    : t("loops.gasSniper.approving")
                  : t("loops.gasSniper.approveCta")}
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasSession && (
        <p className="mt-3 text-[11px] text-ink-muted">{t("loops.gasSniper.signInHint")}</p>
      )}
    </div>
  );
}
