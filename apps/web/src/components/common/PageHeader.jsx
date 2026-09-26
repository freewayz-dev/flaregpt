



// `badge` prop dropped during the TypeScript conversion — grepped every
// call site across the app and none ever passed it, and it was never read
// in the body below either, so it wasn't a real part of this component's
// contract, just dead surface.
export default function PageHeader({
  title,
  description,
  rightContent,
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between w-full mx-auto max-w-[1440px]">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-ink-primary">
            {title}
          </h2>
        </div>

        {description && (
          <p className="text-xs text-ink-secondary max-w-2xl">
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