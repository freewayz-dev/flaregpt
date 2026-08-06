import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

// A deliberately fixed shape (not a generic `<T>`) since every real caller
// (Settings > Preferences' language/currency/blue-light selects) already
// converges on this same shape — `code`/other extra fields ride along
// unread, same as before. `name` is read defensively in renderLabel below
// but no current option ever sets it (grepped every `<CustomSelect` call
// site); kept as a real, if currently unexercised, fallback rather than
// dropped outright, since — unlike PageHeader's dead `badge` prop — this
// one IS reachable, just not reached by any caller today.
interface SelectOption {
  value: string;
  labelKey?: string;
  name?: string;
  flag?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  selectedValue: SelectOption | null | undefined;
  onChange: (option: SelectOption) => void;
  "aria-label"?: string;
}

export default function CustomSelect({
  options,
  selectedValue,
  onChange,
  "aria-label": ariaLabel,
}: CustomSelectProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target)
      ) {
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
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const selectOption = (option: SelectOption) => {
    onChange(option);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Moves focus to the currently-selected option (or the first one) the
  // moment the listbox opens — before this, a keyboard user had to Tab in
  // from the trigger to reach any option at all, an extra step every other
  // native `<select>`/listbox doesn't require.
  useEffect(() => {
    if (!isOpen) return;
    // The listbox transitions `visibility` (see its className below) —
    // despite the CSS Transitions spec saying a hidden→visible flip should
    // apply immediately, confirmed live that Chrome doesn't actually treat
    // the element as focusable until the full transition has run: a
    // `.focus()` call made any earlier (including one `requestAnimationFrame`
    // later — tried and confirmed insufficient) silently no-ops with focus
    // staying on the trigger button. Waiting out the transition's own
    // duration is what actually works.
    const timer = setTimeout(() => {
      const selectedIndex = options?.findIndex((o) => o.value === selectedValue?.value) ?? -1;
      optionRefs.current[selectedIndex >= 0 ? selectedIndex : 0]?.focus();
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Standard WAI-ARIA listbox arrow-key behavior — without this, the only
  // way to move between options was Tab, one at a time, which is how every
  // *other* focusable element on the page works too and isn't what a
  // keyboard user expects from a dropdown/select-style control.
  const handleOptionKeyDown = (e: KeyboardEvent<HTMLLIElement>, index: number) => {
    const count = options?.length ?? 0;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      optionRefs.current[(index + 1) % count]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      optionRefs.current[(index - 1 + count) % count]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      optionRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      optionRefs.current[count - 1]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectOption(options[index]);
    }
  };

  const renderLabel = (option: SelectOption | null | undefined) => {
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
        aria-label={ariaLabel}
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
        {options?.map((option, index) => {
          const isSelected = Boolean(selectedValue && option.value === selectedValue.value);
          return (
            <li
              key={option.value}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              role="option"
              aria-selected={isSelected}
              tabIndex={isOpen ? 0 : -1}
              onClick={() => selectOption(option)}
              onKeyDown={(e) => handleOptionKeyDown(e, index)}
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
