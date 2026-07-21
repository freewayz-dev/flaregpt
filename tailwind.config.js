/** @type {import('tailwindcss').Config} */

// Reads a `--color-*` CSS custom property (defined in src/index.css) as an
// opacity-aware Tailwind color, e.g. withOpacity("--color-brand") lets
// `bg-brand/10` work exactly like an arbitrary bg-[#E62058]/10 value did.
const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        Inter: ["Inter", "sans-serif"],
      },
      colors: {
        // Brand accent — identical in light and dark mode.
        brand: {
          DEFAULT: withOpacity("--color-brand"),
          hover: withOpacity("--color-brand-hover"),
        },
        // Text tokens — value flips automatically via the `dark` class,
        // so components no longer need a separate `dark:text-*` utility.
        ink: {
          primary: withOpacity("--color-ink-primary"),
          secondary: withOpacity("--color-ink-secondary"),
          muted: withOpacity("--color-ink-muted"),
        },
        // Default border color.
        line: withOpacity("--color-line"),
        // Surface (background) tokens.
        surface: {
          card: withOpacity("--color-surface-card"),
          subtle: withOpacity("--color-surface-subtle"),
        },
      },
    },
  },
  plugins: [],
};
