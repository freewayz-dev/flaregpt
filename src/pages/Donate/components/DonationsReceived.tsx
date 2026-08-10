import { useTranslation } from "react-i18next";
import { InboxIcon } from "@heroicons/react/24/outline";

import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";

// No donations API/indexer exists yet — this section previously showed
// fabricated per-coin totals behind a "Demo data" badge, which read as
// real activity at a glance. Until a real backend exists to report actual
// received amounts, an honest empty state is the only accurate thing to
// show here; see WalletEmptyState for the same pattern WalletActivity
// already uses for its own zero-result state.
export default function DonationsReceived() {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl bg-surface-card p-6 shadow-sm border border-[#E5E7EB] dark:border-none sm:p-8">
      <h3 className="text-sm font-semibold text-ink-primary">
        {t("donate.received.title")}
      </h3>
      <p className="mt-1 text-xs text-ink-muted">
        {t("donate.received.subtitle")}
      </p>

      <div className="mt-5">
        <WalletEmptyState
          icon={InboxIcon}
          title={t("donate.received.empty.title")}
          description={t("donate.received.empty.description")}
        />
      </div>
    </div>
  );
}
