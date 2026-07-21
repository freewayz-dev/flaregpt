export default function RowItem({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex gap-3 items-start">
        {Icon && (
          <Icon className="h-4 w-4 text-slate-400 dark:text-[#6D7A86] shrink-0 mt-0.5" />
        )}
        <div>
          <h4 className="text-xs font-semibold text-ink-primary">{title}</h4>
          <p className="text-[11px] text-[#475569] dark:text-[#6D7A86] mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
