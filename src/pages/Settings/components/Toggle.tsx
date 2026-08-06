import { useState } from "react";

interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}

// Dual-mode: pass `checked` + `onChange` for a real, store-backed switch
// (e.g. Accessibility's Reduced Motion); omit both and it falls back to
// purely local, uncontrolled state exactly as before — which is what the
// Notifications toggles still intentionally are, pending that backend.
// `disabled` is opt-in (every existing caller omits it and is unaffected)
// — added for switches backed by a real in-flight request (Gas Sniper),
// where a second click before the first resolves would fire a duplicate
// mutation rather than just flip a local flag. `label` names the switch
// for assistive tech (every caller sits next to visible text describing
// what it toggles, but nothing associates that text with the switch
// itself — without this, a screen reader announces only "switch, on/off"
// with no indication of what it controls).
export default function Toggle({ checked, defaultChecked = false, onChange, disabled = false, label }: ToggleProps) {
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const value = isControlled ? checked : internalChecked;

  const handleClick = () => {
    if (disabled) return;
    const next = !value;
    if (!isControlled) setInternalChecked(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-disabled={disabled}
      aria-label={label}
      onClick={handleClick}
      // The visible track stays 32×16 — shrinking it further would make the
      // on/off state harder to read at a glance — but the actual tap target
      // is enlarged to the ~40×40 touch-target guideline via this invisible
      // `::before`, which is absolutely positioned and so doesn't affect
      // surrounding layout.
      className={`w-8 h-4 rounded-full relative transition-colors duration-200 before:content-[''] before:absolute before:-inset-x-1 before:-inset-y-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${value ? "bg-brand" : "bg-slate-200 dark:bg-zinc-800"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          value ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
