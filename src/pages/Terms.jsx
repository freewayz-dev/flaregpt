import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function Terms() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-[#F0F4F9] dark:bg-[#101115] px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-brand transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back
        </button>

        <div className="rounded-2xl bg-surface-card p-6 sm:p-10 shadow-sm">
          <h1 className="text-xl font-bold text-ink-primary">
            {t("footer.terms")}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
            {t("footer.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}
