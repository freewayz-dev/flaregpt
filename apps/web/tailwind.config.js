

// Reads a `--color-*` CSS custom property (defined in src/index.css) as an
// opacity-aware Tailwind color, e.g. withOpacity("--color-brand") lets
// `bg-brand/10` work exactly like an arbitrary bg-[#E62058]/10 value did.
const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

const config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        Inter: ["Inter", "sans-serif"],
        // Display face for large headings only (hero, section headers) —
        // body/UI copy stays on Inter everywhere, including the rest of
        // the dashboard, so this is additive rather than a site-wide swap.
        display: ["Plus Jakarta Sans", "Inter", "sans-serif"],
      },
      colors: {
        // Brand accent — identical in light and dark mode.
        brand: {
          DEFAULT: withOpacity("--color-brand"),
          hover: withOpacity("--color-brand-hover"),
          // Contrast-safe variant for brand-colored text at small sizes
          // (e.g. APR figures) — flips per theme, unlike DEFAULT/hover which
          // are for fills (buttons, badges) where text-on-background
          // contrast doesn't apply the same way.
          text: withOpacity("--color-brand-text"),
        },
        // Text tokens — value flips automatically via the `dark` class,
        // so components no longer need a separate `dark:text-*` utility.
        ink: {
          primary: withOpacity("--color-ink-primary"),
          secondary: withOpacity("--color-ink-secondary"),
          muted: withOpacity("--color-ink-muted"),
        },
        // Scoped to the FlareGPT chat interface only (see index.css) — not
        // a replacement for `ink-primary` app-wide, so other pages are
        // untouched by this readability pass.
        chat: {
          text: withOpacity("--color-chat-text"),
        },
        // Default border color.
        line: withOpacity("--color-line"),
        // Divider color for divide-x/divide-y separators between list rows —
        // a distinct role from `line` (outer card borders), even though they
        // share a light-mode value.
        divider: withOpacity("--color-divider"),
        // Surface (background) tokens.
        surface: {
          card: withOpacity("--color-surface-card"),
          "card-hover": withOpacity("--color-surface-card-hover"),
          subtle: withOpacity("--color-surface-subtle"),
          inset: withOpacity("--color-surface-inset"),
        },
      },
    },
  },
  plugins: [],
};

export default config;
