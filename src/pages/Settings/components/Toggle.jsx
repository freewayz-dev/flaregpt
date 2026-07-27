import { useState } from "react";

// Dual-mode: pass `checked` + `onChange` for a real, store-backed switch
// (e.g. Accessibility's Reduced Motion); omit both and it falls back to
// purely local, uncontrolled state exactly as before — which is what the
// Notifications toggles still intentionally are, pending that backend.
export default function Toggle({ checked, defaultChecked = false, onChange }) {
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const value = isControlled ? checked : internalChecked;

  const handleClick = () => {
    const next = !value;
    if (!isControlled) setInternalChecked(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={handleClick}
      className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors duration-200 ${
        value ? "bg-brand" : "bg-slate-200 dark:bg-zinc-800"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          value ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
