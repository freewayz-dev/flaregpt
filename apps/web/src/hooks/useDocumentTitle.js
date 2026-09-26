import { useEffect } from "react";

const SITE_NAME = "FlareGPT";
const SITE_ORIGIN = "https://www.flaregpt.io";

// A full react-helmet-style head manager is more than this app needs today
// — there's only ever one other public, indexable route besides the
// landing page (/terms — see robots.txt/sitemap.xml), so a whole library
// for managing per-route <head> tags would be solving a problem this app
// doesn't have yet. But that one other route still needs its *canonical*
// tag corrected, specifically: leaving it pointed at the static
// `https://www.flaregpt.io/` from index.html (which is what a page that
// calls only the old single-argument form got) tells Google "this page is
// a duplicate of the homepage, index that instead" — which is exactly
// backwards for a real, sitemapped, distinct page.
//
// This also updates the Open Graph/Twitter tags, not just title/description/
// canonical — that used to be skipped on the reasoning that social unfurl
// bots (X, LinkedIn, Slack) don't execute JS, so they'd never see a
// client-side update anyway. That reasoning no longer holds: prerender.ts
// now visits every public route with a real headless browser (Puppeteer)
// *after* this effect has run, and bakes the resulting DOM — OG tags
// included — into that route's own static dist/*/index.html. A social bot
// fetching /terms in production gets that prerendered file directly, not
// index.html's SPA shell, so getting this right here is what actually
// fixes the shared-link preview for every route beyond "/", not a
// best-effort nicety.
const SELECTORS = {
  description: 'meta[name="description"]',
  canonical: 'link[rel="canonical"]',
  ogTitle: 'meta[property="og:title"]',
  ogDescription: 'meta[property="og:description"]',
  ogUrl: 'meta[property="og:url"]',
  twitterTitle: 'meta[name="twitter:title"]',
  twitterDescription: 'meta[name="twitter:description"]',
};

function setMetaContent(selector, value) {
  const el = document.querySelector(selector);
  const previous = el?.getAttribute(el.tagName === "LINK" ? "href" : "content") ?? null;
  if (el) el.setAttribute(el.tagName === "LINK" ? "href" : "content", value);
  return () => {
    if (el && previous != null) el.setAttribute(el.tagName === "LINK" ? "href" : "content", previous);
  };
}



export function useDocumentTitle(
  title,
  { description, path } = {},
) {
  useEffect(() => {
    const previousTitle = document.title;
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    const restoreFns = [
      title ? setMetaContent(SELECTORS.ogTitle, fullTitle) : null,
      title ? setMetaContent(SELECTORS.twitterTitle, fullTitle) : null,
      description ? setMetaContent(SELECTORS.description, description) : null,
      description ? setMetaContent(SELECTORS.ogDescription, description) : null,
      description ? setMetaContent(SELECTORS.twitterDescription, description) : null,
      path ? setMetaContent(SELECTORS.canonical, `${SITE_ORIGIN}${path}`) : null,
      path ? setMetaContent(SELECTORS.ogUrl, `${SITE_ORIGIN}${path}`) : null,
    ].filter((fn) => fn != null);

    return () => {
      document.title = previousTitle;
      restoreFns.forEach((restore) => restore());
    };
  }, [title, description, path]);
}
