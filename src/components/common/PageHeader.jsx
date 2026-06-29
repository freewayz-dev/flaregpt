export default function PageHeader({
  title,
  description,
  badge,
  rightContent,
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between mx-auto max-w-[1440px]">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {/* Main Title - Light: Primary (#0F172A) | Dark: Primary (#FAFAFA) */}
          <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#FAFAFA]">
            {title}
          </h2>
        </div>

        {description && (
          <p className="text-xs text-[#475569] dark:text-[#A1A1AA] max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {rightContent && (
        <div className="flex items-center gap-2 lg:justify-end">
          {rightContent}
        </div>
      )}
    </div>
  );
}