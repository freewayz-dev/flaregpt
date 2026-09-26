import { useTranslation } from "react-i18next";
import {
  BanknotesIcon,
  CurrencyDollarIcon,
  Square3Stack3DIcon,
  BuildingLibraryIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

import StatCard from "@/components/cards/StatCard";
import InfoHint from "@/components/common/InfoHint";
import { useCurrency } from "@/hooks/useCurrency";

// Same horizontal-scroll-on-mobile / grid-on-desktop wrapper every other
// page's own stat row hand-rolls (FireStatsRow, RewardsOverviewStats) — no
// shared generic StatRow component exists in this codebase to reuse
// instead. `supply`/`agents` (and `supply.price_usd` within it) are always
// present, on both the FlareMetrics and on-chain-fallback response shapes
// — `proof_of_reserve`/`holders` are FlareMetrics-only (null on the
// fallback), so those two cards are the entries here that are conditional
// rather than part of a fixed row.
//
// Tooltips (`hint`) only on the three genuinely jargon-y figures (cap used,
// core vault share, reserve ratio) — TVL, price, agent count, and holders
// are plain enough on their own that a tooltip would just add noise.
export default function FassetsStatsRow({ supply, agents, proofOfReserve, holders }) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();

  const cards = [
    {
      title: t("fassets.stats.tvl"),
      value: formatCurrency(supply.tvl_usd, { maximumFractionDigits: 0 }),
      icon: BanknotesIcon,
      emphasis: true,
    },
    {
      // A plain, unemphasized card right next to TVL (the two are directly
      // related) rather than a colored "change" figure — `price_usd` is a
      // single live snapshot with no historical comparison anywhere in
      // this response, so showing it as a delta would imply a trend this
      // data doesn't actually support.
      title: t("fassets.stats.price"),
      value: formatCurrency(supply.price_usd, { maximumFractionDigits: 4 }),
      icon: CurrencyDollarIcon,
    },
    {
      title: t("fassets.stats.agentCount"),
      value: agents.count,
      icon: BuildingLibraryIcon,
    },
    {
      title: t("fassets.stats.coreVaultShare"),
      value: `${agents.core_vault_share_pct.toFixed(1)}%`,
      icon: BuildingLibraryIcon,
      hint: (
        <InfoHint label={t("fassets.stats.coreVaultShare")}>
          {t("fassets.stats.coreVaultShareHelp")}
        </InfoHint>
      ),
    },
  ];

  // `cap_used_pct` (unlike every other field above) is computed server-side
  // from `minting_cap`, which is itself FlareMetrics-only — confirmed live
  // null on the on-chain-fallback response (`degraded: true`), the same
  // shape `proof_of_reserve`/`holders` already null out under. This one was
  // missed when this page was first built (it crashed the whole page via
  // `.toFixed` on `null`), so it now gets the identical conditional
  // treatment those two already have.
  if (supply.cap_used_pct != null) {
    cards.push({
      title: t("fassets.stats.capUsed"),
      value: `${supply.cap_used_pct.toFixed(1)}%`,
      icon: Square3Stack3DIcon,
      hint: (
        <InfoHint label={t("fassets.stats.capUsed")}>{t("fassets.stats.capUsedHelp")}</InfoHint>
      ),
    });
  }

  if (proofOfReserve) {
    cards.push({
      title: t("fassets.stats.reserveRatio"),
      value: `${proofOfReserve.ratio_pct.toFixed(1)}%`,
      icon: ShieldCheckIcon,
      hint: (
        <InfoHint label={t("fassets.stats.reserveRatio")}>
          {t("fassets.stats.reserveRatioHelp")}
        </InfoHint>
      ),
    });
  }

  if (holders != null) {
    cards.push({
      title: t("fassets.stats.holders"),
      value: holders.toLocaleString(),
      icon: UsersIcon,
    });
  }

  return (
    <div>
      {/* Deliberately scrollable at every breakpoint, not just mobile — with
          7 cards this row never switches to a grid the way every other
          page's own stat row does (Dashboard's StatRow, Fire's
          FireStatsRow, ...): a 7-column grid on even a wide desktop squeezes
          every card too narrow for its own title/value to fit without
          truncating. `isolate` + `overscroll-x-contain` keep the scroll
          gesture fully self-contained (its own stacking context, no
          scroll-chaining into the page). The `-mx-* px-*` bleed matches
          `DashboardLayout`'s own responsive page padding (`p-4` under `md`,
          `p-6` at `md` and up) at each step, so the row's edges reach the
          true page edge at every width instead of just on mobile —
          `scroll-pl-*`/`scroll-pr-*` are kept in lockstep with that same
          responsive padding (`md:scroll-pl-6 md:scroll-pr-6`); left at a
          flat `scroll-pl-4`, a mandatory-snap container silently forces
          `scrollLeft` a few pixels off zero on load at `md`+ to reconcile
          the (larger) real padding against the (smaller) declared
          scroll-padding, which is what very slightly left-shifted every
          card here relative to every other card section on the page.
          `overflow-y-hidden` fixes a separate, shared bug: `overflow-x:
          auto` with no explicit `overflow-y` makes browsers compute
          `overflow-y` as `auto` too (a real CSS Overflow Module rule, not a
          Tailwind quirk), turning this row into a hidden *vertical* scroll
          container as well. With nothing visibly taller than a card, that
          sounds harmless — except `StatCard`'s own `hint` (an `InfoHint`)
          renders its popover panel always-mounted, just invisible when
          closed (`invisible`/`opacity-0`, not `display:none` — see
          InfoHint.jsx's own comment on why), and that invisible ~124px-tall
          panel still counts toward this row's scrollable content height.
          The net effect, confirmed by measuring it live: a real ~40px of
          vertical scroll room nobody intended, reachable by a mouse wheel
          or a vertical drag over the cards — which is what let the row
          scroll upward and visually duck under the Disclosure above it.
          Every other page's own stat row shares the exact same
          `overflow-x-auto`-without-`overflow-y` root cause and gets the
          identical one-utility fix. */}
      <div className="isolate flex gap-3 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain snap-x snap-mandatory scroll-pl-4 scroll-pr-4 md:scroll-pl-6 md:scroll-pr-6 -mx-4 px-4 md:-mx-6 md:px-6 pb-2 scrollbar-none">
        {cards.map((card) => (
          // 172px on mobile — narrower than the flat 188px this row used at
          // every breakpoint before (confirmed via a UX review: that made
          // each card, and the row as a whole, feel oversized on a phone
          // compared to the rest of the dashboard), but not as narrow as the
          // 150px every other stat row settles on (Dashboard's StatRow,
          // RewardsOverviewStats, FireStatsRow) — this row's own "Total
          // Value Locked" title (unlike those rows' shorter "TVL"/"Market
          // Cap"-length labels) genuinely doesn't fit StatCard's truncating
          // title at 150px, confirmed live: it clipped to "Total Value
          // Lo…". Widening just enough to fit it, rather than truncating
          // the visible text or shortening the label itself, matches the
          // standing rule against solving a cramped layout by cutting
          // content — 172px is the real minimum this row's longest title
          // needs. Still widens to 188px at sm+ (unchanged from before) and
          // stays scrollable rather than becoming a grid at any breakpoint
          // (see this block's own comment above on why 7 cards don't fit a
          // grid even on a wide desktop).
          <div key={card.title} className="min-w-[172px] sm:min-w-[188px] snap-start">
            <StatCard {...card} />
          </div>
        ))}
      </div>

      {/* `agents.in_liquidation` (a network-wide count, distinct from the
          per-agent boolean the agent table already shows) was previously
          fetched by nothing on this page — a real gap, since it directly
          answers "is anything wrong right now" at a glance. Shown only when
          non-zero, same "neutral fact, not an alarm" treatment as
          payment_defaults elsewhere on this page: most of the time there's
          nothing to say here, so nothing renders rather than a permanent
          "0 in liquidation" reassurance line competing for attention. */}
      {agents.in_liquidation > 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          {t("fassets.stats.agentsInLiquidation", { count: agents.in_liquidation })}
        </p>
      )}
    </div>
  );
}
