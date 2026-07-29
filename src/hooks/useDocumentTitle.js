import { useEffect } from "react";

const SITE_NAME = "FlareGPT";

// A full react-helmet-style head manager is more than this app needs today
// — there's no per-route meta description/OG data to manage yet (the
// static tags in index.html cover the one real public marketing surface,
// the landing page, and non-JS crawlers only ever see those anyway — see
// index.html's own comment). This just keeps the browser tab and Google's
// own JS-rendered title in sync with whatever page is actually open,
// which static index.html can't do for anything past the very first route.
export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
