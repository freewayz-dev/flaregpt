import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BookOpenIcon,
  RocketLaunchIcon,
  QuestionMarkCircleIcon,
  LifebuoyIcon,
  PaperAirplaneIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

import type { SVGProps } from "react";

import PageHeader from "@/components/common/PageHeader";
import { NAV_LINKS, type NavLink } from "@/config/navigation";
import { ROUTES } from "@/config/routes";

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2";

type GuideLink = NavLink & { guideDescriptionKey: string };

// Guides are derived from the app's own nav registry rather than a
// hand-maintained list — see navigation.ts's `guideDescriptionKey`. This is
// what a page ever getting renamed, added, or retired (as happened with
// "Yield") can no longer silently leave this list stale.
const GUIDE_LINKS: GuideLink[] = NAV_LINKS.filter(
  (link): link is GuideLink => Boolean(link.guideDescriptionKey),
);

interface Faq {
  question: string;
  answer: string;
}

interface Step {
  step: string;
  title: string;
  text: string;
}

// No heroicon covers the X (formerly Twitter) logo — same mark used in
// Footer.jsx, kept in sync with it rather than each maintaining its own
// path data.
function XLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="fill-current" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// A single, quiet handoff rather than a banner or repeated CTA — Help's job
// is UI guides and human contact; anything more like "why is this number
// what it is" belongs to FlareGPT, which actually has live context Help
// never will. Shown once, at the natural end of "did I find my answer."
function AskFlareGptHandoff() {
  const { t } = useTranslation();
  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 border-t border-line pt-4 text-xs">
      <span className="text-ink-muted">{t("help.askFlareGptLead")}</span>
      <Link
        to={ROUTES.flareGpt}
        className={`inline-flex items-center gap-0.5 font-semibold text-brand hover:text-brand-hover transition-colors rounded ${FOCUS_RING}`}
      >
        {t("help.askFlareGptCta")}
        <ChevronRightIcon className="h-3 w-3" />
      </Link>
    </div>
  );
}

