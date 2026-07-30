import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  CheckCircleIcon,
  BoltIcon,
  ArrowRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

import { useGasSniperStatus } from "@/hooks/queries/useLoopsQueries";
import { ROUTES } from "@/config/routes";

// Answers "does Gas Sniper actually auto-claim this wallet's rewards" —
// shown identically on the Overview FTSO card and the dedicated FTSO
// Rewards page, both reading the same real GET /api/v1/loops/gas-sniper/
// status data (confirmed live: `opted_in_wallets` is the single source of
// truth both places already checked, just duplicated inline before this).
//
// Every branch here is deliberate:
//   - loading/error render neither the "enabled" badge nor the "enable
//     it" nudge — defaulting either the query's undefined data (loading)
//     or a failed fetch (error) to "not enabled" would assert a negative
//     we haven't actually confirmed, which is exactly the kind of
//     misleading state this was built to avoid.
//   - "enabled" and "not enabled" are shown regardless of the wallet's
//     current unclaimed balance — whether Gas Sniper is on is a standing
//     fact about the wallet's configuration, not something tied to
//     whatever happens to be unclaimed at this exact moment (an earlier
//     version only showed this when unclaimed > 0, which meant the exact
//     same wallet's status would silently disappear the instant its
//     balance hit zero, even though nothing about the automation itself
//     had changed).
//   - the "enable it" nudge only appears for the active/connected wallet
//     (the only one this app could ever act for) — a watchlist wallet
//     that isn't enabled gets an explicit, non-actionable note instead of
//     silence, since silence would look identical to "we didn't check".
export default function GasSniperClaimStatus({ activeAddress, isActivePrimary, className = "" }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGasSniperStatus();

  // Applied to whichever element below actually renders, rather than a
  // wrapping div around everything — an error returns null with no
  // spacing applied at all, instead of leaving a stray empty `mt-4` gap
  // where the status used to be.
  if (isLoading) {
    return (
      <div className={`flex w-fit items-center gap-1.5 rounded-lg bg-surface-inset px-2.5 py-1.5 text-xs text-ink-muted ${className}`}>
        <ArrowPathIcon className="h-3.5 w-3.5 shrink-0 animate-spin" />
        {t("gasSniperStatus.checking")}
      </div>
    );
  }

  if (isError) return null;

  const isEnabled = Boolean(
    activeAddress &&
      data?.opted_in_wallets?.some((w) => w.toLowerCase() === activeAddress.toLowerCase()),
  );

  if (isEnabled) {
    return (
      <div className={`flex w-fit items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 ${className}`}>
        <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />
        {t("gasSniperStatus.enabled")}
      </div>
    );
  }

  if (isActivePrimary) {
    return (
      <Link
        to={ROUTES.loops}
        className={`flex w-fit items-center gap-1.5 rounded-lg bg-brand/10 px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand/20 transition-colors ${className}`}
      >
        <BoltIcon className="h-3.5 w-3.5 shrink-0" />
        {t("gasSniperStatus.nudge")}
        <ArrowRightIcon className="h-3 w-3 shrink-0" />
      </Link>
    );
  }

  // Still links to Loops, but deliberately doesn't say "enable it" the way
  // the primary-wallet nudge above does — Loops reflects whichever wallet
  // you're actually signed in as, not whichever one is selected here, so
  // for someone else's watchlist address this can only ever take you to
  // manage your *own* automation, never enable it for this one. The
  // factual note stays true regardless of where the link leads.
  return (
    <Link
      to={ROUTES.loops}
      className={`flex w-fit items-center gap-1.5 rounded-lg bg-surface-inset px-2.5 py-1.5 text-xs text-ink-muted hover:text-ink-secondary transition-colors ${className}`}
    >
      {t("gasSniperStatus.notEnabled")}
      <ArrowRightIcon className="h-3 w-3 shrink-0" />
    </Link>
  );
}
