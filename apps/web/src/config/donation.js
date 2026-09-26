// Registry-driven multi-coin donation config — one entry per supported
// coin, so adding a 6th coin later is a data-entry change rather than a
// redesign (mirrors the DeFi page's PROTOCOLS registry pattern in
// src/pages/DefiProtocols/protocols.jsx). Every component on the Donate
// page reads a coin object from this array rather than hardcoding a
// symbol/address, which is what lets the coin selector swap the whole
// page's content without any component needing coin-specific branches.
//
// These are FlareGPT's real donation addresses. Copy exactly — do not
// reformat, checksum, shorten, or otherwise alter any address here.


export const DONATION_COINS = [
  {
    id: "flr",
    symbol: "FLR",
    name: "Flare",
    network: "Flare Mainnet",
    address: "0x8DFE259E4eA889463a5ED98CBcb02C74f5cBb914",
    explorerName: "FlareScan",
    explorerUrl: (address) => `https://flarescan.com/address/${address}`,
    suggestedAmounts: [50, 100, 500, 1000],
  },
  {
    id: "sgb",
    symbol: "SGB",
    name: "Songbird",
    network: "Songbird Canary-Network",
    address: "0x8DFE259E4eA889463a5ED98CBcb02C74f5cBb914",
    explorerName: "Songbird Explorer",
    explorerUrl: (address) =>
      `https://songbird-explorer.flare.network/address/${address}`,
    suggestedAmounts: [200, 500, 2000, 5000],
  },
  {
    id: "xrp",
    symbol: "XRP",
    name: "XRP",
    network: "XRP Ledger",
    address: "rPTuMXgPUdbwbctEN4rEFjWm88Hvfd9wLK",
    explorerName: "XRPScan",
    explorerUrl: (address) => `https://xrpscan.com/account/${address}`,
    suggestedAmounts: [10, 25, 100, 250],
  },
  {
    id: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    network: "Bitcoin Mainnet",
    address: "bc1q20z6wq7lhg6w95hala8702pud7dcmdrc0v5nf0",
    explorerName: "mempool.space",
    explorerUrl: (address) => `https://mempool.space/address/${address}`,
    suggestedAmounts: [0.001, 0.005, 0.01, 0.05],
  },
  {
    id: "doge",
    symbol: "DOGE",
    name: "Dogecoin",
    network: "Dogecoin Mainnet",
    address: "D8ENqX9mMofTio3MTodyyjg4ti3yBLmV3A",
    explorerName: "Dogechain",
    explorerUrl: (address) => `https://dogechain.info/address/${address}`,
    suggestedAmounts: [500, 1000, 5000, 10000],
  },
];
