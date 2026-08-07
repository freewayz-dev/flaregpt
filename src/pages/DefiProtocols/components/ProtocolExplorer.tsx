import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { ChevronRightIcon, ShareIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import StatusBadge, { type StatusTone } from "@/pages/DefiProtocols/components/shared/StatusBadge";
import SensitiveValue from "@/components/common/SensitiveValue";
import { PROTOCOLS, type ProtocolRegistryEntry } from "@/pages/DefiProtocols/protocols";
import { formatAmount } from "@/utils/format";
import { shareOrCopy } from "@/utils/share";
import { ROUTES } from "@/config/routes";

// `unknown` here is a deliberate, minimal type-erasure boundary, not a
// guess — `PROTOCOLS` is a tuple of 4 differently-typed entries
// (`ProtocolRegistryEntry<MxrpyVaultResponse>`, `<SceptreVaultResponse>`,
// ...), and this generic list/detail shell calls `hasData`/`getBalance`/
// `getBadge`/`DetailComponent` polymorphically across all four in the same
// `.map()`/reindex — each individual call is always against ITS OWN
// entry's real data at runtime, but TypeScript has no way to statically
// prove that per-index correlation across two separately-`.map()`'d
// arrays (confirmed: without this, TS unifies the union of all 4 entries'
// function signatures by *intersecting* their parameter types, which
// no real value can ever satisfy). Widening to `unknown` here — matching
// this file's own actual polymorphic usage, not the specific shapes
// protocols.tsx and each Detail component still use internally — is
// what real generic registries like this require without far heavier
// tuple-mapping machinery than a display shell warrants. This assignment
// is only legal under bivariant parameter checking (`strictFunctionTypes`
// off, i.e. `strict: false` — see tsconfig.json) — a real, load-bearing
// reason `strict: true` isn't enabled project-wide, not an oversight.
type AnyProtocol = ProtocolRegistryEntry<unknown>;

interface ProtocolListRowProps {
  protocol: AnyProtocol;
  isActive: boolean;
  onClick: () => void;
  balance: string | null;
  t: TFunction;
}

function ProtocolListRow({ protocol, isActive, onClick, balance, t }: ProtocolListRowProps) {
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
            isActive ? "text-brand-text" : "text-ink-primary"
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
            <span className="text-ink-secondary">
              {" "}
              · <SensitiveValue>{balance}</SensitiveValue>
            </span>
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

// Shared by both the desktop DetailHeader and the mobile accordion below
// — `protocol.id` ("mxrpy"/"sceptre"/...) is a fixed, stable string (see
// this file's own top-of-file comment on `PROTOCOL_PARAM`), so unlike
// WalletActivity's `?tx=` id it's genuinely safe to build a real,
// reusable link from.
async function shareProtocol(protocol: AnyProtocol, t: TFunction) {
  const url = `${window.location.origin}${ROUTES.defiProtocols}?${PROTOCOL_PARAM}=${protocol.id}`;
  const result = await shareOrCopy({ title: t(protocol.titleKey), url });
  if (result === "copied") toast.success(t("defiProtocols.explorer.linkCopied"));
  else if (result === "failed") toast.error(t("defiProtocols.explorer.shareFailed"));
}

interface DetailHeaderProps {
  protocol: AnyProtocol;
  badge: { label: string; tone: StatusTone } | null;
  t: TFunction;
}

function DetailHeader({ protocol, badge, t }: DetailHeaderProps) {
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
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex flex-col items-end gap-1">
          {protocol.categoryKey && (
            <StatusBadge label={t(protocol.categoryKey)} tone="neutral" />
          )}
          {badge && <StatusBadge label={badge.label} tone={badge.tone} dot />}
        </div>
        <button
          type="button"
          onClick={() => shareProtocol(protocol, t)}
          aria-label={t("defiProtocols.explorer.shareProtocol")}
          title={t("defiProtocols.explorer.shareProtocol")}
          className="shrink-0 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-inset hover:text-ink-primary cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
        >
          <ShareIcon className="h-3.5 w-3.5" />
        </button>
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
//
// `?protocol=` mirrors WalletActivity/index.tsx's own `?tx=` param exactly
// (same `useSearchParams` + `replace: true` pattern) — added specifically
// so a Share button has a real, meaningful link to hand out: before this,
// every `/app/defi` link landed on `PROTOCOLS[0]` (MXRPY) regardless of
// which protocol the sender actually had open, making "share this
// protocol" impossible to build honestly. Unlike WalletActivity's
// `actionId` (session-derived, not portable — see ShareButton usage in
// TransactionDrawer.tsx for why that one shares an explorer link
// instead), each protocol's `id` is a fixed, stable string
// ("mxrpy"/"sceptre"/"firelight"/"spectra") — genuinely the same value
// for every user, every session, forever, so it's safe to treat as a
// real shareable identifier.
const PROTOCOL_PARAM = "protocol";

export default function ProtocolExplorer() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress } = useDerivedWalletHub(connectedAddress, isConnected);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = searchParams.get(PROTOCOL_PARAM);
  // Falls back to the default rather than trusting the URL blindly — an
  // old bookmark/link for a protocol that's since been removed from the
  // registry (or a hand-edited/garbage query string) should land
  // somewhere real, not silently break `activeIndex`'s `findIndex` below.
  const activeId = PROTOCOLS.some((p) => p.id === requestedId) ? requestedId! : PROTOCOLS[0].id;
  const setActiveId = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(PROTOCOL_PARAM, id);
    setSearchParams(next, { replace: true });
  };

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
  const activeProtocol: AnyProtocol = PROTOCOLS[activeIndex];
  const activeResult: (typeof results)[number] = results[activeIndex];
  const ActiveDetail = activeProtocol.DetailComponent;
  const activeBadge = activeProtocol.getBadge(activeResult.data, t);

  const balanceFor = (protocol: AnyProtocol, result: (typeof results)[number]) => {
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
      <div className="hidden lg:flex lg:mt-5" data-testid="protocol-explorer-desktop">
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
      <div className="mt-3 space-y-1 px-3 pb-3 lg:hidden" data-testid="protocol-explorer-mobile">
        {PROTOCOLS.map((protocolEntry, i) => {
          const protocol: AnyProtocol = protocolEntry;
          const isActive = protocol.id === activeId;
          const result: (typeof results)[number] = results[i];
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
                      <div className="mb-4 flex items-center justify-between gap-2">
                        {badge ? (
                          <StatusBadge label={badge.label} tone={badge.tone} dot />
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={() => shareProtocol(protocol, t)}
                          aria-label={t("defiProtocols.explorer.shareProtocol")}
                          title={t("defiProtocols.explorer.shareProtocol")}
                          className="shrink-0 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-inset hover:text-ink-primary cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                        >
                          <ShareIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
