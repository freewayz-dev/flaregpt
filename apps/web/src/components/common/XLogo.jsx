// The one X (formerly Twitter) mark used everywhere the app links out to
// it — Footer, LandingPage, Help, and Links' LinkCard all rendered their
// own copy of this same path data independently before this existed.
// `className` destructured out and merged by hand, not left in `...props`
// — spreading `props` after `fill-current` in the JSX let a caller's own
// `className` (e.g. "h-4 w-4") silently overwrite it instead of combining,
// so this rendered with the SVG's default black fill instead of
// `currentColor`. Invisible in light mode (black reads close enough to the
// intended dark gray on a white card), but genuinely broken in dark mode —
// solid black against a near-black card.
export default function XLogo({ className, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`fill-current ${className ?? ""}`}
      {...props}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
