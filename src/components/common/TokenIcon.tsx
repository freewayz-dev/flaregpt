import { useState } from "react";

import flrUrl from "@/assets/tokens/flr.svg?url";
import xrpUrl from "@/assets/tokens/xrp.svg?url";
import sgbUrl from "@/assets/tokens/sgb.svg?url";
import btcUrl from "@/assets/tokens/btc.svg?url";
import dogeUrl from "@/assets/tokens/doge.svg?url";
import sceptreUrl from "@/assets/protocols/sceptre.svg?url";
import firelightUrl from "@/assets/protocols/firelight.png";
import mxrpyUrl from "@/assets/protocols/mxrpy.svg?url";

// WFLR and FXRP are just wrapped forms of FLR/XRP, so they reuse the same
// mark — that's standard practice (most wallets/dashboards show a token's
// underlying icon for its wrapped variant too). sFLR and stXRP are each
// issued by a single protocol (Sceptre, Firelight), so their token icon is
// that protocol's own logo rather than a separate token-specific asset.
// `Record<string, string>` rather than a narrower literal-key type — the
// real input (see below) is any wallet/protocol symbol the backend returns,
// which is not guaranteed to be one of these ~10, hence the `if (!src)
// return null` guard right after the lookup.
const TOKEN_ICONS: Record<string, string> = {
  FLR: flrUrl,
  WFLR: flrUrl,
  XRP: xrpUrl,
  FXRP: xrpUrl,
  SGB: sgbUrl,
  BTC: btcUrl,
  DOGE: dogeUrl,
  SFLR: sceptreUrl,
  STXRP: firelightUrl,
  MXRPY: mxrpyUrl,
};

interface TokenIconProps {
  symbol: string | undefined;
  size?: number;
  className?: string;
}

// This is the single most-repeated image in the app — the same handful of
// token/protocol icons rendered over and over across transaction feeds,
// asset breakdowns, and DeFi cards, some of which show dozens of rows at
// once. A plain `<img>` used to just sit invisible-then-pop-in with no
// transition the first time each symbol loaded; this adds the same pulse-
// then-fade-in treatment already proven in ConnectWalletModal's
// WalletImage, so the layout (already stable — width/height were always
// reserved) also *looks* stable instead of icons popping in raggedly.
export default function TokenIcon({ symbol, size = 16, className = "" }: TokenIconProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const src = symbol ? TOKEN_ICONS[symbol.toUpperCase()] : undefined;
  if (!src) return null;

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {!isLoaded && (
        <span className="absolute inset-0 animate-pulse rounded-full bg-surface-inset" />
      )}
      <img
        ref={(node) => {
          // A cached icon (the same ~10 symbols repeat dozens of times per
          // page) can already be `.complete` the instant this ref attaches,
          // in which case `onLoad` below never fires again — checked here
          // so a repeated icon doesn't get stuck invisible after the very
          // first time it's ever loaded on this page.
          if (node?.complete) setIsLoaded(true);
        }}
        src={src}
        alt=""
        width={size}
        height={size}
        onLoad={() => setIsLoaded(true)}
        className={`h-full w-full rounded-full object-contain transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  );
}
