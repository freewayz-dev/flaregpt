import { flareApi } from "@/services/apiClient";

// `signal` forwarded to axios on every call here — without it, switching
// wallets left the previous wallet's vault request running to completion
// server-side for no reason (its result lands under the old wallet's cache
// key, never the new one). Matches the pattern in rflrService.js.
//
// Every shape below is derived from real field access in each vault's own
// consumer (the matching Detail component) — grepped, not guessed — per
// this project's standing discipline, now that the DeFi Protocols pages
// are actually being converted (this was deliberately deferred to that
// point during Phase 1). Only the fields real callers read are included.

export interface MxrpyVaultResponse {
  global_metrics: {
    total_circulating_shares: number;
    token_decimals: number;
  };
  user_portfolio: {
    receipt_shares: number;
  };
  token_symbol: string;
  contract_proxy: string;
}

export async function fetchMxrpyVault(
  walletAddress: string | undefined,
  signal?: AbortSignal,
): Promise<MxrpyVaultResponse> {
  const { data } = await flareApi.get("/api/v1/defi/vaults/mxrpy", {
    params: { user_wallet: walletAddress },
    signal,
  });
  return data;
}

export interface SceptreVaultResponse {
  global_kpis: {
    sflr_to_flr_exchange_rate: number;
    total_minted_shares: number;
    underlying_backed_flr: number;
  };
  user_position: {
    sflr_shares_balance: number;
    redeemable_value_flr: number;
    // A pre-formatted percent string (e.g. "0.42%"), not a number —
    // SceptreDetail.jsx both parses it (`parsePercent`) AND renders it
    // verbatim as PoolOwnershipBar's `valueLabel`, so the raw string is
    // what real consumers actually need, not a number this file would
    // have to guess a display format for.
    pool_ownership: string;
  };
  proxy_address: string;
}

export async function fetchSceptreVault(
  walletAddress: string | undefined,
  signal?: AbortSignal,
): Promise<SceptreVaultResponse> {
  const { data } = await flareApi.get("/api/v1/defi/vaults/sceptre", {
    params: { user_wallet: walletAddress },
    signal,
  });
  return data;
}

export interface FirelightVaultResponse {
  global_analytics: {
    asset_backing_multiplier: number;
    circulating_supply_stxrp: number;
    underlying_reserve_fxrp: number;
    // Only this one literal value is ever checked (protocols.jsx's
    // getBadge) — a wider `string` is honest about every other possible
    // value being unconfirmed, matching dashboardService.ts's own
    // "only what's read" discipline.
    insurance_pool_status?: string;
  };
  user_portfolio: {
    stxrp_balance: number;
    redeemable_fxrp_value: number;
    pool_ownership: string;
  };
  receipt_token: string;
  proxy_contract: string;
}

export async function fetchFirelightVault(
  walletAddress: string | undefined,
  signal?: AbortSignal,
): Promise<FirelightVaultResponse> {
  const { data } = await flareApi.get("/api/v1/defi/vaults/firelight", {
    params: { user_wallet: walletAddress },
    signal,
  });
  return data;
}

export interface SpectraMarket {
  matured: boolean;
  days_to_maturity: number;
  maturity_date: string;
  global_analytics: {
    pt_circulating_supply: number;
    ibt_locked: number;
  };
  pt_symbol: string;
  pt_contract: string;
  yt_contract: string;
  ibt_contract: string;
  // Only present once a wallet is selected (SpectraDetail.jsx reads every
  // field through `?.` and a `?? 0` fallback specifically because of this).
  user_position?: {
    pt_balance?: number;
    yt_balance?: number;
    redeemable_underlying_at_maturity?: number;
    claimable_yield_ibt?: number;
  };
}

export interface SpectraVaultResponse {
  // Always exactly one entry — `market` is always one of the two slugs the
  // selector restricts to, never free text (see fetchSpectraVault below).
  markets: SpectraMarket[];
}

// `market` always one of the two slugs the selector restricts to (never
// free text), so the response's own `markets` array is always exactly one
// entry — see useSpectraVault. `user_wallet` omitted (not sent as
// `"undefined"`) when there's no wallet: axios drops a param whose value is
// literally `undefined`, and the endpoint's own global market data (supply,
// maturity) is meaningful without one.
export async function fetchSpectraVault(
  walletAddress: string | undefined,
  market: string,
  signal?: AbortSignal,
): Promise<SpectraVaultResponse> {
  const { data } = await flareApi.get("/api/v1/defi/vaults/spectra", {
    params: { user_wallet: walletAddress || undefined, market },
    signal,
  });
  return data;
}

export interface Strategy {
  // Pre-formatted percent string, same reasoning as SceptreVaultResponse's
  // `pool_ownership` — StrategyComparisonTable.jsx both parses
  // (`parseAprPercent`) and never re-formats it beyond that parse.
  apr: string;
  estimated_annual_yield: number;
  liquidity: string;
  lockup_seconds: number;
  display_name: string;
  flaregpt_verdict: string;
  compounding: string;
}

export interface CompareStrategiesResponse {
  strategies: Record<string, Strategy>;
}

export async function fetchCompareStrategies(
  amountFlr: number,
  signal?: AbortSignal,
): Promise<CompareStrategiesResponse> {
  const { data } = await flareApi.get("/api/v1/defi/compare-strategies", {
    params: { user_amount_flr: amountFlr },
    signal,
  });
  return data;
}
