import { useState } from "react";

import flarePortalUrl from "@/assets/links/flare-portal.png";
import flareNetworkUrl from "@/assets/links/flare-network.png";
import flareExplorerMainnetUrl from "@/assets/links/flare-explorer-mainnet.png";
import flareExplorerCoston2Url from "@/assets/links/flare-explorer-coston2.png";
import flareDevHubUrl from "@/assets/links/flare-dev-hub.png";
import kineticUrl from "@/assets/links/kinetic.png";
import sparkdexUrl from "@/assets/links/sparkdex.svg?url";
import enosysUrl from "@/assets/links/enosys.png";
import upshiftUrl from "@/assets/links/upshift.png";
import luminiteUrl from "@/assets/links/luminite.svg?url";
import clearpoolUrl from "@/assets/links/clearpool.png";
import morphoUrl from "@/assets/links/morpho.png";
import auUrl from "@/assets/links/au.png";
// Firelight/Sceptre/Spectra already have real, bundled brand marks from the
// DefiProtocols pages (sourced there, not re-fetched here) — reused as-is
// so a protocol shown on both pages always displays the same mark.
import firelightUrl from "@/assets/protocols/firelight.png";
import sceptreUrl from "@/assets/protocols/sceptre.svg?url";
import spectraUrl from "@/assets/protocols/spectra.jpeg";

// Every mark here is each project's own real favicon/brand asset, fetched
// directly from its official domain (or reused from DefiProtocols' existing
// assets for the three protocols that already appear there) — not a
// generic placeholder. See LinkCard.jsx for the fallback when a future
// `/api/v1/links` entry has an `id` not covered here yet.
const LINK_LOGOS = {
  "flare-portal": flarePortalUrl,
  "flare-network": flareNetworkUrl,
  "flare-explorer-mainnet": flareExplorerMainnetUrl,
  "flare-explorer-coston2": flareExplorerCoston2Url,
  "flare-dev-hub": flareDevHubUrl,
  kinetic: kineticUrl,
  sparkdex: sparkdexUrl,
  enosys: enosysUrl,
  upshift: upshiftUrl,
  luminite: luminiteUrl,
  clearpool: clearpoolUrl,
  morpho: morphoUrl,
  firelight: firelightUrl,
  sceptre: sceptreUrl,
  spectra: spectraUrl,
  au: auUrl,
};

// `rounded-full` — same circular treatment TokenIcon.jsx uses for every
// other token/protocol mark in the app, so a project's logo reads the same
// shape wherever it shows up.
export default function LinkLogo({ id, name, size = 28 }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const src = LINK_LOGOS[id];

  if (!src) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-surface-inset text-xs font-semibold text-ink-secondary"
        style={{ width: size, height: size }}
      >
        {name?.charAt(0)?.toUpperCase() ?? "?"}
      </span>
    );
  }

  return (
    <span className="relative flex shrink-0" style={{ width: size, height: size }}>
      {!isLoaded && <span className="absolute inset-0 animate-pulse rounded-full bg-surface-inset" />}
      <img
        ref={(node) => {
          if (node?.complete) setIsLoaded(true);
        }}
        src={src}
        alt=""
        width={size}
        height={size}
        onLoad={() => setIsLoaded(true)}
        className={`h-full w-full rounded-full object-cover transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  );
}
