// Placeholder auth layer — no backend exists yet. Each function simulates a
// network round trip so the real API can be dropped in later (see
// store/useAuthStore.js and hooks/useAuthSync.js) without changing any call
// sites. Connecting a wallet is meant to double as signing in: once a real
// endpoint exists, it likely verifies a signed message from `address`
// rather than trusting the address alone.

const MOCK_LATENCY_MS = 300;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function signIn(address) {
  await delay(MOCK_LATENCY_MS);
  return {
    address,
    token: `mock-session-${address}`,
    authenticatedAt: Date.now(),
  };
}

export async function signOut() {
  await delay(MOCK_LATENCY_MS);
  return true;
}