export default function Help() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const faqPanelIdPrefix = useId();

  const faqsList = useMemo(
    () => (t("help.faqs", { returnObjects: true }) as Faq[]) || [],
    [t],
  );
  const stepsList = useMemo(
    () => (t("help.steps", { returnObjects: true }) as Step[]) || [],
    [t],
  );

  const query = searchQuery.trim().toLowerCase();

  const filteredGuides = useMemo(() => {
    if (!query) return GUIDE_LINKS;
    return GUIDE_LINKS.filter((link) => {
      const title = t(`sidebar.${link.translationKey}`).toLowerCase();
      const description = t(link.guideDescriptionKey).toLowerCase();
      return title.includes(query) || description.includes(query);
    });
  }, [query, t]);

  const filteredFaqs = useMemo(() => {
    if (!query) return faqsList;
    return faqsList.filter(
      (faq) =>
        faq.question?.toLowerCase().includes(query) ||
        faq.answer?.toLowerCase().includes(query),
    );
  }, [query, faqsList]);

  return (
    <div className="pb-12">
      <div className="pt-3 lg:pt-0">
        <PageHeader
          title={t("sidebar.helpCenter")}
          description={t("help.headerDesc")}
        />
      </div>

      <div className="mx-auto max-w-[1440px] space-y-6 sm:space-y-8">
        {/* SEARCH */}
        <div className="relative rounded-2xl bg-surface-card p-5 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <h2 className="text-base font-semibold text-ink-primary">
              {t("help.searchTitle")}
            </h2>
            <p className="mt-1 text-xs text-[#475569] dark:text-[#6D7A86]">
              {t("help.searchSub")}
            </p>

            <div className="mt-4 relative rounded-xl shadow-sm w-full max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon
                  className="h-4 w-4 text-[#94A3B8] dark:text-[#6D7A86]"
                  aria-hidden="true"
                />
              </div>
              <input
                type="text"
                id="help-search"
                name="search"
                aria-label={t("help.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("help.searchPlaceholder")}
                className="block w-full rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] py-2 pl-9 pr-9 text-base text-ink-primary placeholder-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-none dark:bg-[#21242B] dark:focus:ring-1 dark:focus:ring-brand"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label={t("help.searchClear")}
                  className={`absolute inset-y-0 right-0 flex items-center pr-3 text-[#94A3B8] hover:text-ink-primary dark:text-[#6D7A86] dark:hover:text-white transition-colors cursor-pointer rounded-r-xl ${FOCUS_RING}`}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* GETTING STARTED */}
          <div className="order-2 lg:order-1 lg:col-span-1 flex flex-col rounded-2xl bg-surface-card p-5 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
            <div className="flex items-center gap-2 mb-6 shrink-0">
              <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
                <RocketLaunchIcon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-ink-primary">
                {t("help.gettingStarted")}
              </h3>
            </div>

            <div className="relative flex-1 border-l border-[#E5E7EB] dark:border-[#2B2F36] ml-3.5 space-y-6">
              {stepsList.map((item, index) => (
                <div key={index} className="relative pl-6 group">
                  <div className="absolute -left-[15px] top-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#FFFFFF] bg-surface-subtle text-[10px] font-bold text-[#475569] transition-colors duration-150 group-hover:border-brand/30 group-hover:bg-brand/10 group-hover:text-brand dark:border-[#161619] dark:text-[#6D7A86] dark:group-hover:text-brand">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-[#475569] dark:text-[#FAFAFA] transition-colors group-hover:text-brand">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#94A3B8] dark:text-[#6D7A86]">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FEATURE GUIDES */}
          <div className="order-1 lg:order-2 lg:col-span-2 flex flex-col space-y-6">
            <div className="rounded-2xl bg-surface-card p-5 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
              <div className="flex items-center gap-2 mb-5 shrink-0">
                <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
                  <BookOpenIcon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-ink-primary">
                  {t("help.featureGuides")}
                </h3>
              </div>
              {filteredGuides.length === 0 ? (
                <p className="text-xs text-ink-muted py-4">
                  {t("help.noGuides")}
                </p>
              ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {filteredGuides.map((link) => {
                    const IconComponent = link.icon;
                    return (
                      <Link
                        key={link.translationKey}
                        to={link.path}
                        className={`group relative rounded-xl border border-[#E5E7EB]/40 p-4 bg-[#F3F4F6] hover:bg-[#F3F4F6]/80 transition duration-150 dark:bg-[#21242B] dark:border-none dark:hover:ring-1 dark:hover:ring-brand/20 ${FOCUS_RING}`}
                      >
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-[#475569] group-hover:text-brand group-hover:bg-brand/5 group-hover:border-brand/10 transition-colors dark:bg-[#121214] dark:border-none dark:text-[#71717A]">
                          <IconComponent className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
                        </div>
                        <h4 className="text-xs font-semibold text-ink-primary">
                          {t(`sidebar.${link.translationKey}`)}
                        </h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#475569] dark:text-[#6D7A86]">
                          {t(link.guideDescriptionKey)}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl bg-surface-card p-5 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
              <QuestionMarkCircleIcon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-ink-primary">
              {t("help.faqTitle")}
            </h3>
          </div>

          {filteredFaqs.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-2 dark:text-[#FAFAFA]">
              {t("help.noFaqs")}
            </p>
          ) : (
            <div className="space-y-2.5">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openFaq === index;
                const panelId = `${faqPanelIdPrefix}-faq-${index}`;
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-[#E5E7EB]/50 bg-[#F3F4F6] transition-colors duration-150 dark:border-none dark:bg-[#21242B]"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className={`flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left cursor-pointer group rounded-xl ${FOCUS_RING}`}
                    >
                      <span className="text-xs font-medium text-[#475569] group-hover:text-ink-primary dark:group-hover:text-[#FAFAFA] transition-colors">
                        {faq.question}
                      </span>
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 ${
                          isOpen
                            ? "bg-brand/5 border-brand/20 text-brand"
                            : "bg-[#FFFFFF] border-[#E5E7EB] text-[#475569] group-hover:text-brand group-hover:bg-brand/5 group-hover:border-brand/20 dark:bg-[#121214] dark:border-none dark:text-[#71717A]"
                        }`}
                      >
                        <ChevronDownIcon
                          className={`h-3.5 w-3.5 transition-transform duration-200 ease-out ${isOpen ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>

                    {/* Same height/opacity + AnimatePresence pattern (250ms
                        easeInOut) as every other accordion in the app
                        (Disclosure.jsx, StrategyComparisonTable.jsx,
                        ProtocolExplorer.jsx) — this previously used a raw
                        CSS grid-template-rows transition at a different
                        duration, the one accordion in the app that felt
                        different from the rest for the same interaction. */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={panelId}
                          role="region"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-line/60">
                            <p className="text-xs leading-relaxed text-[#475569] dark:text-[#6D7A86]">
                              {faq.answer}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          <AskFlareGptHandoff />
        </div>

        {/* CONTACT SUPPORT */}
        <div className="rounded-2xl bg-surface-card p-5 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
              <LifebuoyIcon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-ink-primary">
              {t("help.stillNeedHelp")}
            </h3>
          </div>
          <p className="text-xs text-[#475569] dark:text-[#6D7A86] max-w-lg">
            {t("help.supportDesc")}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-center gap-3 rounded-xl bg-[#F3F4F6] p-3.5 transition-colors hover:bg-brand/5 dark:bg-[#21242B] dark:hover:bg-brand/10 ${FOCUS_RING}`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFFFFF] text-[#475569] transition-colors group-hover:text-brand dark:bg-[#121214] dark:text-[#A1A1AA]">
                <XLogo className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-primary">
                  {t("help.contact.twitterLabel")}
                </p>
                <p className="truncate text-[11px] text-ink-muted">
                  {t("help.contact.twitterHint")}
                </p>
              </div>
            </a>

            <div className="flex items-center gap-3 rounded-xl bg-[#F3F4F6] p-3.5 opacity-60 dark:bg-[#21242B]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFFFFF] text-[#94A3B8] dark:bg-[#121214] dark:text-[#A1A1AA]">
                <PaperAirplaneIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-primary">
                  {t("help.contact.telegramLabel")}
                </p>
                <p className="truncate text-[11px] text-ink-muted">
                  {t("help.contact.comingSoon")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-[#F3F4F6] p-3.5 opacity-60 dark:bg-[#21242B]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFFFFF] text-[#94A3B8] dark:bg-[#121214] dark:text-[#A1A1AA]">
                <EnvelopeIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-primary">
                  {t("help.contact.emailLabel")}
                </p>
                <p className="truncate text-[11px] text-ink-muted">
                  {t("help.contact.comingSoon")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
