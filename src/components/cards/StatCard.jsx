export default function StatCard({
  title,
  value,
  change,
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1a1a1a]">
      <p className="text-sm text-slate-500">{title}</p>

      <h3 className="mt-2 text-3xl font-bold text-black dark:text-white">
        {value}
      </h3>

      <span className="mt-2 inline-block text-sm text-green-500">
        {change}
      </span>
    </div>
  );
}