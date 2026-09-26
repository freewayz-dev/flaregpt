import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowTopRightOnSquareIcon, ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";

import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import { formatActionLabel } from "@/pages/WalletActivity/utils/deriveActivity";
import { getFlarescanTxUrl } from "@/config/web3Config";
import { shortenAddress, copyWalletAddress } from "@/utils/address";
import { toast } from "@/utils/toast";

// `success`/`failed`/`pending` are real, meaningfully different outcomes
// here (unlike the delegation concentration_band, which the backend's own
// handoff doc explicitly says must never be color-coded) — StatusBadge's
// existing tone set already covers exactly this shape, same as it does for
// Governance's proposal statuses.
const STATUS_TONE = { success: "success", failed: "danger", pending: "warning" };

function DetailRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-divider last:border-0">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-sm font-medium text-ink-primary text-right">{children}</span>
    </div>
  );
}

// Same copy pattern already used everywhere else in the app an address is
// shown next to a copy affordance (AddressPill, WalletAddressBadge) —
// `copyWalletAddress` (the one clipboard write every "copy this address"
// call site already goes through) plus the icon-swap-to-checkmark
// confirmation and the same reused `navbar.addressCopied`/`copyFailed`
// feedback strings, rather than a new local clipboard implementation or
// new copy-feedback copy.
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

// Only ever rendered for `found: true` responses (see TransactionLookup/
// index.jsx, which branches on `found` before reaching this component) —
// success/failed/pending, each with a progressively smaller set of
// present fields per the transaction lookup handoff's own field reference.
// Every field access below either has a plain fallback or is guarded by
// presence (`in`), never assumed.
export default function TransactionResultCard({ result }) {
  const { t, i18n } = useTranslation();

  const isContractCreation = result.action_tag === "CONTRACT_CREATION";

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center justify-between gap-2">
        <StatusBadge
          label={t(`transactionLookup.status.${result.status}`)}
          tone={STATUS_TONE[result.status] ?? "neutral"}
          dot
        />
        {"action_tag" in result && (
          <span className="text-xs font-medium text-ink-secondary">
            {formatActionLabel(result.action_tag)}
          </span>
        )}
      </div>

      <div className="mt-4">
        <DetailRow label={t("transactionLookup.result.from")}>
          <CopyableAddress address={result.from} />
        </DetailRow>
        <DetailRow label={t(isContractCreation ? "transactionLookup.result.contractAddress" : "transactionLookup.result.to")}>
          {isContractCreation ? (
            <CopyableAddress address={result.contract_address} />
          ) : result.to ? (
            <CopyableAddress address={result.to} />
          ) : (
            "—"
          )}
        </DetailRow>
        <DetailRow label={t("transactionLookup.result.value")}>
          {result.value_flr.toLocaleString(undefined, { maximumFractionDigits: 6 })} FLR
        </DetailRow>
        {"block_number" in result && (
          <DetailRow label={t("transactionLookup.result.blockNumber")}>
            {result.block_number.toLocaleString()}
          </DetailRow>
        )}
        {"confirmations" in result && (
          <DetailRow label={t("transactionLookup.result.confirmations")}>
            {result.confirmations.toLocaleString()}
          </DetailRow>
        )}
        {"timestamp" in result && (
          <DetailRow label={t("transactionLookup.result.timestamp")}>
            {new Date(result.timestamp).toLocaleString(i18n.language)}
          </DetailRow>
        )}
        {"tx_fee_flr" in result && (
          <DetailRow label={t("transactionLookup.result.fee")}>
            {result.tx_fee_flr.toLocaleString(undefined, { maximumFractionDigits: 6 })} FLR
          </DetailRow>
        )}
      </div>

      <a
        href={getFlarescanTxUrl(result.tx_hash)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-card-hover hover:text-ink-primary cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
      >
        {t("transactionLookup.result.viewOnExplorer")}
        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
      </a>

      {/* Always present per the handoff doc's own field reference — a
          standing scope reminder (e.g. C-chain-only coverage), not
          conditional error copy, so it's rendered the same way regardless
          of which status above it. */}
      {result.note && <p className="mt-3 text-[11px] text-ink-muted">{result.note}</p>}
    </div>
  );
}
