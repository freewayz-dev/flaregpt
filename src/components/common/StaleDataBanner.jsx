import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClockIcon } from "@heroicons/react/24/outline";

import { useCacheStatusStore } from "@/store/useCacheStatusStore";

// Sibling to OfflineBanner, not a replacement for it — a genuinely
// different condition. OfflineBanner means "this device has no network
// connection." This means "the device is online, but the service worker's
// financial-reads cache had to stand in for a live fetch" (a slow
// connection, a timeout, a backend hiccup) — see src/sw.ts's
// `cacheHitMarkerPlugin` and apiClient.ts's response interceptor, the only
// writer of this state. Financial data must never look live when it isn't;
// this is what makes that promise visible rather than silent.
export default function StaleDataBanner() {
  const { t } = useTranslation();
  const cachedAt = useCacheStatusStore((state) => state.cachedAt);
  // Re-render every 30s while a cache hit is active so "moments ago" ages
  // into "N minutes ago" without needing a fresh API response to trigger
  // it — the banner's whole point is staying accurate while nothing else
  // is happening.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (cachedAt == null) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, [cachedAt]);

  if (cachedAt == null) return null;

  const minutes = Math.floor((Date.now() - cachedAt) / 60_000);
  // `minutes`, not `count` — i18next-parser's static scan treats `count`
  // as a reserved trigger for CLDR pluralization (auto-generating `_one`/
  // `_other`/etc. keys on every extract run, regardless of what's already
  // in the JSON), which isn't wanted here — see the locale JSON files'
  // own flat `minutesAgo` key, one string per language, no plural forms.
  const message =
    minutes < 1 ? t("staleData.justNow") : t("staleData.minutesAgo", { minutes });

  return (
    <div className="flex shrink-0 items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
      <ClockIcon className="h-3.5 w-3.5 shrink-0" />
      {message}
    </div>
  );
}
