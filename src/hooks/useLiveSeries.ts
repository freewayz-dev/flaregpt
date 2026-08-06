import { useEffect, useRef, useState } from "react";

// Builds a rolling time series in-memory from repeated live values (e.g. a
// polled API value). Useful when an endpoint only exposes a current snapshot
// but polling it regularly still produces a genuine, real "live" chart.
//
// `updatedAt` should be the query's own `dataUpdatedAt` timestamp, not a
// locally-generated one. A new point is appended whenever `updatedAt`
// changes — i.e. whenever a fetch actually resolved — regardless of whether
// the value itself changed. Keying off value-equality instead (the original
// implementation) meant a stable reading (e.g. gas price unchanged between
// polls, which is common) never produced a second point, so the chart got
// stuck on "collecting samples" indefinitely.
interface SeriesPoint {
  time: number;
  value: number;
}

export function useLiveSeries(
  value: number | null | undefined,
  updatedAt: number | null | undefined,
  maxPoints = 30,
) {
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const lastUpdatedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === undefined || value === null) return;
    if (updatedAt === undefined || updatedAt === null) return;
    if (lastUpdatedAtRef.current === updatedAt) return;
    lastUpdatedAtRef.current = updatedAt;

    setSeries((prev) => {
      const next = [...prev, { time: updatedAt, value }];
      return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
    });
  }, [value, updatedAt, maxPoints]);

  return series;
}
