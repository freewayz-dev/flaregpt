import Logo from "@/assets/icons/fl.png";

export const QuantumSparkLogo = () => {
  return (
    <div className="flex items-center gap-1 select-none font-Inter">
      <div className="relative w-5 h-5 flex items-center justify-center rounded-xl bg-brand shadow-md flex-shrink-0 overflow-hidden">
        <img alt="Logo" src={Logo} />
      </div>

      <div className="flex items-center tracking-tight text-xs leading-none font-medium">
        <span className="text-black dark:text-white">flareGPT</span>
      </div>
    </div>
  );
};

export default QuantumSparkLogo;