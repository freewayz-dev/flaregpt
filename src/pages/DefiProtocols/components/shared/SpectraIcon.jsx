import spectraIconUrl from "@/assets/protocols/spectra.jpeg";

// Spectra's official mark is a JPEG (no SVG source available), same
// situation as Firelight — see FirelightIcon.jsx for why this thin
// wrapper exists: to match the same `className`-accepting interface the
// SVG icons (imported as components via vite-plugin-svgr) and Heroicons
// already use everywhere the protocol registry's `icon` field is rendered.
export default function SpectraIcon({ className }) {
  return <img src={spectraIconUrl} alt="" className={className} />;
}
