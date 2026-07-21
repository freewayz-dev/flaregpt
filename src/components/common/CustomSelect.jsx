import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export default function CustomSelect({ options, selectedValue, onChange }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderLabel = (option) => {
    if (!option) return "";
    return option.labelKey && option.labelKey.includes(".")
      ? t(option.labelKey)
      : option.labelKey || option.name;
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-3 text-sm text-left text-[#0F172A] dark:bg-[#21242B] dark:border-none dark:text-[#FAFAFA] focus:outline-none focus:border-[#E62058] dark:focus:border-[#E62058] transition-colors duration-200 relative z-10 cursor-pointer"
      >
        {selectedValue?.flag && <span className="shrink-0">{selectedValue.flag}</span>}
        <span className="truncate">{renderLabel(selectedValue)}</span>
        <ChevronDownIcon className={`ml-auto h-4 w-4 text-[#94A3B8] dark:text-[#71717A] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <ul
        className={`absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-1 shadow-lg dark:bg-[#21242B] dark:border-none transition-[opacity,transform,visibility] duration-200 ease-out
          ${isOpen ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-1 invisible"}
        `}
      >
        {options?.map((option) => {
          const isSelected = selectedValue && option.value === selectedValue.value;
          return (
            <li
              key={option.value}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 cursor-pointer select-none rounded-lg px-3 py-2 text-sm transition-colors duration-150
                ${
                  isSelected
                    ? "bg-[#E62058]/10 text-[#E62058] dark:bg-[#E62058]/10 dark:text-[#E62058] font-medium"
                    : "text-[#475569] hover:bg-[#F3F4F6] hover:text-[#0F172A] dark:text-[#6D7A86] dark:hover:bg-[#252A31] dark:hover:text-[#FAFAFA]"
                }
              `}
            >
              {option.flag && <span className="shrink-0">{option.flag}</span>}
              <span className="truncate">{renderLabel(option)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}