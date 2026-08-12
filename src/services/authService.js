

import { flareApi } from "@/services/apiClient";





// The backend remembers which nonce it issued for `address` server-side,
// so `verifySignature` only ever needs to send the signature back — never
// the nonce/message itself. Assumed response shape (not yet confirmed
// against a live backend): { "message": "<exact string to sign>" }. If the
// real endpoint instead returns a bare nonce and expects the client to
// format its own sign-in message, this is the one place that needs to
// change — nothing else references the response shape directly.
export async function requestNonce(address) {
  const { data } = await flareApi.post("/api/v1/auth/nonce", { address });
  return data;
}

export async function verifySignature(address, signature) {
  const { data } = await flareApi.post("/api/v1/auth/verify", {
    address,
    signature,
  });
  return data;
}

// No params: the Authorization header is attached automatically by
// apiClient's request interceptor, which reads the current token straight
// from useAuthStore — same as every other authenticated call. Return shape
// deliberately `unknown`, not guessed — every caller (see useAuthSync.js)
// only cares whether this call succeeds or 401s, never reads a field off
// the response.
export async function getCurrentUser() {
  const { data } = await flareApi.get("/api/v1/auth/me");
  return data;
}

export async function logout() {
  await flareApi.post("/api/v1/auth/logout");
}
