// The real API currently also returns one malformed, all-empty record
// (confirmed live against api.flaregpt.io) — `id`/`name` both empty is
// enough to identify it without assuming anything else about its shape.
export function isValidLink(link) {
  return Boolean(link?.id && link?.name);
}

// Category filtering happens entirely client-side per the product spec —
// the API's own `?category=` param is never used by the page, even though
// it works, so there's exactly one fetch and one place this logic lives.
export function filterLinksByCategory(links, category) {
  const validLinks = (links ?? []).filter(isValidLink);
  if (!category) return validLinks;
  return validLinks.filter((link) => link.category === category);
}

export function humanizeCategory(category) {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// `description` comes straight from the backend, which writes its own
// stylistic em/en-dash separators (e.g. "DEX and perpetuals trading on
// Flare — swaps, liquid staking..."). Only a dash with spaces on both
// sides is ever a separator like that — a bare hyphen inside a word
// ("yield-bearing", "fixed-rate") never has surrounding spaces, so this
// can't touch those.
export function cleanDescription(description) {
  if (!description) return description;
  return description.replace(/\s+[—–]\s+/g, ", ");
}
