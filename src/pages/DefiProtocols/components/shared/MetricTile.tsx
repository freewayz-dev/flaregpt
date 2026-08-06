// Same tile shape WalletBalancesCard uses for its balance grid
// (rounded-xl bg-surface-inset p-3) — reused here for protocol-level
// metrics (circulating supply, exchange rate, backing ratio, etc.).
import type { ComponentType, ReactNode, SVGProps } from "react";

interface MetricTileProps {
  label: string;
  value: ReactNode;
  caption?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

export default function MetricTile({ label, value, caption, icon: Icon }: MetricTileProps) {
  return (
    <div className="rounded-xl bg-surface-inset p-3 min-w-0">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-ink-muted shrink-0" />}
        <p className="text-xs text-ink-muted truncate">{label}</p>
      </div>
      <p className="mt-1 text-lg font-semibold text-ink-primary break-words">
        {value}
      </p>
      {caption && (
        <p className="mt-0.5 text-[10px] text-ink-muted truncate">{caption}</p>
      )}
    </div>
  );
}
