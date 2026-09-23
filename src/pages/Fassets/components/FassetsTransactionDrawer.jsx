import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "@/utils/toast";
import {
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

import TokenIcon from "@/components/common/TokenIcon";
import SensitiveValue from "@/components/common/SensitiveValue";
import { useTransactionLookup } from "@/hooks/queries/useTransactionQueries";
import { getFlarescanTxUrl } from "@/config/web3Config";
import { copyWalletAddress, shortenAddress } from "@/utils/address";
import { getActionDirection, formatActionLabel } from "@/pages/WalletActivity/utils/deriveActivity";
import { useFocusTrap } from "@/hooks/useFocusTrap";

// Same shell WalletActivity's own TransactionDrawer.jsx established (right
// drawer on desktop, full-screen on mobile, portaled to `document.body` for
// the same stacking-context reason documented there) — reused directly
// rather than a second drawer visual language for FAssets. The content
// differs: `item` (a portfolio/activity row — asset, amount, action_tag,
// timestamp, transaction_hash) is already fully known the instant this
// opens, no fetch required, so it renders immediately exactly like
// TransactionDrawer's own header does. From/To addresses, confirmations,
// and the network fee aren't part of that row's shape at all (confirmed:
// neither GenericTable nor TransactionDrawer show them for the same
// reason) — those come from `useTransactionLookup` (the same
// GET /api/v1/transaction/{hash} lookup and hook Transaction Lookup's own
// TransactionResultCard.jsx already uses), fetched by hash and layered in
// once/if it resolves. A `found: false` response (a real, normal outcome
// per that endpoint's own contract, not an error) simply leaves those rows
// out rather than showing an error — the hash, the fields already known
// from `item`, and the explorer link (built from the raw hash, no lookup
// needed) all still work regardless.
function CopyableHash({ hash }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      toast.success(t("wallet.activity.drawer.hashCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("wallet.activity.drawer.copyFailed"));
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex w-full items-center justify-between gap-2 rounded-xl bg-surface-inset px-3 py-2.5 text-left transition-colors hover:bg-surface-card-hover cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
    >
      <span className="truncate font-mono text-xs text-ink-primary">{hash}</span>
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <ClipboardIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
      )}
    </button>
  );
}

// Same established "copy an address" affordance and clipboard utility
// TransactionResultCard.jsx's own CopyableAddress already uses
// (`copyWalletAddress`, the one clipboard write every other "copy this
// address" call site in the app already goes through) — matched here
// rather than reused directly since it's a small, page-local component
// there, not an exported shared one.
function CopyableAddress({ address }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyWalletAddress(address);
    if (success) {
      setCopied(true);
      toast.success(t("navbar.addressCopied"));
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(t("navbar.copyFailed"));
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={address}
      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm font-medium text-ink-primary hover:bg-surface-card-hover hover:text-brand transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
    >
      <span className="font-mono tracking-tight">{shortenAddress(address)}</span>
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <ClipboardIcon className="h-3.5 w-3.5 shrink-0" />
      )}
    </button>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-divider last:border-0">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-sm font-medium text-ink-primary text-right">{children}</span>
    </div>
  );
}

