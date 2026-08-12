import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import {
  Squares2X2Icon,
  ArrowTrendingUpIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useCompareStrategies } from "@/hooks/queries/useDefiProtocolsQueries";
import StatCard from "@/components/cards/StatCard";
import StatCardSkeleton from "@/pages/Dashboard/components/skeletons/StatCardSkeleton";
import { PROTOCOLS} from "@/pages/DefiProtocols/protocols";

// Same deliberate erasure boundary as ProtocolExplorer.tsx's `AnyProtocol`
// — see that file for why calling `hasData`/`getBalance` polymorphically
// across PROTOCOLS' 4 differently-typed entries needs it.


const STRATEGY_AMOUNT = 10000;

function parseAprPercent(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// A calm, dashboard-style opener before the detail-heavy sections below —
// gives an at-a-glance read (best rate available, how many positions are
// actually active) without requiring a click into anything. "Protocols
// Tracked" is a static count today but grows automatically as entries are
// added to the PROTOCOLS registry, so it doubles as a quiet signal that the
// page scales rather than needing a redesign per protocol.
export default function KpiSummaryRow() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress } = useDerivedWalletHub(connectedAddress, isConnected);

  const strategies = useCompareStrategies(STRATEGY_AMOUNT);

  // Doesn't fetch every protocol the instant the page mounts — that cost
  // grows with the registry (fine at 3 protocols, not at 20). Instead it
  // rides on whatever ProtocolExplorer has already fetched for the open
  // protocol, then quietly enables the rest shortly after initial paint so
  // "Active Positions" still ends up fully accurate without ever causing a
  // burst of N simultaneous requests on load.
  const [backgroundFetchReady, setBackgroundFetchReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setBackgroundFetchReady(true), 1200);
    return () => clearTimeout(id);
  }, []);

  const vaultResults = PROTOCOLS.map((protocol) =>
    protocol.useVault(activeAddress, { enabled: backgroundFetchReady }),
  );

  const positionsLoading =
    Boolean(activeAddress) && vaultResults.some((r) => r.isLoading);

  // The background pass that fills in Sceptre/Firelight after
  // `backgroundFetchReady` flips (see above) makes `positionsLoading` go
  // true again for a moment — without this latch, the row would flash back
  // to its skeleton right after showing real numbers, which is the "loads
  // twice" flicker this guards against. Once real content has been shown
  // once, later background fetches update the numbers in place instead.
  const hasRenderedOnce = useRef(false);
  const isInitialLoad =
    !hasRenderedOnce.current && (strategies.isLoading || positionsLoading);

  if (!isInitialLoad) {
    hasRenderedOnce.current = true;
  }

  if (isInitialLoad) {
    return (
      <div className="flex gap-3 overflow-x-hidden -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCardSkeleton key={i} compact />
        ))}
      </div>
    );
  }

  // `Math.max()` called with zero arguments returns `-Infinity`, not a
  // sensible default — so this needs its own explicit "nothing to compare
  // yet" guard rather than relying on `strategies.isError` alone. Without
  // it, any state where `strategies.data` is empty/undefined but the query
  // hasn't technically errored (still loading, paused while offline, or a
  // genuinely empty `strategies` object) rendered the KPI as "-Infinity%".
  const aprValues = Object.values(strategies.data?.strategies ?? {}).map((s) =>
    parseAprPercent(s.apr),
  );
  const bestApr = strategies.isError || !aprValues.length ? null : Math.max(...aprValues);

  // A protocol that simply hasn't been opened yet (query idle, no error)
  // contributes 0 the same way a confirmed zero balance would — that's not
  // misleading, it's just not yet known. A protocol whose fetch actually
  // failed is different: counting it as 0 would assert something we don't
  // know is true, so any real error takes the whole KPI to "—" rather than
  // a confident-looking number that might be wrong.
  const anyVaultErrored =
    Boolean(activeAddress) && vaultResults.some((r) => r.isError);

  const activePositions =
    !activeAddress || anyVaultErrored
      ? null
      : PROTOCOLS.reduce((count, protocolEntry, i) => {
          const protocol = protocolEntry;
          const result = vaultResults[i];
          if (!protocol.hasData(result.data)) return count;
          const { amount } = protocol.getBalance(result.data);
          return amount > 0 ? count + 1 : count;
        }, 0);

  const cards = [
    {
      title: t("defiProtocols.kpis.protocolsTracked"),
      value: String(PROTOCOLS.length),
      icon: Squares2X2Icon,
      compact: true,
    },
    {
      title: t("defiProtocols.kpis.bestApr"),
      value: bestApr == null ? "—" : `${bestApr.toFixed(1)}%`,
      icon: ArrowTrendingUpIcon,
      compact: true,
      // The one figure someone opens this page to see — sized and colored
      // to stand out from the other two, which are context for it rather
      // than equally important on their own.
      emphasis: true,
    },
    {
      title: t("defiProtocols.kpis.activePositions"),
      value: activePositions == null ? "—" : String(activePositions),
      icon: WalletIcon,
      compact: true,
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-pl-4 scroll-pr-4 -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-3 sm:overflow-visible scrollbar-none">
      {cards.map((card) => (
        <div key={card.title} className="min-w-[150px] sm:min-w-0 snap-start">
          <StatCard {...card} />
        </div>
      ))}
    </div>
  );
}
