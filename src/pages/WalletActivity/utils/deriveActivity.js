// Every function here is pure and operates on the already-fetched
// `history` array — none of it does I/O, so it's all cheap to memoize by
// reference in the components that call it (see index.jsx). `timestamp`
// on each entry is Unix seconds (not ms) per the API's own sample data.














// Intersected with `Record<string, unknown>` (not a plain `interface`) —
// same reasoning as RflrVesting's MeltScheduleRow: GenericTable's `items`
// prop needs a real string index signature to derive columns via
// `Object.keys`, which a named `interface` doesn't structurally provide
// even when every property is known.









const DAY_MS = 86_400_000;

function toDate(timestampSeconds) {
  return new Date(timestampSeconds * 1000);
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// A stable identity per row is needed for React keys, the detail drawer's
// selection, and its URL-reflected `?tx=` param — `transaction_hash` alone
// isn't unique (a single transaction can carry several token-transfer
// actions, as the API's own sample shows: one hash, two rows, one per
// asset), so this pairs it with the asset and the row's original index as
// a final tiebreaker. Computed once over the raw array as soon as it
// arrives; every derived view below carries this id through rather than
// re-deriving it.
export function withActionIds(history) {
  return history.map((item, index) => ({
    ...item,
    actionId: `${item.transaction_hash}_${item.asset}_${index}`,
  }));
}

// "SEND"/"RECEIVE" is the only confirmed pair in the one sample action_tag
// value we have ("TOKEN_SEND") — this reads whatever's actually in the
// string rather than switching on a hardcoded enum, so an unconfirmed
// future tag (e.g. "TOKEN_SWAP") degrades to "neutral" instead of being
// silently miscategorized as a send or receive.
export function getActionDirection(actionTag) {
  const upper = (actionTag ?? "").toUpperCase();
  if (upper.includes("RECEIVE")) return "in";
  if (upper.includes("SEND")) return "out";
  return "neutral";
}

export function formatActionLabel(actionTag) {
  if (!actionTag) return "";
  return actionTag
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Groups newest-first into calendar-day buckets with a human label —
// "Today"/"Yesterday" for the two most recent days, a weekday name inside
// the last week, and a full date beyond that. Buckets themselves stay in
// whatever order `items` arrives in (callers sort before grouping), so
// this only groups, it never re-sorts.
export function groupByDay(items, { locale } = {}) {
  const groups = [];
  const indexByKey = new Map();
  const now = new Date();
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(new Date(now.getTime() - DAY_MS));

  for (const item of items) {
    const date = toDate(item.timestamp);
    const key = dayKey(date);

    if (!indexByKey.has(key)) {
      let label;
      if (key === todayKey) label = "today";
      else if (key === yesterdayKey) label = "yesterday";
      else if (now.getTime() - date.getTime() < 6 * DAY_MS) {
        label = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
      } else {
        label = new Intl.DateTimeFormat(locale, {
          month: "short",
          day: "numeric",
          year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
        }).format(date);
      }
      indexByKey.set(key, groups.length);
      groups.push({
        key,
        label,
        labelKind: label === "today" || label === "yesterday" ? label : "custom",
        items: [],
      });
    }
    groups[indexByKey.get(key)].items.push(item);
  }

  return groups;
}

// Wallet age expressed as the single largest sensible unit ("2 years" /
// "8 months" / "14 days") rather than a raw date — R3 in the approved
// review specifically asked for this over a bare "First Activity"
// timestamp, since a duration reads more naturally at a glance than a date
// you have to do the subtraction on yourself.
export function computeWalletAge(firstTimestampSeconds) {
  const ms = Date.now() - firstTimestampSeconds * 1000;
  const days = Math.max(0, Math.floor(ms / DAY_MS));
  if (days >= 365) return { unit: "years", count: Math.floor(days / 365) };
  if (days >= 30) return { unit: "months", count: Math.floor(days / 30) };
  return { unit: "days", count: days };
}

// Total transaction count deliberately reads from `total_actions_indexed`
// (the API's own authoritative count) rather than `history.length` — once
// backend pagination lands, `history` will only ever hold one page's worth
// of rows while this field should keep reporting the true grand total, so
// reading it from here now means the KPI doesn't quietly go stale the day
// pagination ships.
export function computeKpis(
  history,
  totalActionsIndexed,
) {
  if (!history.length) return null;
  const uniqueAssets = new Set(history.map((h) => h.asset));
  const timestamps = history.map((h) => h.timestamp);
  const firstTimestamp = Math.min(...timestamps);
  const lastTimestamp = Math.max(...timestamps);

  return {
    totalTransactions: totalActionsIndexed,
    uniqueAssetCount: uniqueAssets.size,
    walletAge: computeWalletAge(firstTimestamp),
    lastActiveTimestamp: lastTimestamp,
  };
}

function topEntry(counts) {
  let best = null;
  for (const [key, count] of counts) {
    if (!best || count > best.count) best = { key, count };
  }
  return best;
}

// Counts only — every insight here is a tally over fields already in the
// response (asset, action_tag, calendar day/month derived from
// timestamp), never an amount or a value. That's deliberate: summing
// `amount` across different assets (WFLR + sFLR + FLR...) with no price
// data would be exactly the fabricated-looking metric the design review
// flagged and rejected.
export function computeQuickInsights(
  history,
  { locale } = {},
) {
  if (!history.length) return null;

  const assetCounts = new Map();
  const actionCounts = new Map();
  const dayCounts = new Map();
  const monthCounts = new Map();
  const dayLabels = new Map();
  const monthLabels = new Map();

  for (const item of history) {
    assetCounts.set(item.asset, (assetCounts.get(item.asset) ?? 0) + 1);
    actionCounts.set(item.action_tag, (actionCounts.get(item.action_tag) ?? 0) + 1);

    const date = toDate(item.timestamp);
    const dKey = dayKey(date);
    dayCounts.set(dKey, (dayCounts.get(dKey) ?? 0) + 1);
    if (!dayLabels.has(dKey)) {
      dayLabels.set(
        dKey,
        new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(date),
      );
    }

    const mKey = `${date.getFullYear()}-${date.getMonth()}`;
    monthCounts.set(mKey, (monthCounts.get(mKey) ?? 0) + 1);
    if (!monthLabels.has(mKey)) {
      monthLabels.set(mKey, new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date));
    }
  }

  const mostUsedAsset = topEntry(assetCounts);
  const mostCommonAction = topEntry(actionCounts);
  const mostActiveDay = topEntry(dayCounts);
  const mostActiveMonth = topEntry(monthCounts);

  return {
    mostUsedAsset: mostUsedAsset && { asset: mostUsedAsset.key, count: mostUsedAsset.count },
    mostCommonAction: mostCommonAction && {
      action: mostCommonAction.key,
      label: formatActionLabel(mostCommonAction.key),
      count: mostCommonAction.count,
    },
    mostActiveDay: mostActiveDay && { label: dayLabels.get(mostActiveDay.key), count: mostActiveDay.count },
    mostActiveMonth: mostActiveMonth && {
      label: monthLabels.get(mostActiveMonth.key),
      count: mostActiveMonth.count,
    },
  };
}

// A wallet whose history spans hundreds of days used to get one bar per
// calendar day no matter what — for a genuinely active wallet that's
// hundreds of sub-pixel-wide bars packed into a ~300px-wide card, which
// communicates nothing (confirmed live: a ~300-day wallet rendered 291
// individual bars) while still costing Recharts a full re-layout of every
// one of them. That redraw cost is what actually surfaced as sidebar-
// toggle jank on this page specifically: the sidebar's width transition
// (see Sidebar.jsx) continuously resizes this chart's container for
// ~300ms, and ResponsiveContainer redraws on every resize event. Capping
// the bucket count keeps both the chart readable and its redraw cost
// bounded regardless of how long a wallet's history actually is, instead
// of only patching the symptom (see ActivityCharts.jsx's `debounce` prop,
// which helps but doesn't fully absorb an unbounded bar count on its own).
const MAX_HISTOGRAM_BUCKETS = 60;

// Daily (or, for a long enough history, multi-day) transaction counts for
// the activity histogram — the one chart the design review confirmed is
// honest with today's data (a count over time, never an amount). Filled
// forward so quiet buckets still show as a gap rather than being silently
// absent from the x-axis.
export function computeDailyHistogram(history) {
  if (!history.length) return [];

  const timestamps = history.map((h) => h.timestamp);
  const start = new Date(Math.min(...timestamps) * 1000);
  const end = new Date(Math.max(...timestamps) * 1000);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const totalDays = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  const bucketDays = Math.max(1, Math.ceil(totalDays / MAX_HISTOGRAM_BUCKETS));

  const counts = new Map();
  for (const item of history) {
    const date = toDate(item.timestamp);
    date.setHours(0, 0, 0, 0);
    const bucketIndex = Math.floor((date.getTime() - start.getTime()) / (DAY_MS * bucketDays));
    counts.set(bucketIndex, (counts.get(bucketIndex) ?? 0) + 1);
  }

  const formatDay = (d) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
  const bucketCount = Math.ceil(totalDays / bucketDays);
  const buckets = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = new Date(start.getTime() + i * bucketDays * DAY_MS);
    const label =
      bucketDays === 1
        ? formatDay(bucketStart)
        : `${formatDay(bucketStart)}–${formatDay(new Date(bucketStart.getTime() + (bucketDays - 1) * DAY_MS))}`;
    buckets.push({
      date: bucketStart.getTime(),
      label,
      count: counts.get(i) ?? 0,
    });
  }
  return buckets;
}

