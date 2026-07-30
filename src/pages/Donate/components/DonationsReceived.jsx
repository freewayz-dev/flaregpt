import { useTranslation } from "react-i18next";

import { DONATION_COINS } from "@/config/donation";
import TokenIcon from "@/components/common/TokenIcon";
import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import { formatAmount } from "@/utils/format";

// Same inset-tile language as WalletBalancesCard's balance grid (icon +
// symbol label, bold amount below) — a "modern dashboard component"
// reading per-coin totals rather than a plain list, per the spec. Every
// figure comes from DONATION_COINS[].receivedAmount, which is explicitly
// placeholder/demo data until a real donations API exists; the small
// "Demo data" badge is the one honest signal of that on an otherwise
// finished-looking section, so swapping in live figures later is just
// replacing that one field per coin — no layout change needed.
export default function DonationsReceived() {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl bg-surface-card p-6 shadow-sm border border-[#E5E7EB] dark:border-none sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">
            {t("donate.received.title")}
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            {t("donate.received.subtitle")}
          </p>
        </div>
        <StatusBadge label={t("donate.received.demoData")} tone="neutral" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {DONATION_COINS.map((coin) => (
          <div key={coin.id} className="rounded-xl bg-surface-inset p-3 min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <TokenIcon symbol={coin.symbol} size={14} />
              {coin.symbol}
            </p>
            <p className="mt-1.5 text-lg font-semibold text-ink-primary truncate">
              {formatAmount(coin.receivedAmount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
