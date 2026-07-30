import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export default function CustomSelect({ options, selectedValue, onChange }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // A keyboard user had no way to select an option at all before this —
  // the list only ever wired `onClick`, so opening it with the trigger
  // button and pressing Tab/Enter/Space landed nowhere. Escape returns
  // focus to the trigger, matching every other dismissible menu in the app.
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const selectOption = (option) => {
    onChange(option);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const renderLabel = (option) => {
    if (!option) return "";
    return option.labelKey && option.labelKey.includes(".")
      ? t(option.labelKey)
      : option.labelKey || option.name;
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-3 text-sm text-left text-ink-primary dark:bg-[#21242B] dark:border-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 focus:border-brand dark:focus:border-brand transition-colors duration-200 relative z-10 cursor-pointer"
      >
        {selectedValue?.flag && (
          <span className="shrink-0">{selectedValue.flag}</span>
        )}
        <span className="truncate">{renderLabel(selectedValue)}</span>
        <ChevronDownIcon
          className={`ml-auto h-4 w-4 text-ink-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <ul
        role="listbox"
        className={`absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-1 shadow-lg dark:bg-[#21242B] dark:border-none transition-[opacity,transform,visibility] duration-200 ease-out 
          ${isOpen ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-1 invisible"}`}
      >
        {options?.map((option) => {
          const isSelected =
            selectedValue && option.value === selectedValue.value;
          return (
            <li
              key={option.value}
              role="option"
              aria-selected={isSelected}
              tabIndex={isOpen ? 0 : -1}
              onClick={() => selectOption(option)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectOption(option);
                }
              }}
              className={`flex items-center gap-2 cursor-pointer select-none rounded-lg px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:-outline-offset-2 
                ${
                  isSelected
                    ? "bg-brand/10 text-brand dark:bg-brand/10 dark:text-brand font-medium"
                    : "text-[#475569] hover:bg-[#F3F4F6] hover:text-ink-primary dark:text-[#6D7A86] dark:hover:bg-[#252A31] "
                }`}
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
