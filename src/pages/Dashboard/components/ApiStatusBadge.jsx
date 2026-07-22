import { useHealth } from "@/hooks/queries/useDashboardQueries";

export default function ApiStatusBadge() {
  const { data, isLoading, isError } = useHealth();
  const isHealthy = !isError && data?.status === "ok";

  const dotClass = isLoading
    ? "bg-slate-400"
    : isHealthy
      ? "bg-emerald-500 animate-pulse"
      : "bg-red-500";

  const label = isLoading
    ? "Checking API status..."
    : isHealthy
      ? "All systems operational"
      : "API degraded";

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />
      {label}
    </div>
  );
}
