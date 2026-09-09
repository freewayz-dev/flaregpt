import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClockIcon } from "@heroicons/react/24/outline";

// Deliberately NOT StaleDataBanner — that component answers a different,
// specific question ("did our own service worker have to fall back to a
// cached response because a live fetch failed?", written to by sw.js's
// cacheHitMarkerPlugin) and would just silently never fire here: the Fire
// endpoint isn't registered under any of sw.js's cache-tracking routes.
// Wiring it up for real would mean adding a new SW caching tier, which is
// its own decision this page doesn't need in order to show a plain "how
// current is this" note. This instead reads React Query's own
// `dataUpdatedAt` — genuinely present for any successful query, no extra
// wiring — and reuses the same already-translated `staleData.*` copy
// (the words are exactly right either way: "cached from N minutes ago"),
// just styled as a routine, neutral note rather than StaleDataBanner's
// amber caveat treatment, since a 30-minute server-side cache (see this
// endpoint's own `note` field) is expected behavior here, not a degraded
// state worth a warning color.
export default function FireFreshnessNote({ dataUpdatedAt }) {
  const { t } = useTranslation();
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!dataUpdatedAt) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  if (!dataUpdatedAt) return null;

  const minutes = Math.floor((Date.now() - dataUpdatedAt) / 60_000);
  const message = minutes < 1 ? t("staleData.justNow") : t("staleData.minutesAgo", { minutes });

  return (
    <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
      <ClockIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}
