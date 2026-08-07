import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";

import type { ReactNode } from "react";

import TokenIcon from "@/components/common/TokenIcon";
import SensitiveValue from "@/components/common/SensitiveValue";
import { getFlarescanTxUrl } from "@/config/web3Config";
import { shareOrCopy } from "@/utils/share";
import { getActionDirection, formatActionLabel } from "@/pages/WalletActivity/utils/deriveActivity";
import type { ActivityItem } from "@/pages/WalletActivity/utils/deriveActivity";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface CopyableHashProps {
  hash: string;
}

function CopyableHash({ hash }: CopyableHashProps) {
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

interface DetailRowProps {
  label: ReactNode;
  children: ReactNode;
}

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-divider last:border-0">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-sm font-medium text-ink-primary text-right">{children}</span>
    </div>
  );
}

// Right-side drawer on desktop, full-screen on mobile — the exact shell
// FlareWidget already established (same breakpoint, same transition), so
// this doesn't invent a second "detail panel" visual language for the app.
// Prev/Next (Linear/Superhuman/Mail.app-style) walk the *currently
// filtered and sorted* list the row was opened from, via index — not the
// full unfiltered history — so browsing stays inside whatever the user was
// actually looking at.
interface TransactionDrawerProps {
  item: ActivityItem | null;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export default function TransactionDrawer({ item, hasPrev, hasNext, onPrev, onNext, onClose }: TransactionDrawerProps) {
  const { t } = useTranslation();
  const open = Boolean(item);
  const returnFocusRef = useRef<Element | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if ((e.key === "ArrowUp" || e.key === "ArrowLeft") && hasPrev) onPrev();
      else if ((e.key === "ArrowDown" || e.key === "ArrowRight") && hasNext) onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, hasPrev, hasNext, onPrev, onNext, onClose]);

  const direction = item ? getActionDirection(item.action_tag) : "neutral";

  // Portaled to `document.body` rather than rendered inline here: this
  // component is nested several levels deep inside `main` (page → section
  // → ... → drawer), while the dashboard's sticky navbar is a much
  // shallower sibling. Neither ancestor establishes a new stacking
  // context (no transform/filter/opacity), so z-index *should* compare
  // directly — but a sticky-positioned element gets its own compositing
  // layer, and that layer can visually paint above a deeply-nested fixed
  // element with a logically higher z-index regardless of what the
  // numbers say (confirmed live: the navbar stayed undimmed in light mode
  // while everything else correctly darkened). Rendering at the body
  // level sidesteps the ambiguity entirely — nothing to out-stack, since
  // there's no shared nested ancestor left to disagree about.
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
          sm:inset-auto sm:right-4 sm:top-20 sm:bottom-4 sm:w-[420px] sm:rounded-2xl
          transition-all duration-300 ease-in-out
          ${open ? "translate-x-0 opacity-100" : "translate-x-full sm:translate-x-[120%] opacity-0 pointer-events-none"}`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 shrink-0">
          <p className="text-sm font-semibold text-ink-primary">{t("wallet.activity.drawer.title")}</p>
          <div className="flex items-center gap-1">
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
          <div className="flex-1 overflow-y-auto p-5">
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
              <DetailRow label={t("wallet.activity.drawer.blockNumber")}>
                {item.block_number.toLocaleString()}
              </DetailRow>
              <DetailRow label={t("wallet.activity.drawer.timestamp")}>
                {new Date(item.timestamp * 1000).toLocaleString()}
              </DetailRow>
            </div>

            <p className="mt-5 mb-1.5 text-xs text-ink-muted">
              {t("wallet.activity.drawer.transactionHash")}
            </p>
            <CopyableHash hash={item.transaction_hash} />

            <div className="mt-5 flex items-center gap-2">
              <a
                href={getFlarescanTxUrl(item.transaction_hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-card-hover hover:text-ink-primary cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                {t("wallet.activity.drawer.viewOnExplorer")}
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                // Shares the explorer link, not this app's own `?tx=`
                // deep link — that param is a session-derived id (hash +
                // asset + fetch-order index, see withActionIds in
                // deriveActivity.ts), not a stable identifier, so it
                // isn't guaranteed to resolve to the same transaction (or
                // resolve at all) in whoever receives the link's own
                // session. The explorer URL, keyed by the raw transaction
                // hash, works for anyone regardless of this app.
                onClick={async () => {
                  const result = await shareOrCopy({
                    title: t("wallet.activity.drawer.shareTitle"),
                    url: getFlarescanTxUrl(item.transaction_hash),
                  });
                  if (result === "copied") toast.success(t("wallet.activity.drawer.linkCopied"));
                  else if (result === "failed") toast.error(t("wallet.activity.drawer.copyFailed"));
                }}
                aria-label={t("wallet.activity.drawer.shareTransaction")}
                title={t("wallet.activity.drawer.shareTransaction")}
                className="shrink-0 rounded-xl border border-line p-2.5 text-ink-secondary transition-colors hover:bg-surface-card-hover hover:text-ink-primary cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                <ShareIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>,
    document.body,
  );
}
