import { useTranslation } from "react-i18next";
import { BuildingLibraryIcon, ScaleIcon } from "@heroicons/react/24/outline";

import RankingCardShell from "@/pages/FtsoRewards/components/RankingCardShell";
import RankingAvatar from "@/pages/FtsoRewards/components/RankingAvatar";
import InfoHint from "@/components/common/InfoHint";
import { useFtsoProviderRankings } from "@/hooks/queries/useNetworkQueries";
import {
  computeProviderRows,
  CONCENTRATION_BAND_LABEL_KEYS,
} from "@/pages/FtsoRewards/utils/deriveRankings";
import { shortenAddress } from "@/utils/address";

import bifrostWalletUrl from "@/assets/providers/bifrost-wallet.png";
import flareSpaceUrl from "@/assets/providers/flare-space.png";
import auUrl from "@/assets/providers/au.png";
import nortsoUrl from "@/assets/providers/nortso.png";
import atlasTsoUrl from "@/assets/providers/atlas-tso.png";
import kilnUrl from "@/assets/providers/kiln.png";
import lastOracleUrl from "@/assets/providers/last-oracle.png";
import unknown6c23Url from "@/assets/providers/unknown-6c23.png";
import alphaOracleUrl from "@/assets/providers/alpha-oracle.png";
import afOracleUrl from "@/assets/providers/af-oracle.png";
import pricekrakenUrl from "@/assets/providers/pricekraken.png";
import flarefiUrl from "@/assets/providers/flarefi.png";
import aureusOxUrl from "@/assets/providers/aureus-ox.png";
import chainbaseStakingUrl from "@/assets/providers/chainbase-staking.png";
import bushidoFtsoUrl from "@/assets/providers/bushido-ftso.png";
import datavectorUrl from "@/assets/providers/datavector.png";
import catenalyticaUrl from "@/assets/providers/catenalytica.png";

// Real logos, keyed by the provider's own address (the one stable
// identifier the live API actually returns — never by name, which isn't
// guaranteed unique and is "Unknown Provider" for several real entries).
// Sourced from github.com/TowoLabs/ftso-signal-providers — a curated,
// address-keyed FTSO provider logo/metadata repository maintained by Towo
// Labs, a recognized Flare Network development partner (also the team
// behind Bifrost Wallet, one of the providers below) — matched by
// cross-referencing this app's own live provider-rankings response
// against that repo's asset list, not guessed or invented.
//
// `0x6c23...cB92B` below is a real, confirmed exception worth calling out
// explicitly: the live API returns `name: "Unknown Provider"` for it (not
// a frontend fallback — that string is the literal API value, see
// deriveRankings.js's own `name: p.name` passthrough), yet this same
// address genuinely does have a registered logo in the repo above. Shown
// here as a real image with the API's own "Unknown Provider" text intact
// — a resolved *logo* isn't the same claim as a resolved *name*, and no
// name for this address was found anywhere checked (this app's own API,
// this repo's own per-provider metadata files, FlareScan), so nothing is
// invented to go with the image. The other unregistered addresses in any
// given live response (that set isn't fixed size — ranking membership
// shifts with delegated weight) have neither a name nor a logo anywhere
// found, and simply have no entry in this map — RankingAvatar already
// falls back to an initials circle whenever an address isn't listed here.
const PROVIDER_LOGOS = {
  "0x9A46864A3b0a7805B266C445289C3fAD1E48f18e": bifrostWalletUrl,
  "0x111246F191a2A20012723369d3CEc77777E774E9": flareSpaceUrl,
  "0x4990320858AE3528B645C60059281a66C3488888": auUrl,
  "0x00c0fFEf480E392f5Fe7af592214855Ff872fa80": nortsoUrl,
  "0x07702A7494F760B0b3642463BdD2B7A13cFDDbb2": atlasTsoUrl,
  "0x6df84895f1f1f6F6767C59324F94089d4097051A": kilnUrl,
  "0x535268cB19f2cC0c65D463be6Ab7751Ff4E9fC07": lastOracleUrl,
  "0x6c23aa4C5A1dA47F8FDF9Df4A032904c062cB92B": unknown6c23Url,
  "0x47B6EfFE71ABD4e8CdCC56f2341BEb404f804b87": alphaOracleUrl,
  "0xAf05Ac13F4a4e754a496B46bbd611F5FFDb42606": afOracleUrl,
  "0xB95f930711DA83226416FFaAB084249B2e01e1F2": pricekrakenUrl,
  "0x184DbC7F2D96aBDfDe5CDa8c56F3F13DbF138cdF": flarefiUrl,
  "0x9269fb79B098AB314de8A1E2AFb8705678520443": aureusOxUrl,
  "0x6434b1ED626585D3e58E995aD3C2cc0D6718755c": chainbaseStakingUrl,
  "0xC7cF3238D2ca63d01Ad4d42B4cCB9dB8b0adE702": bushidoFtsoUrl,
  "0xCaA49C97318b6Bb62b7F9241891D70F87FC05D35": datavectorUrl,
  "0xad918962795547a8c997F96f7BAbB822612a5FfE": catenalyticaUrl,
};

