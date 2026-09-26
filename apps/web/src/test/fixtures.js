

// Shared test wallet addresses — extracted after Phase 1 showed the same
// literal address independently hardcoded in six places (five test files
// plus mocks/wagmi.js's own default) for the same concept ("a valid test
// wallet"). Not speculative: this is deduplicating an actual, observed
// repetition, not pre-building for imagined future needs. One canonical,
// pre-checksummed source also removes a real failure mode Phase 0 hit
// directly — wagmi's mock connector validates addresses against viem's
// strict EIP-55 checksum, so a hand-typed repeated-digit string can look
// fine and still throw the moment a test actually connects.
export const TEST_ADDRESSES = {
  primary: "0x1111111111111111111111111111111111111111",
  watchlist: "0x2222222222222222222222222222222222222222",
  stale: "0x3333333333333333333333333333333333333333",
};

// Same reasoning as TEST_ADDRESSES above: found independently hand-typed
// as `const API = "https://api.flaregpt.io"` in five separate test files
// (plus MSW's own handlers.js) — one canonical source instead of six
// copies that could silently drift apart from the real backend host (see
// apiClient.js) or from each other.
export const API_BASE = "https://api.flaregpt.io";
