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
const TOKEN_ICONS = {
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

export default function TokenIcon({ symbol, size = 16, className = "" }) {
  const src = TOKEN_ICONS[symbol?.toUpperCase()];
  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`inline-block shrink-0 rounded-full ${className}`}
    />
  );
}
