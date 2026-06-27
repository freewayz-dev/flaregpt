import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useUIStore } from "../../store/useUIStore";

export default function ThemeToggle() {
  const darkMode = useUIStore((state) => state.darkMode);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative flex items-center p-0.5 rounded-xl bg-[#F3F4F6] dark:bg-[#121212] transition-colors duration-300 w-[72px] h-9 select-none cursor-pointer focus:outline-none"
    >
      <div
        className={`absolute top-0.5 bottom-0.5 rounded-lg bg-white dark:bg-[#161619] shadow-sm w-[32px] transition-all duration-300 ease-out ${
          darkMode ? "left-[36px]" : "left-[3px]"
        }`}
      />

      <div className="relative z-10 flex items-center justify-center w-8 h-full">
        <SunIcon
          className={`h-4 w-4 transition-colors duration-300 ${
            !darkMode
              ? "text-[#E62058]"
              : "text-[#475569] dark:text-[#A1A1AA]"
          }`}
        />
      </div>

      <div className="relative z-10 flex items-center justify-center w-8 h-full">
        <MoonIcon
          className={`h-4 w-4 transition-colors duration-300 ${
            darkMode
              ? "text-[#E62058]"
              : "text-[#475569] dark:text-[#A1A1AA]"
          }`}
        />
      </div>
    </button>
  );
}