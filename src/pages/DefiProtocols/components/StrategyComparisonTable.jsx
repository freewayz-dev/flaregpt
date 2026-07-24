import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  LockClosedIcon,
  LockOpenIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

import { useCompareStrategies } from "@/hooks/queries/useDefiProtocolsQueries";
import AprMeter from "@/pages/DefiProtocols/components/shared/AprMeter";
import TokenIcon from "@/components/common/TokenIcon";
import StrategyComparisonTableSkeleton from "@/pages/DefiProtocols/components/skeletons/StrategyComparisonTableSkeleton";

const DEFAULT_AMOUNT = 10000;

function parseAprPercent(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function formatFlr(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatLockup(seconds, t) {
  if (!seconds) return t("defiProtocols.strategies.noLockup");
  const days = seconds / 86400;
  if (Number.isInteger(days)) {
    return t("defiProtocols.strategies.lockupDays", { count: days });
  }
  return t("defiProtocols.strategies.lockupHours", {
    count: Math.round(seconds / 3600),
  });
}

// Pulls a token ticker out of a strategy name like "Wrap & Delegate (WFLR)"
// so a row can show its token icon without hardcoding today's 3 strategies —
// a future one whose name parenthesizes a known symbol picks up an icon
// automatically; one without a ticker (e.g. the P-Chain strategy) shows none.
function parseTicker(displayName) {
  return displayName?.match(/\(([^)]+)\)/)?.[1] ?? null;
}

function VerdictCallout({ strategy, t }) {
  return (
    <div className="px-5 py-4 sm:px-8">
      <div className="flex items-center gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
          {t("defiProtocols.strategies.verdict")}
        </p>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
        {strategy.flaregpt_verdict}
      </p>
      <p className="mt-2 text-[11px] text-ink-muted">
        {t("defiProtocols.strategies.compoundingLabel")}: {strategy.compounding}
      </p>
    </div>
  );
}

function StrategyMobileCard({ strategyKey, strategy, isBest, isOpen, onToggle, t }) {
  const aprValue = parseAprPercent(strategy.apr);
  const isLiquid = strategy.lockup_seconds === 0;
  const ticker = parseTicker(strategy.display_name);
  const panelId = `strategy-panel-${strategyKey}`;

  return (
    <div className="rounded-xl bg-surface-inset overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full flex-col gap-3 p-4 text-left cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {ticker && <TokenIcon symbol={ticker} size={16} />}
            <span className="text-sm font-medium text-ink-primary">
              {strategy.display_name}
            </span>
          </div>
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>

        {isBest && (
          <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-md bg-brand/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand">
            <ArrowTrendingUpIcon className="h-3 w-3" />
            {t("defiProtocols.strategies.highestApr")}
          </span>
        )}

        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tabular-nums text-brand">
            {aprValue.toFixed(1)}%
          </span>
          <span className="flex items-center gap-1 text-sm font-medium tabular-nums text-emerald-500">
            <TokenIcon symbol="FLR" size={12} />+
            {formatFlr(strategy.estimated_annual_yield)}
          </span>
        </div>

        <div className="flex flex-col gap-1 text-xs text-ink-secondary">
          <span>{strategy.liquidity}</span>
          <span className="flex items-center gap-1 text-ink-muted">
            {isLiquid ? (
              <LockOpenIcon className="h-3 w-3 shrink-0" />
            ) : (
              <LockClosedIcon className="h-3 w-3 shrink-0" />
            )}
            {formatLockup(strategy.lockup_seconds, t)}
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-divider"
          >
            <VerdictCallout strategy={strategy} t={t} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// A comparison table (desktop) / stacked cards (mobile) replaces what used
// to be 3 separate cards repeating the same fields — same data, far less
// visual weight. The APR bar chart that used to sit below the cards is
// gone too: an inline meter per row (AprMeter) shows the same ranking
// without a second, redundant plot of the identical 3 numbers. Only the
// highest-APR row is expanded by default; the FlareGPT verdict and
// compounding method now only show for whichever row is open. Below `sm`
// the table is replaced entirely by stacked cards rather than made
// horizontally scrollable, so every value stays visible without anyone
// needing to discover a hidden scroll axis.
export default function StrategyComparisonTable() {
  const { t } = useTranslation();
  const [rawAmount, setRawAmount] = useState(String(DEFAULT_AMOUNT));
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      const parsed = Number(rawAmount);
      if (Number.isFinite(parsed) && parsed > 0) setAmount(parsed);
    }, 500);
    return () => clearTimeout(handle);
  }, [rawAmount]);

  const { data, isLoading, isError, isFetching, refetch } =
    useCompareStrategies(amount);
  const hasData = Boolean(data?.strategies);

  if (!isError && (isLoading || !hasData)) {
    return <StrategyComparisonTableSkeleton />;
  }

  const entries = isError ? [] : Object.entries(data.strategies);
  const maxApr = entries.length
    ? Math.max(...entries.map(([, s]) => parseAprPercent(s.apr)))
    : 0;
  const bestKey =
    entries.find(([, s]) => parseAprPercent(s.apr) === maxApr)?.[0] ?? null;
  const effectiveExpanded = expandedKey ?? bestKey;

  return (
    <div className="rounded-2xl bg-surface-card shadow-sm border border-[#E5E7EB] dark:border-none p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div>
            <h3 className="text-sm font-semibold text-ink-primary">
              {t("defiProtocols.strategies.title")}
            </h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              {t("defiProtocols.strategies.subtitle")}
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs text-ink-secondary">
            {t("defiProtocols.strategies.amountLabel")}
          </span>
          <div className="relative">
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={rawAmount}
              onChange={(e) => setRawAmount(e.target.value)}
              className="w-32 rounded-lg bg-surface-inset py-1.5 pl-3 pr-11 text-sm font-semibold tabular-nums text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted">
              FLR
            </span>
          </div>
        </label>
      </div>

      {isError ? (
        <div className="mt-6 rounded-2xl bg-surface-inset px-4 py-6 text-center">
          <p className="text-sm font-medium text-ink-primary">
            {t("defiProtocols.strategies.couldntLoad")}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t("dashboard.common.networkHiccup")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            {isFetching
              ? t("dashboard.common.retrying")
              : t("dashboard.common.retry")}
          </button>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards — every value visible, nothing hidden
              behind a horizontal scroll axis. */}
          <div className="mt-6 space-y-3 sm:hidden">
            {entries.map(([key, strategy]) => (
              <StrategyMobileCard
                key={key}
                strategyKey={key}
                strategy={strategy}
                isBest={key === bestKey}
                isOpen={effectiveExpanded === key}
                onToggle={() =>
                  setExpandedKey(effectiveExpanded === key ? false : key)
                }
                t={t}
              />
            ))}
          </div>

          {/* Desktop: comparison table */}
          <div className="-mx-8 mt-6 hidden overflow-x-auto scrollbar-none sm:block">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-divider">
                  <th
                    scope="col"
                    className="py-2.5 pl-5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted sm:pl-8"
                  >
                    {t("defiProtocols.strategies.colStrategy")}
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {t("defiProtocols.strategies.apr")}
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    <span className="inline-flex items-center gap-1">
                      <TokenIcon symbol="FLR" size={12} />
                      {t("defiProtocols.strategies.colYield")}
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {t("defiProtocols.strategies.colTerms")}
                  </th>
                  <th scope="col" className="py-2.5 pr-5 sm:pr-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {entries.map(([key, strategy]) => {
                  const aprValue = parseAprPercent(strategy.apr);
                  const isBest = key === bestKey;
                  const isLiquid = strategy.lockup_seconds === 0;
                  const isOpen = effectiveExpanded === key;
                  const ticker = parseTicker(strategy.display_name);
                  const panelId = `strategy-panel-desktop-${key}`;
                  const toggle = () => setExpandedKey(isOpen ? false : key);

                  return (
                    <Fragment key={key}>
                      <tr
                        onClick={toggle}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggle();
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        className="cursor-pointer transition-colors hover:bg-surface-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:-outline-offset-2"
                      >
                        <td className="py-3.5 pl-5 sm:pl-8">
                          <div className="flex items-center gap-2">
                            {ticker && <TokenIcon symbol={ticker} size={16} />}
                            <span className="text-sm font-medium text-ink-primary">
                              {strategy.display_name}
                            </span>
                            {isBest && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand">
                                <ArrowTrendingUpIcon className="h-3 w-3" />
                                {t("defiProtocols.strategies.highestApr")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-bold tabular-nums text-brand">
                              {aprValue.toFixed(1)}%
                            </span>
                            <AprMeter value={aprValue} max={maxApr} />
                          </div>
                        </td>
                        <td className="py-3.5 text-sm font-medium tabular-nums text-emerald-500">
                          +{formatFlr(strategy.estimated_annual_yield)}
                        </td>
                        <td className="py-3.5">
                          <p className="text-xs text-ink-secondary">
                            {strategy.liquidity}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
                            {isLiquid ? (
                              <LockOpenIcon className="h-3 w-3 shrink-0" />
                            ) : (
                              <LockClosedIcon className="h-3 w-3 shrink-0" />
                            )}
                            {formatLockup(strategy.lockup_seconds, t)}
                          </p>
                        </td>
                        <td className="py-3.5 pr-5 text-right sm:pr-8">
                          <ChevronDownIcon
                            className={`inline-block h-4 w-4 text-ink-muted transition-transform duration-300 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="p-0">
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                id={panelId}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                className="overflow-hidden bg-surface-inset"
                              >
                                <VerdictCallout strategy={strategy} t={t} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
