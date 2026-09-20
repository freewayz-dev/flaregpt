import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon, ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import PageHeader from "@/components/common/PageHeader";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import { useTransactionLookup } from "@/hooks/queries/useTransactionQueries";
import TransactionResultCard from "@/pages/TransactionLookup/components/TransactionResultCard";

// Wallet-independent by design — paste any C-chain transaction hash, get
// its status. No `useDerivedWalletHub`/`activeAddress` anywhere on this
// page, unlike every other page under the "portfolio" nav group; this
// lives in "ecosystem" instead (see navigation.js) for exactly that
// reason. `submittedHash` (updated only on form submit) is deliberately
// separate from the raw input state below — this is a real network call
// per search, not a client-side filter over already-loaded data the way
// Wallet Activity's own search field is, so it shouldn't fire on every
// keystroke.
export default function TransactionLookup() {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [submittedHash, setSubmittedHash] = useState("");

  const query = useTransactionLookup(submittedHash);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setSubmittedHash(trimmed);
  };

  return (
    <div className="space-y-5 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader
          title={t("sidebar.transactionLookup")}
          description={t("transactionLookup.description")}
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-surface-card p-4 shadow-sm border border-[#E5E7EB] dark:border-none"
      >
        <label htmlFor="transaction-lookup-hash" className="text-xs font-medium text-ink-secondary">
          {t("transactionLookup.form.label")}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              id="transaction-lookup-hash"
              name="txHash"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t("transactionLookup.form.placeholder")}
              autoComplete="off"
              spellCheck="false"
              // text-base (16px), not text-sm, specifically below `sm:` —
              // any font-size under 16px on an <input> makes iOS Safari
              // auto-zoom the whole page on focus. Same fix already
              // established for StrategyComparisonTable.jsx's amount
              // input; `sm:text-sm` keeps desktop's existing 14px.
              className="w-full rounded-xl bg-surface-inset pl-9 pr-3 py-2.5 text-base sm:text-sm font-mono text-ink-primary placeholder-ink-muted outline-none focus-within:outline focus-within:outline-2 focus-within:outline-brand/50 focus-within:outline-offset-2"
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || query.isFetching}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
          >
            {query.isFetching ? t("transactionLookup.form.searching") : t("transactionLookup.form.search")}
          </button>
        </div>
      </form>

      {!submittedHash ? (
        <WalletEmptyState
          icon={MagnifyingGlassIcon}
          title={t("transactionLookup.idle.title")}
          description={t("transactionLookup.idle.description")}
        />
      ) : query.isLoading ? (
        <div
          role="status"
          className="rounded-2xl bg-surface-card p-6 shadow-sm border border-[#E5E7EB] dark:border-none space-y-3"
        >
          <div className="skeleton h-5 w-1/3 rounded" />
          <div className="skeleton h-4 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="skeleton h-4 w-2/5 rounded" />
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-2xl bg-surface-inset px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink-primary">{t("transactionLookup.couldntLoad")}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
            {query.isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : !query.data.found ? (
        // not_found and invalid_format both render nothing else — distinct
        // copy per the handoff doc's own checklist, and `note` (always
        // present) takes priority over the static fallback description
        // whenever the backend actually explains why (e.g. a P-chain hash),
        // so that explanation is never buried behind generic copy.
        <WalletEmptyState
          icon={query.data.status === "invalid_format" ? ExclamationTriangleIcon : MagnifyingGlassIcon}
          title={t(
            query.data.status === "invalid_format"
              ? "transactionLookup.invalidFormat.title"
              : "transactionLookup.notFound.title",
          )}
          description={
            query.data.note ||
            t(
              query.data.status === "invalid_format"
                ? "transactionLookup.invalidFormat.description"
                : "transactionLookup.notFound.description",
            )
          }
        />
      ) : (
        <TransactionResultCard result={query.data} />
      )}
    </div>
  );
}
