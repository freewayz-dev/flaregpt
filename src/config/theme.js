// The single canonical dark/light "app surface" pair — matches
// DashboardLayout's own root background classes
// (`bg-[#F0F4F9] dark:bg-[#101115]`), the web manifest's
// background_color/theme_color, and the generated iOS splash screens
// (see scripts/generate-apple-splash-screens.mjs). Every in-bundle
// consumer (useUIStore.js's applyThemeColorMeta, called from App.jsx and
// useUIStore's own two call sites) reads this instead of repeating the
// literals.
//
// public/theme-init.js keeps its own literal copy of these two values —
// it's a plain, non-module `<script>` that must run synchronously before
// first paint (see its own comment for why), so it can't import this
// module without becoming deferred. If these ever change, update
// theme-init.js's copy too.
export const THEME_SURFACE_COLOR = {
  dark: "#101115",
  light: "#F0F4F9",
};
