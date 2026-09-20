// Shared numeric-formatting helpers reused across DeFi Protocols, Dashboard,
// Wallet Activity, and Donate — previously copy-pasted (identically, aside
// from which default fraction-digit count each call site happened to want)
// into 8 separate files.
export function formatAmount(value, maxFractionDigits = 4) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

// Previously duplicated identically across rFLR Vesting's VestingProgressCard
// and NetworkPulseSection. `locale` is optional (defaults to the runtime's
// own locale via `toLocaleDateString`'s own `undefined` behavior) so every
// existing call site keeps working unchanged — pass `i18n.language`
// explicitly wherever this app's own selected language should win over
// whatever the browser itself is set to (the two can genuinely differ).
export function formatDate(dateStr, locale) {
  return new Date(dateStr).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Previously defined independently in both rFLR Vesting's
// VestingOverviewStats and FTSO Rewards' RewardsOverviewStats (each also
// exported and cross-imported by a sibling card in its own page) — merged
// into the one shared definition, since the only difference was FTSO
// Rewards' version accepting an optional `options` override.
export function formatFlr(value, options) {
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 4, ...options })} FLR`;
}
