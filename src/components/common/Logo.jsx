export const QuantumSparkLogo = () => {
  return (
    <div className="flex items-center gap-1 select-none font-Inter">
      <div className="relative">
        <div className="absolute inset-0 rounded-lg md:rounded-xl bg-brand/5 blur-md" />

        <div className="relative flex h-6 w-6 md:h-6 md:w-6 items-center justify-center rounded-lg md:rounded-xl bg-brand shadow-lg shadow-brand/20">
          <span className="font-black text-xs md:text-sm tracking-tight text-white">
            F
          </span>
        </div>
      </div>

      <div className="flex items-center tracking-tight text-xs leading-none font-semibold">
        <span className="text-black dark:text-white">FlareGPT</span>
      </div>
    </div>
  );
};

export default QuantumSparkLogo;
