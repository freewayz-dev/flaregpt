import { useState } from "react";

// Real logos exist for most FTSO providers — a curated, address-keyed
// asset repository (github.com/TowoLabs/ftso-signal-providers, maintained
// by Towo Labs, a Flare Network development partner) — matched directly
// against this app's live provider-rankings response by address. The live
// "Unknown Provider" set isn't fixed (ranking membership shifts with
// delegated weight — it was 3 addresses in one check, 4 in the next), and
// most of those unregistered addresses have no logo there either — one
// specific address is the sole exception, with a real registered logo but
// still no registered name anywhere checked (own API, this repo's own
// per-provider metadata, FlareScan) — see ProviderRankingCard.jsx's own
// PROVIDER_LOGOS comment for that one's specifics. No equivalent address/
// NodeID-keyed logo source was found for validators after checking
// flare.space, flaremetrics.io, and Towo Labs' own validator tracker (all
// client-rendered SPAs with no fetchable public API) — validators stay on
// the initials fallback below until a reliable source exists, rather than
// guessing.
//
// Image treatment mirrors LinkLogo.jsx exactly (pulse-then-fade-in,
// rounded-full, object-cover) — the same established pattern this app
// already uses for "named entity with a real bundled logo asset" — so a
// provider's mark reads the same shape/motion wherever it appears. The
// `logoSrc` prop is what makes this opt-in per row: callers with no
// resolved logo simply never pass one, landing on the initials-circle
// fallback below instead.
// `fallbackInitial` covers the case `name` itself doesn't: a validator
// with no registered name (a real, common state — see
// ValidatorRankingCard.jsx) still has a real, always-present NodeID, so
// its caller passes the first character of *that* (prefix stripped, see
// deriveRankings.js's nodeIdInitial) instead of leaving this to fall all
// the way through to a bare "?". A provider's `name` is always a non-empty
// string even when unregistered (a real "Unknown Provider", never null —
// see deriveRankings.js), so providers never need this prop at all. "?"
// stays only as a last-resort guard for a row with neither — not a state
// any real provider or validator row actually reaches today.
export default function RankingAvatar({ name, size = 32, logoSrc, fallbackInitial }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!logoSrc || hasError) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-surface-inset text-[11px] font-semibold text-ink-secondary"
        style={{ width: size, height: size }}
      >
        {name?.charAt(0)?.toUpperCase() ?? fallbackInitial?.toUpperCase() ?? "?"}
      </span>
    );
  }

  return (
    <span className="relative flex shrink-0" style={{ width: size, height: size }}>
      {!isLoaded && <span className="absolute inset-0 animate-pulse rounded-full bg-surface-inset" />}
      <img
        ref={(node) => {
          if (node?.complete) setIsLoaded(true);
        }}
        src={logoSrc}
        alt=""
        width={size}
        height={size}
        onLoad={() => setIsLoaded(true)}
        // A source that's unusable at runtime falls back to the same
        // initials circle a missing `logoSrc` renders (re-render into the
        // branch above), rather than leaving a broken-image icon or blank
        // space where the avatar should be.
        onError={() => setHasError(true)}
        className={`h-full w-full rounded-full object-cover transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  );
}
