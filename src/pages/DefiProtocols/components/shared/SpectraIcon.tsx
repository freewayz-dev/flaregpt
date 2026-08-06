import spectraIconUrl from "@/assets/protocols/spectra.jpeg";

// Spectra's official mark is a JPEG (no SVG source available), same
// situation as Firelight — see FirelightIcon.jsx for why this thin
// wrapper exists: to match the same `className`-accepting interface the
// SVG icons (imported as components via vite-plugin-svgr) and Heroicons
// already use everywhere the protocol registry's `icon` field is rendered.
// Unlike Firelight's PNG (transparent outside its own circular mark), this
// is a flat-color square JPEG with no transparency to fall back on, so it
// needs `rounded-full` applied explicitly to read as a coin-style logo
// like every other protocol instead of a visibly square tile.
interface IconProps {
  className?: string;
}

export default function SpectraIcon({ className }: IconProps) {
  return (
    <img
      src={spectraIconUrl}
      alt=""
      className={`rounded-full object-cover ${className}`}
    />
  );
}
