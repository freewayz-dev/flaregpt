import type { ComponentType, ReactNode, SVGProps } from "react";

interface WalletEmptyStateProps {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  // Optional — every existing call site omits this and renders exactly as
  // before. Added for Overview's wallet-dependent cards specifically, so
  // a first-time guest with no connected or tracked wallet has a real
  // "+ Add wallet to track" action right where the empty state already
  // tells them nothing's selected, instead of a dead end only solvable by
  // knowing Settings exists.
  action?: ReactNode;
}

export default function WalletEmptyState({ icon: Icon, title, description, action }: WalletEmptyStateProps) {
  return (
    <div className="py-8 text-center rounded-2xl bg-surface-inset px-4">
      {Icon && <Icon className="h-8 w-8 mx-auto text-ink-muted mb-2" />}
      <p className="text-sm font-medium text-ink-primary">{title}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
