import { useTranslation } from "react-i18next";



export function UpdateToastContent({ onReload }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{t("update.available")}</span>
      <button
        type="button"
        onClick={onReload}
        className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer"
      >
        {t("update.reload")}
      </button>
    </div>
  );
}
