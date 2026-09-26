import FlareGptMark from "@/components/common/FlareGptMark";

export const QuantumSparkLogo = () => {
  return (
    <div className="flex items-center gap-2 select-none font-Inter">
      <div className="relative">
        <div className="absolute inset-0 rounded-lg md:rounded-xl bg-brand/5 blur-md" />

        <FlareGptMark className="relative h-7 w-7 shadow-lg shadow-brand/20" />
      </div>

      <div className="flex items-center tracking-tight text-sm leading-none font-semibold">
        <span className="text-black dark:text-white">FlareGPT</span>
      </div>
    </div>
  );
};

export default QuantumSparkLogo;
