// Route-level Suspense fallback while the FLRGPT chunk itself loads — same
// reasoning as RflrVestingPageSkeleton/FtsoRewardsPageSkeleton: a
// page-shaped fallback here avoids a generic-GlobalSpinner-then-real-page
// flash. ChatPane already owns its own internal loading state once mounted
// (`isLoadingHistory` — see its own JSX), so this only mirrors the outer
// chrome (the New Chat / History toolbar, a couple of message-shaped
// placeholders) rather than duplicating that logic. No PageHeader here,
// matching the real page — see FLRGPT's own top-of-file comment for why it
// has none.
export default function FlrgptPageSkeleton() {
  return (
    <div role="status" className="h-full flex flex-col">
      <div className="flex items-center justify-end pb-2 lg:pb-1 shrink-0">
        <div className="flex items-center gap-0.5 rounded-xl bg-surface-subtle p-0.5">
          <div className="skeleton h-7 w-7 rounded-lg" />
          <div className="skeleton h-7 w-7 rounded-lg" />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-end gap-3 px-1 pb-4">
        <div className="skeleton h-14 w-2/3 max-w-sm self-start rounded-2xl rounded-tl-md" />
        <div className="skeleton h-10 w-1/2 max-w-xs self-end rounded-2xl rounded-tr-md" />
        <div className="skeleton h-20 w-3/4 max-w-md self-start rounded-2xl rounded-tl-md" />
      </div>
    </div>
  );
}
