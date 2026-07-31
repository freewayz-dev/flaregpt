import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
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
// claimSetupManager.js) — checked proactively here via `isClaimExecutor`
// so the toggle only ever appears once it would actually work, rather
// than letting everyone hit the same 409 on their first click.
export default function GasSniperCard() {
  const { t } = useTranslation();
  const { openWalletModal } = useOutletContext();
  const { hasSession, isConnected, isCurrentWalletSignedIn, isAuthenticating, signIn } =
    useAuthStatus();
  const authenticatedAddress = useAuthStore((s) => s.authenticatedAddress);
  const { chainId: connectedChainId } = useConnection();

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
    args: [authenticatedAddress, GAS_SNIPER_KEEPER_ADDRESS],
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
  const { isSuccess: approveTxConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    chainId: coston2.id,
  });

  useEffect(() => {
    if (!approveTxConfirmed) return;
    refetchApproval();
    toast.success(t("loops.gasSniper.approved"));
    setIsApproving(false);
    setApproveTxHash(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveTxConfirmed]);

  // This card stays mounted across disconnects and wallet switches (it's
  // not remounted per-wallet), but an in-flight approve click belongs to
  // whichever wallet was authenticated when it started. Without this, a
  // cancelled approval that a wallet never cleanly rejects (leaving
  // isApproving stuck true) would still read as "in progress" once a
  // different wallet signs in — reset explicitly rather than relying on
  // every wallet's cancel path to behave the same way.
  useEffect(() => {
    setIsApproving(false);
    setApproveTxHash(undefined);
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
        await switchChainAsync({ chainId: coston2.id });
      }
      const hash = await writeContractAsync({
        address: CLAIM_SETUP_MANAGER_ADDRESS,
        abi: CLAIM_SETUP_MANAGER_ABI,
        functionName: "setClaimExecutors",
        args: [[GAS_SNIPER_KEEPER_ADDRESS]],
        chainId: coston2.id,
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
    try {
      if (next) {
        await enableMutation.mutateAsync(authenticatedAddress);
        toast.success(t("loops.gasSniper.enabled"));
      } else {
        await disableMutation.mutateAsync(authenticatedAddress);
        toast.success(t("loops.gasSniper.disabled"));
      }
    } catch (error) {
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
  // The on-chain approve step needs a live signature from the *same*
  // wallet the session belongs to — unlike Enable/Disable (plain API
  // calls, fine while disconnected), a transaction can't be sent with no
  // wallet connected, or signed correctly by a different wallet than the
  // one `isApproved` was even checked for. Covers both "disconnected
  // entirely" and "a different wallet is connected than the one signed
  // in" (isCurrentWalletSignedIn is false in either case).
  const needsReconnect = needsApproval && !isCurrentWalletSignedIn;

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
          : needsApproval
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
        ) : !needsApproval && !isStatusError ? (
          <Toggle
            checked={isEnabled}
            onChange={handleToggle}
            disabled={isMutating}
            label={t("loops.gasSniper.title")}
          />
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

      {needsApproval && !needsReconnect && (
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
                disabled={isApproving}
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
