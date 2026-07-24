// Shared body-only skeleton for every protocol detail panel — the panel
// chrome (icon/title/subtitle) is rendered once by ProtocolExplorer itself,
// so only the content shape needs to be mirrored here: a headline stat (with
// its own small token-icon placeholder), the two "Your Balance" /
// "Redeemable Value" rows every protocol with a bar also has, the position
// bar itself, and the collapsed "protocol details" toggle. Sized and ordered
// to match the real SceptreDetail/FirelightDetail/MxrpyDetail output so
// nothing pops in below where the skeleton left room for it.
export default function DetailSkeleton({ withBar = false }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <div className="skeleton h-[18px] w-[18px] rounded-full shrink-0" />
        <div className="skeleton h-8 w-32 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>

      {withBar && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between py-2">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-3.5 w-16 rounded" />
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="skeleton h-3 w-28 rounded" />
            <div className="skeleton h-3.5 w-14 rounded" />
          </div>
        </div>
      )}

      {!withBar && <div className="skeleton h-3 w-32 rounded mt-2" />}
      <div className="skeleton h-3 w-56 rounded mt-4" />

      {withBar && (
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-3 w-10 rounded" />
          </div>
          <div className="skeleton h-1.5 w-full rounded-full" />
        </div>
      )}

      <div className="mt-5 border-t border-divider pt-4">
        <div className="skeleton h-3 w-28 rounded" />
      </div>
    </div>
  );
}
