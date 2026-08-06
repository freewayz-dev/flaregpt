import { useTranslation } from "react-i18next";

// Static rows, deliberately not the animated `.skeleton` class real loading
// states use elsewhere in this app — these tables aren't loading, they're
// just not wired up to a backend yet, and a shimmering placeholder would
// misleadingly suggest data is about to arrive any second. A muted, still
// preview reads as "this is the shape it'll take," not "please wait."
function PlaceholderRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-8 w-8 shrink-0 rounded-lg bg-surface-inset" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 w-28 rounded bg-surface-inset" />
        <div className="h-2 w-16 rounded bg-surface-inset" />
      </div>
      <div className="h-2.5 w-12 rounded bg-surface-inset" />
    </div>
  );
}

// Reused for both FTSO Providers and Staking Validators Ranking — same
// "ranked list of entities" shape, just waiting on two different not-yet-
// available endpoints. Matches the rest of this page's card chrome
// (rounded-2xl, surface-card, same padding/border) so it reads as part of
// the dashboard rather than a bolted-on stub.
import type { ComponentType, SVGProps } from "react";

interface ComingSoonTableCardProps {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

export default function ComingSoonTableCard({
  icon: Icon,
  title,
  description,
}: ComingSoonTableCardProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="h-4 w-4 text-ink-muted shrink-0" />}
          <h3 className="text-sm font-semibold text-ink-primary truncate">{title}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
          {t("comingSoon.badge")}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-muted max-w-md">{description}</p>

      <div className="mt-4 divide-y divide-divider opacity-60">
        {Array.from({ length: 4 }).map((_, i) => (
          <PlaceholderRow key={i} />
        ))}
      </div>
    </div>
  );
}
