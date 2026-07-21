import { useState } from "react";

export default function Toggle({ defaultChecked = false }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => setChecked((prev) => !prev)}
      className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors duration-200 ${
        checked ? "bg-brand" : "bg-slate-200 dark:bg-zinc-800"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
