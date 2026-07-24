import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import { PROTOCOLS } from "@/pages/DefiProtocols/protocols";

function formatAmount(value, maxFractionDigits = 4) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

function ProtocolListRow({ protocol, isActive, onClick, balance, t }) {
  const Icon = protocol.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "true" : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
        isActive ? "bg-brand/10" : "hover:bg-surface-card-hover"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isActive ? "bg-brand/15 text-brand" : "bg-surface-inset text-ink-muted"
        }`}
      >
        <Icon className="h-4 w-4 object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${
            isActive ? "text-brand" : "text-ink-primary"
          }`}
        >
          {t(protocol.titleKey)}
        </p>
        <p className="truncate text-[11px] text-ink-muted">
          {protocol.categoryKey && (
            <span className="mr-1 font-semibold uppercase tracking-wide text-ink-muted">
              {t(protocol.categoryKey)} ·
            </span>
          )}
          {t(protocol.subtitleKey)}
          {balance != null && (
            <span className="text-ink-secondary"> · {balance}</span>
          )}
        </p>
      </div>
      <ChevronRightIcon
        className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-300 lg:hidden ${
          isActive ? "rotate-90" : ""
        }`}
      />
    </button>
  );
}

function DetailHeader({ protocol, badge, t }) {
  const Icon = protocol.icon;
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="h-4 w-4 object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-semibold text-ink-primary">
          {t(protocol.titleKey)}
        </h4>
        <p className="truncate text-[11px] text-ink-muted">
          {t(protocol.subtitleKey)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {protocol.categoryKey && (
          <StatusBadge label={t(protocol.categoryKey)} tone="neutral" />
        )}
        {badge && <StatusBadge label={badge.label} tone={badge.tone} dot />}
      </div>
    </div>
  );
}

// Master-detail explorer: a compact list of protocols (icon, name, balance)
// with one detail panel for whichever is selected. Adding Clearpool/Spectra/
// Morpho later means adding an entry to PROTOCOLS — this shell, the list
// rows, and the responsive layout don't change, so the page stays calm
// whether it's showing 3 protocols or 20 instead of growing a new card each
// time. Desktop shows the list and detail side by side; on narrow screens
// the same list becomes a single-open accordion so nothing requires a
// separate navigation step.
export default function ProtocolExplorer() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress } = useDerivedWalletHub(connectedAddress, isConnected);
  const [activeId, setActiveId] = useState(PROTOCOLS[0].id);

  // Every protocol's hook is called here (fixed order, fixed length array —
  // safe under the rules of hooks), but only the currently selected
  // protocol's query is actually enabled — the rest stay idle rather than
  // firing a request no one's looking at yet. This is what keeps the page's
  // initial network cost flat as the registry grows from 3 protocols to 20:
  // opening a row fetches that row, nothing more. A row's list-preview
  // balance simply won't show until that row has been opened at least once
  // this session (its query then stays cached, so it re-shows instantly on
  // later visits without a new request).
  const results = PROTOCOLS.map((protocol) =>
    protocol.useVault(activeAddress, { enabled: protocol.id === activeId }),
  );

  const activeIndex = PROTOCOLS.findIndex((p) => p.id === activeId);
  const activeProtocol = PROTOCOLS[activeIndex];
  const activeResult = results[activeIndex];
  const ActiveDetail = activeProtocol.DetailComponent;
  const activeBadge = activeProtocol.getBadge(activeResult.data, t);

  const balanceFor = (protocol, result) => {
    if (!activeAddress || !protocol.hasData(result.data)) return null;
    const { amount, unit } = protocol.getBalance(result.data);
    return `${formatAmount(amount)} ${unit}`.trim();
  };

  return (
    <div className="rounded-2xl bg-surface-card shadow-sm border border-[#E5E7EB] dark:border-none overflow-hidden">
      <div className="p-5 sm:p-6 sm:pb-0">
        <h3 className="text-sm font-semibold text-ink-primary">
          {t("defiProtocols.explorer.title")}
        </h3>
        <p className="mt-1 text-xs text-ink-muted">
          {t("defiProtocols.explorer.subtitle")}
        </p>
      </div>

      {/* Desktop: list rail + detail panel side by side */}
      <div className="hidden lg:flex lg:mt-5">
        <div className="w-[260px] shrink-0 space-y-1 border-r border-divider p-3">
          {PROTOCOLS.map((protocol, i) => (
            <ProtocolListRow
              key={protocol.id}
              protocol={protocol}
              isActive={protocol.id === activeId}
              onClick={() => setActiveId(protocol.id)}
              balance={balanceFor(protocol, results[i])}
              t={t}
            />
          ))}
        </div>
        <div className="min-w-0 flex-1 p-6">
          <DetailHeader protocol={activeProtocol} badge={activeBadge} t={t} />
          <ActiveDetail
            data={activeResult.data}
            isLoading={activeResult.isLoading}
            isError={activeResult.isError}
            isFetching={activeResult.isFetching}
            refetch={activeResult.refetch}
            activeAddress={activeAddress}
            icon={activeProtocol.icon}
          />
        </div>
      </div>

      {/* Mobile: single-open accordion */}
      <div className="mt-3 space-y-1 px-3 pb-3 lg:hidden">
        {PROTOCOLS.map((protocol, i) => {
          const isActive = protocol.id === activeId;
          const result = results[i];
          const badge = protocol.getBadge(result.data, t);
          return (
            <div key={protocol.id}>
              <ProtocolListRow
                protocol={protocol}
                isActive={isActive}
                onClick={() => setActiveId(protocol.id)}
                balance={balanceFor(protocol, result)}
                t={t}
              />
              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-1 pb-2 pt-3">
                      {badge && (
                        <div className="mb-4">
                          <StatusBadge label={badge.label} tone={badge.tone} dot />
                        </div>
                      )}
                      <protocol.DetailComponent
                        data={result.data}
                        isLoading={result.isLoading}
                        isError={result.isError}
                        isFetching={result.isFetching}
                        refetch={result.refetch}
                        activeAddress={activeAddress}
                        icon={protocol.icon}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
