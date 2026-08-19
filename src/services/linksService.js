import { flareApi } from "@/services/apiClient";

// The backend's own OpenAPI description: "The source of truth FlareGPT and
// its frontend cite for official URLs — every entry hand-verified... never
// crawled or guessed." `category` maps to the one real server-side filter
// the API supports — confirmed live there is no working search/query
// parameter (a `?q=` param was tried and silently ignored, returning the
// full unfiltered list), so search stays client-side in the Links page
// itself rather than hitting this again per keystroke.
export async function fetchLinks(category, signal) {
  const { data } = await flareApi.get("/api/v1/links", {
    params: category ? { category } : undefined,
    signal,
  });
  return data;
}

// "Distinct categories currently in use — for building a filter UI without
// fetching everything" (the endpoint's own description) — built for
// exactly this page.
export async function fetchLinkCategories(signal) {
  const { data } = await flareApi.get("/api/v1/links/categories", { signal });
  return data;
}
