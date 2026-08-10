// Mirrors ActiveProposalCard's real structure (badge, title, vote bar,
// footer line) so there's no layout shift once real proposals resolve —
// same convention as FtsoRewardsSkeleton's CardSkeleton.
export default function ActiveProposalsSkeleton() {
  return (
    <div role="status" className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="skeleton h-3 w-16 rounded" />
      <div className="skeleton h-4 w-56 rounded mt-2" />
      <div className="mt-4 space-y-2">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-1.5 w-full rounded-full" />
      </div>
      <div className="skeleton h-3 w-24 rounded mt-3" />
    </div>
  );
}