// Case-insensitive lookup — addresses in this file were typed matching
// the live API's own checksummed casing, but nothing guarantees a future
// response keeps that exact casing, and object key lookups are
// case-sensitive by default.
function providerLogo(address) {
  if (!address) return undefined;
  const match = Object.keys(PROVIDER_LOGOS).find(
    (key) => key.toLowerCase() === address.toLowerCase(),
  );
  return match ? PROVIDER_LOGOS[match] : undefined;
}

// Below `sm`, the trailing weight/fee figures drop to their own line
// (indented to align under the name, `pl-11` matching the 32px avatar +
// gap-3) instead of squeezing into the same row as the avatar/name/address
// — confirmed live that cramming both into one row on a phone made a long
// provider name truncate hard and crowded the concentration-band pill
// right up against the address. At `sm` and up there's already enough
// room (this card sits alone or in a 2-column grid, never narrower than a
// phone), so the row reverts to the original single-line layout exactly
// as it was.
function ProviderRow({ row, t }) {
  return (
    <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <RankingAvatar name={row.name} logoSrc={providerLogo(row.address)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-primary">{row.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <p className="truncate text-[11px] font-mono text-ink-muted">{shortenAddress(row.address)}</p>
            {/* Same neutral pill DelegationsCard already uses for this exact
                field on a wallet's own delegations — one tag style for both
                band values, never a tone/color swap (see the handoff's own
                rule, restated in deriveRankings.js). The *explanation* of
                what this means lives once, on the card title above, not
                repeated on every row. */}
            {row.concentrationBand && CONCENTRATION_BAND_LABEL_KEYS[row.concentrationBand] && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-inset px-2 py-0.5 text-[11px] font-semibold text-ink-secondary shrink-0">
                <ScaleIcon className="h-3 w-3 text-ink-muted" />
                {t(CONCENTRATION_BAND_LABEL_KEYS[row.concentrationBand])}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="pl-11 shrink-0 sm:pl-0 sm:text-right">
        <p className="text-sm font-semibold tabular-nums text-ink-primary">
          {row.weightSharePct.toFixed(2)}%
        </p>
        <p className="text-[11px] text-ink-muted">{row.feePct}% fee</p>
      </div>
    </div>
  );
}

// Ranked by live on-chain delegated vote weight and fee — explicitly NOT a
// "best provider" leaderboard (the backend's own docs are clear reward
// performance "isn't reliably queryable on-chain"). The caption below says
// so directly rather than implying otherwise through a bare percentage
// column, which is what "ranking" + "%" next to each other would otherwise
// read as.
export default function ProviderRankingCard() {
  const { t } = useTranslation();
  const query = useFtsoProviderRankings(20);
  const rows = computeProviderRows(query.data);

  return (
    <RankingCardShell
      icon={BuildingLibraryIcon}
      title={t("ftsoRewards.providers.title")}
      caption={t("ftsoRewards.providers.description")}
      titleHint={
        <InfoHint label={t("ftsoRewards.providers.help.label")}>
          {t("ftsoRewards.providers.help.body")}
        </InfoHint>
      }
      isLoading={query.isLoading}
      isError={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      isEmpty={!query.isLoading && !query.isError && rows.length === 0}
      emptyTitle={t("rankings.noData")}
      emptyDescription={t("ftsoRewards.providers.emptyDescription")}
    >
      {rows.map((row) => (
        <ProviderRow key={row.key} row={row} t={t} />
      ))}
    </RankingCardShell>
  );
}
