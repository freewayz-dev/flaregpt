import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClockIcon } from "@heroicons/react/24/outline";

function KpiSkeleton() {
  return (
    <div className="rounded-2xl bg-surface-card p-4 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="skeleton h-3 w-16 rounded" />
      <div className="skeleton mt-2.5 h-5 w-12 rounded" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="skeleton h-8 w-8 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-2.5 w-14 rounded" />
      </div>
      <div className="skeleton h-3 w-16 rounded" />
    </div>
  );
}

// R3: an honest wait, not a bare spinner. A plain spinner reads as "a few
// seconds" — at the multi-minute end of what an un-paginated 10,000+
// action wallet can take today, that same spinner reads as broken well
// before it resolves. Naming the actual expectation, plus a visibly
// ticking elapsed timer, is what keeps this from looking hung — R15
// (see useWalletActivityNotifier) is what lets a visitor stop staring at
// it entirely and get on with the rest of the dashboard instead.
export default function WalletActivitySkeleton() {
  const { t } = useTranslation();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-brand/5 border border-brand/20 p-4">
        <ClockIcon className="h-5 w-5 shrink-0 text-brand" />
        <div>
          <p className="text-sm font-medium text-ink-primary">
            {t("wallet.activity.loading.title")}
          </p>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {t("wallet.activity.loading.subtitle")}
          </p>
          <p className="mt-1.5 text-[11px] tabular-nums text-ink-muted">
            {t("wallet.activity.loading.elapsed", { seconds: elapsedSeconds })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>

      <div className="rounded-2xl bg-surface-card p-4 shadow-sm border border-[#E5E7EB] dark:border-none">
        <div className="skeleton h-9 w-full max-w-xs rounded-xl" />
      </div>

      <div className="rounded-2xl bg-surface-card border border-[#E5E7EB] dark:border-none shadow-sm divide-y divide-divider overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
