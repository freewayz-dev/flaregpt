



export default function WalletEmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="py-8 text-center rounded-2xl bg-surface-inset px-4">
      {Icon && <Icon className="h-8 w-8 mx-auto text-ink-muted mb-2" />}
      <p className="text-sm font-medium text-ink-primary">{title}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
