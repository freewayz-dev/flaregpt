// Registry-driven multi-coin donation config — one entry per supported
// coin, so adding a 6th coin later is a data-entry change rather than a
// redesign (mirrors the DeFi page's PROTOCOLS registry pattern in
// src/pages/DefiProtocols/protocols.jsx). Every component on the Donate
// page reads a coin object from this array rather than hardcoding a
// symbol/address, which is what lets the coin selector swap the whole
// page's content without any component needing coin-specific branches.
//
// PLACEHOLDER ADDRESSES — every address below (other than DOGE) is a
// well-known, publicly documented "null"/"burn" address for its own
// chain — never a fabricated look-alike — chosen deliberately so funds
// can never actually be lost to them:
//   - FLR/SGB: the standard EVM null address (both chains share Flare's
//     C-chain address format).
//   - XRP: the XRP Ledger's own documented reserved "ACCOUNT_ZERO".
//   - BTC: the widely-documented Bitcoin "eater" vanity address.
//   - DOGE: no equivalent canonical null address is publicly documented
//     for Dogecoin, so this placeholder deliberately uses characters
//     outside Dogecoin's Base58 alphabet — it cannot decode to a real,
//     spendable address at all.
// ALL FIVE must be replaced with FlareGPT's real donation wallets before
// this page ships to production — see the addresses requested from the
// team.
export interface DonationCoin {
  id: string;
  symbol: string;
  name: string;
  network: string;
  address: string;
  isMultisig: boolean;
  explorerName: string;
  explorerUrl: (address: string) => string;
  suggestedAmounts: number[];
  receivedAmount: number;
}

export const DONATION_COINS: DonationCoin[] = [
  {
    id: "flr",
    symbol: "FLR",
    name: "Flare",
    network: "Flare Mainnet",
    address: "0x0000000000000000000000000000000000000000",
    isMultisig: true,
    explorerName: "FlareScan",
    explorerUrl: (address) => `https://flarescan.com/address/${address}`,
    suggestedAmounts: [50, 100, 500, 1000],
    receivedAmount: 18450,
  },
  {
    id: "sgb",
    symbol: "SGB",
    name: "Songbird",
    network: "Songbird Canary-Network",
    address: "0x0000000000000000000000000000000000000000",
    isMultisig: true,
    explorerName: "Songbird Explorer",
    explorerUrl: (address) =>
      `https://songbird-explorer.flare.network/address/${address}`,
    suggestedAmounts: [200, 500, 2000, 5000],
    receivedAmount: 9200,
  },
  {
    id: "xrp",
    symbol: "XRP",
    name: "XRP",
    network: "XRP Ledger",
    address: "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
    isMultisig: false,
    explorerName: "XRPScan",
    explorerUrl: (address) => `https://xrpscan.com/account/${address}`,
    suggestedAmounts: [10, 25, 100, 250],
    receivedAmount: 3250,
  },
  {
    id: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    network: "Bitcoin Mainnet",
    address: "1BitcoinEaterAddressDontSendf59kuE",
    isMultisig: false,
    explorerName: "mempool.space",
    explorerUrl: (address) => `https://mempool.space/address/${address}`,
    suggestedAmounts: [0.001, 0.005, 0.01, 0.05],
    receivedAmount: 0.084,
  },
  {
    id: "doge",
    symbol: "DOGE",
    name: "Dogecoin",
    network: "Dogecoin Mainnet",
    address: "D0000000000000000000000000000000",
    isMultisig: false,
    explorerName: "Dogechain",
    explorerUrl: (address) => `https://dogechain.info/address/${address}`,
    suggestedAmounts: [500, 1000, 5000, 10000],
    receivedAmount: 14500,
  },
];

// Placeholder/demo figures only (no billing backend exists yet) — an
// overall, currency-denominated view of funding health that sits
// alongside (but independent from) the per-coin DONATION_COINS above,
// since a single "goal" can't be expressed in five different units at
// once. Structured so a future API response can replace this object
// directly without touching the components that read it.
export const FUNDING_GOALS = {
  currency: "USD",
  monthly: { label: "monthlyInfrastructure", goal: 2500, raised: 1780 },
  development: { label: "developmentFund", goal: 6000, raised: 3150 },
};
