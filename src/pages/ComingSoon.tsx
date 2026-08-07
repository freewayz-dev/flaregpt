import { useTranslation } from "react-i18next";
import { SparklesIcon } from "@heroicons/react/24/outline";

import PageHeader from "@/components/common/PageHeader";

interface ComingSoonProps {
  title: string;
}

export default function ComingSoon({ title }: ComingSoonProps) {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader title={title} description={t("comingSoon.description")} />

      <div className="rounded-2xl bg-surface-card p-10 sm:p-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <SparklesIcon className="h-5 w-5" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
          {t("comingSoon.badge")}
        </p>
        <p className="mt-2 text-sm text-ink-secondary">
          {t("comingSoon.description")}
        </p>
      </div>
    </div>
  );
}
