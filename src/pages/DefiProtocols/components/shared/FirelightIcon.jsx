import firelightIconUrl from "@/assets/protocols/firelight.png";

// Firelight's official mark is a PNG (no SVG source available), so it needs
// a thin wrapper to match the same `className`-accepting interface the SVG
// icons (imported as components via vite-plugin-svgr) and Heroicons already
// use everywhere the protocol registry's `icon` field is rendered.


export default function FirelightIcon({ className }) {
  return <img src={firelightIconUrl} alt="" className={className} />;
}