export function computeAssetBreakdown(history) {
  const counts = new Map();
  for (const item of history) counts.set(item.asset, (counts.get(item.asset) ?? 0) + 1);
  return [...counts.entries()]
    .map(([asset, count]) => ({ asset, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeActionBreakdown(history) {
  const counts = new Map();
  for (const item of history) counts.set(item.action_tag, (counts.get(item.action_tag) ?? 0) + 1);
  return [...counts.entries()]
    .map(([action, count]) => ({ action, label: formatActionLabel(action), count }))
    .sort((a, b) => b.count - a.count);
}

const RANGE_TO_MS = {
  "7D": 7 * DAY_MS,
  "30D": 30 * DAY_MS,
  "90D": 90 * DAY_MS,
};



export function filterActivity(
  history,
  { search, assets, actions, dateRange },
) {
  const now = Date.now();
  const rangeMs = dateRange && dateRange !== "ALL" ? RANGE_TO_MS[dateRange] : null;
  const query = search?.trim().toLowerCase();

  return history.filter((item) => {
    if (assets?.size && !assets.has(item.asset)) return false;
    if (actions?.size && !actions.has(item.action_tag)) return false;
    if (rangeMs && now - item.timestamp * 1000 > rangeMs) return false;
    if (query) {
      const haystack = `${item.transaction_hash} ${item.asset} ${formatActionLabel(item.action_tag)}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

// "amount" sort is intentionally not offered here at all when more than
// one asset is present in the working set — the toolbar enforces that by
// only exposing it once a single-asset filter narrows things down (mixed
// WFLR/sFLR/FLR amounts aren't comparable on one axis without price data).
export function sortActivity(items, sortKey) {
  const sorted = [...items];
  switch (sortKey) {
    case "oldest":
      return sorted.sort((a, b) => a.timestamp - b.timestamp);
    case "amount":
      return sorted.sort((a, b) => b.amount - a.amount);
    case "newest":
    default:
      return sorted.sort((a, b) => b.timestamp - a.timestamp);
  }
}

function csvEscape(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const CSV_COLUMNS = ["timestamp", "action_tag", "asset", "amount", "transaction_hash", "block_number"];

export function toCsv(items) {
  const header = CSV_COLUMNS.join(",");
  const rows = items.map((item) =>
    CSV_COLUMNS.map((col) => csvEscape(col === "timestamp" ? new Date(item.timestamp * 1000).toISOString() : item[col])).join(
      ",",
    ),
  );
  return [header, ...rows].join("\n");
}

export function toJson(items) {
  return JSON.stringify(
    // eslint-disable-next-line no-unused-vars -- rest-sibling exclusion, not a genuinely unused binding
    items.map(({ actionId, ...rest }) => rest),
    null,
    2,
  );
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
