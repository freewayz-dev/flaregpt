import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  BookOpenIcon,
  ChatBubbleBottomCenterTextIcon,
  WalletIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  SparklesIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

import PageHeader from "../components/common/PageHeader";

const GUIDE_ICONS = [
  BookOpenIcon,
  SparklesIcon,
  WalletIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  DocumentTextIcon,
];

export default function Help() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const faqsList = useMemo(
    () => t("help.faqs", { returnObjects: true }) || [],
    [t],
  );
  const guidesList = useMemo(
    () => t("help.guides", { returnObjects: true }) || [],
    [t],
  );
  const stepsList = useMemo(
    () => t("help.steps", { returnObjects: true }) || [],
    [t],
  );

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqsList;
    const query = searchQuery.toLowerCase();
    return faqsList.filter(
      (faq) =>
        faq.question?.toLowerCase().includes(query) ||
        faq.answer?.toLowerCase().includes(query),
    );
  }, [searchQuery, faqsList]);

  const filteredGuides = useMemo(() => {
    if (!searchQuery.trim()) return guidesList;
    const query = searchQuery.toLowerCase();
    return guidesList.filter(
      (guide) =>
        guide.title?.toLowerCase().includes(query) ||
        guide.description?.toLowerCase().includes(query),
    );
  }, [searchQuery, guidesList]);

  return (
    <div className="pb-10">
      <div className="pt-3 lg:pt-0">
        <PageHeader
          title={t("sidebar.helpCenter")}
          description={t("help.headerDesc")}
        />
      </div>

      <div className="mx-auto max-w-[1440px] sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* SEARCH EXPLORER HUB - Card: #FFFFFF | Dark Card: #161619 */}
        <div className="relative rounded-2xl bg-[#FFFFFF] p-5 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none dark:bg-[#161619] overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#FAFAFA]">
              {t("help.searchTitle")}
            </h2>
            <p className="mt-1 text-xs text-[#475569] dark:text-[#71717A]">
              {t("help.searchSub")}
            </p>

            {/* Input container - Input: #FFFFFF | Dark Input: #121214 */}
            <div className="mt-4 relative rounded-xl shadow-sm w-full max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon
                  className="h-4 w-4 text-[#94A3B8] dark:text-[#71717A]"
                  aria-hidden="true"
                />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("help.searchPlaceholder")}
                className="block w-full rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] py-2 pl-9 pr-4 text-base text-[#0F172A] placeholder-[#94A3B8] focus:border-[#E62058] focus:outline-none focus:ring-1 focus:ring-[#E62058] dark:border-none dark:bg-[#121214] dark:text-[#FAFAFA] dark:placeholder-[#71717A] dark:focus:ring-1 dark:focus:ring-[#E62058]"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* GETTING STARTED TRACK - Card: #FFFFFF | Dark Card: #161619 */}
          <div className="order-2 lg:order-1 lg:col-span-1 flex flex-col rounded-2xl bg-[#FFFFFF] p-5 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none dark:bg-[#161619]">
            <div className="flex items-center gap-2 mb-6 shrink-0">
              <div className="p-1.5 rounded-lg bg-[#E62058]/10 text-[#E62058]">
                <QuestionMarkCircleIcon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#FAFAFA]">
                {t("help.gettingStarted")}
              </h3>
            </div>

            {/* Timeline Track - Divider: #E5E7EB | Dark Divider: #1D1D20 */}
            <div className="relative flex-1 border-l border-[#E5E7EB] dark:border-[#1D1D20] ml-3.5 space-y-6">
              {stepsList.map((item, index) => (
                <div key={index} className="relative pl-6 group">
                  {/* Step Badge - Nested Card: #F3F4F6 | Dark Nested Card: #1B1B1F */}
                  <div className="absolute -left-[15px] top-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#FFFFFF] bg-[#F3F4F6] text-[10px] font-bold text-[#475569] transition-colors duration-150 group-hover:border-[#E62058]/30 group-hover:bg-[#E62058]/10 group-hover:text-[#E62058] dark:border-[#161619] dark:bg-[#1B1B1F] dark:text-[#A1A1AA] dark:group-hover:text-[#E62058]">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-[#475569] dark:text-[#A1A1AA] transition-colors group-hover:text-[#E62058]">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#94A3B8] dark:text-[#71717A]">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FEATURE ARTICLES PANEL MATRIX */}
          <div className="order-1 lg:order-2 lg:col-span-2 flex flex-col space-y-6">
            {/* Card Background - Card: #FFFFFF | Dark Card: #161619 */}
            <div className="rounded-2xl bg-[#FFFFFF] p-5 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none dark:bg-[#161619]">
              {" "}
              <div className="flex items-center gap-2 mb-5 shrink-0">
                <div className="p-1.5 rounded-lg bg-[#E62058]/10 text-[#E62058]">
                  <BookOpenIcon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#FAFAFA]">
                  {t("help.featureGuides")}
                </h3>
              </div>
              {guidesList.length === 0 ? (
                <p className="text-xs text-[#94A3B8] py-4 dark:text-[#71717A]">
                  {t("help.noGuides")}
                </p>
              ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {" "}
                  {filteredGuides.map((guide, index) => {
                    const IconComponent = GUIDE_ICONS[index] || BookOpenIcon;
                    return (
                      /* Feature Items - Nested Card: #F3F4F6 | Dark Nested Card: #1B1B1F */
                      <div
                        key={index}
                        className="group relative rounded-xl border border-[#E5E7EB]/40 p-4 bg-[#F3F4F6] hover:bg-[#F3F4F6]/80 transition duration-150 dark:bg-[#1B1B1F] dark:border-none dark:hover:ring-1 dark:hover:ring-[#E62058]/20"
                      >
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-[#475569] group-hover:text-[#E62058] group-hover:bg-[#E62058]/5 group-hover:border-[#E62058]/10 transition-colors dark:bg-[#121214] dark:border-none dark:text-[#71717A]">
                          <IconComponent className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
                        </div>
                        <h4 className="text-xs font-semibold text-[#0F172A] dark:text-[#FAFAFA]">
                          {guide.title}
                        </h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#475569] dark:text-[#A1A1AA]">
                          {guide.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FAQ PANEL SECTION - Card: #FFFFFF | Dark Card: #161619 */}
        <div className="rounded-2xl bg-[#FFFFFF] p-5 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none dark:bg-[#161619]">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 rounded-lg bg-[#E62058]/10 text-[#E62058]">
              <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#FAFAFA]">
              {t("help.faqTitle")}
            </h3>
          </div>

          {filteredFaqs.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-2 dark:text-[#71717A]">
              {t("help.noFaqs")}
            </p>
          ) : (
            <div className="space-y-2.5">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  /* Accordion Row - Nested Card: #F3F4F6 | Dark Nested Card: #1B1B1F */
                  <div
                    key={index}
                    className="rounded-xl border border-[#E5E7EB]/50 bg-[#F3F4F6] transition-colors duration-150 dark:border-none dark:bg-[#1B1B1F]"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left outline-none cursor-pointer group"
                    >
                      <span className="text-xs font-medium text-[#475569] group-hover:text-[#0F172A] dark:text-[#A1A1AA] dark:group-hover:text-[#FAFAFA] transition-colors">
                        {faq.question}
                      </span>
                      <div
                        className={`
                            flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-200
                            ${
                              isOpen
                                ? "bg-[#E62058]/5 border-[#E62058]/20 text-[#E62058]"
                                : "bg-[#FFFFFF] border-[#E5E7EB] text-[#475569] group-hover:text-[#E62058] group-hover:bg-[#E62058]/5 group-hover:border-[#E62058]/20 dark:bg-[#121214] dark:border-none dark:text-[#71717A]"
                            }
                          `}
                      >
                        <ChevronDownIcon
                          className={`h-3.5 w-3.5 transition-transform duration-200 ease-out ${isOpen ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                    >
                      <div className="overflow-hidden">
                        {/* Inner Panel Divider - Divider: #E5E7EB | Dark Divider: #1D1D20 */}
                        <div className="px-4 pb-4 pt-1 border-t border-[#E5E7EB]/60 dark:border-[#1D1D20]/50">
                          <p className="text-xs leading-relaxed text-[#475569] dark:text-[#71717A]">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ESCALATION HELPDESK ROW PANEL - Card: #FFFFFF | Dark Card: #161619 */}
        <div className="rounded-2xl bg-[#FFFFFF] p-5 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none dark:bg-[#161619]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#FAFAFA]">
                {t("help.stillNeedHelp")}
              </h3>
              <p className="mt-1 text-xs text-[#475569] dark:text-[#71717A] max-w-lg">
                {t("help.supportDesc")}
              </p>
            </div>
            <button
              type="button"
              className="w-full sm:w-auto rounded-xl bg-[#E62058] px-4 py-2 text-xs font-medium text-white hover:bg-[#F03A6F] active:scale-[0.99] shadow-sm transition duration-150 cursor-pointer text-center"
            >
              {t("help.contactSupport")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