export default function FassetsTransactionDrawer({ item, hasPrev, hasNext, onPrev, onNext, onClose }) {
  const { t, i18n } = useTranslation();
  const open = Boolean(item);
  const returnFocusRef = useRef(null);
  const closeButtonRef = useRef(null);
  const drawerRef = useRef(null);

  // Only fetches once a real hash is open — `enabled: Boolean(txHash)`
  // inside the hook itself already guards this, `item?.transaction_hash`
  // here just avoids passing a stale hash from the previous item during
  // the close animation.
  const lookup = useTransactionLookup(open ? item.transaction_hash : "");
  const richDetail = lookup.data?.found ? lookup.data : null;

  useFocusTrap(drawerRef, open);

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement;
      closeButtonRef.current?.focus();
    } else if (returnFocusRef.current instanceof HTMLElement) {
      returnFocusRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      else if ((e.key === "ArrowUp" || e.key === "ArrowLeft") && hasPrev) onPrev();
      else if ((e.key === "ArrowDown" || e.key === "ArrowRight") && hasNext) onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, hasPrev, hasNext, onPrev, onNext, onClose]);

  const direction = item ? getActionDirection(item.action_tag) : "neutral";

  return createPortal(
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 hidden bg-black/20 transition-opacity duration-300 sm:block ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("wallet.activity.drawer.title")}
        className={`fixed z-50 flex flex-col bg-[#FFFFFF] dark:bg-[#161619] border border-[#E5E7EB] dark:border-none shadow-xl
          inset-0 rounded-none
          pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]
          sm:inset-auto sm:right-4 sm:top-20 sm:bottom-4 sm:w-[420px] sm:rounded-2xl sm:pt-0 sm:pl-0 sm:pr-0
          transition-all duration-300 ease-in-out
          ${open ? "translate-x-0 opacity-100" : "translate-x-full sm:translate-x-[120%] opacity-0 pointer-events-none"}`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 shrink-0">
          <p className="text-sm font-semibold text-ink-primary">{t("wallet.activity.drawer.title")}</p>
          <div className="flex items-center gap-1">
            {(hasPrev !== undefined || hasNext !== undefined) && (
              <>
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={!hasPrev}
                  title={t("wallet.activity.drawer.previous")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-subtle transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!hasNext}
                  title={t("wallet.activity.drawer.next")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-subtle transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              title={t("wallet.activity.drawer.close")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-subtle transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {item && (
          <div className="flex-1 overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
            <div className="flex items-center gap-2.5">
              <TokenIcon symbol={item.asset} size={28} />
              <div>
                <p className="text-base font-bold text-ink-primary">
                  <SensitiveValue>
                    {direction === "out" ? "-" : direction === "in" ? "+" : ""}
                    {Number(item.amount).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                  </SensitiveValue>{" "}
                  {item.asset}
                </p>
                <p className="text-xs text-ink-muted">{formatActionLabel(item.action_tag)}</p>
              </div>
            </div>

            <div className="mt-5">
              <DetailRow label={t("wallet.activity.drawer.action")}>
                {formatActionLabel(item.action_tag)}
              </DetailRow>
              <DetailRow label={t("wallet.activity.drawer.asset")}>{item.asset}</DetailRow>

              {/* Rich, hash-looked-up fields — layered in once/if the
                  lookup resolves with `found: true`. A brief loading state
                  only for this section (the fields above are already known
                  from `item`, so the whole drawer never blocks on this
                  fetch), and nothing extra rendered at all if the lookup
                  comes back `found: false` — that's a normal outcome for
                  this endpoint, not an error, and every row below is
                  genuinely unavailable rather than worth a placeholder. */}
              {lookup.isLoading && (
                <div className="py-2.5 space-y-2" role="status">
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                </div>
              )}
              {richDetail?.from && (
                <DetailRow label={t("transactionLookup.result.from")}>
                  <CopyableAddress address={richDetail.from} />
                </DetailRow>
              )}
              {richDetail && (richDetail.to || richDetail.contract_address) && (
                <DetailRow
                  label={t(
                    richDetail.action_tag === "CONTRACT_CREATION"
                      ? "transactionLookup.result.contractAddress"
                      : "transactionLookup.result.to",
                  )}
                >
                  <CopyableAddress address={richDetail.contract_address || richDetail.to} />
                </DetailRow>
              )}

              <DetailRow label={t("wallet.activity.drawer.blockNumber")}>
                {(richDetail?.block_number ?? item.block_number).toLocaleString()}
              </DetailRow>

              {richDetail?.confirmations != null && (
                <DetailRow label={t("transactionLookup.result.confirmations")}>
                  {richDetail.confirmations.toLocaleString()}
                </DetailRow>
              )}

              <DetailRow label={t("wallet.activity.drawer.timestamp")}>
                {new Date(item.timestamp * 1000).toLocaleString(i18n.language)}
              </DetailRow>

              {richDetail?.tx_fee_flr != null && (
                <DetailRow label={t("transactionLookup.result.fee")}>
                  {richDetail.tx_fee_flr.toLocaleString(undefined, { maximumFractionDigits: 6 })} FLR
                </DetailRow>
              )}
            </div>

            <p className="mt-5 mb-1.5 text-xs text-ink-muted">
              {t("wallet.activity.drawer.transactionHash")}
            </p>
            <CopyableHash hash={item.transaction_hash} />

            <div className="mt-5">
              <a
                href={getFlarescanTxUrl(item.transaction_hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-card-hover hover:text-ink-primary cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                {t("wallet.activity.drawer.viewOnExplorer")}
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </aside>
    </>,
    document.body,
  );
}
