// Flare's own `ClaimSetupManager` system contract (Coston2) — lets a
// wallet owner authorize a specific "executor" address to claim FTSO
// rewards on their behalf, without ever handing over funds or keys. Gas
// Sniper's keeper needs this approval before the backend will enable the
// loop for a wallet (confirmed live: `POST /loops/gas-sniper/enable` 409s
// with `EXECUTOR_NOT_SET` otherwise) — see GasSniperCard.jsx for the
// approve flow this backs.
//
// Both addresses and the full ABI were confirmed directly against the
// live, verified contract on Coston2's own block explorer
// (coston2-explorer.flare.network), not guessed — only the two functions
// actually used here are included, not the contract's full surface.
// `keeper_address`/`claim_setup_manager_address` are also echoed back in
// the backend's own 409 response body — if those ever drift from the
// constants below (e.g. a keeper rotation), prefer whatever the live
// error response says over these.
import type { Address } from "viem";

export const CLAIM_SETUP_MANAGER_ADDRESS: Address = "0x5Ddb590530EF66775E6225671eaBD94959e9AE0e";
export const GAS_SNIPER_KEEPER_ADDRESS: Address = "0x28E900cf47EDC3C205AEE926Dbb1B3F41D475e1F";

// `as const` is the whole point of converting this file first: wagmi/viem
// derive full type inference (function names, arg types, return types) from
// an ABI declared this way, at every useReadContract/useWriteContract call
// site referencing it — without it, those calls only ever see a generic,
// widened `{ name: string; ... }[]` and lose all of that for free type
// safety this contract's real shape already provides.
export const CLAIM_SETUP_MANAGER_ABI = [
  {
    inputs: [{ internalType: "address[]", name: "_executors", type: "address[]" }],
    name: "setClaimExecutors",
    outputs: [],
    // Confirmed via the verified source: charges a per-new-executor fee
    // (`getExecutorCurrentFeeValue`) that must be covered by `msg.value`,
    // refunding any excess automatically. Confirmed live the Gas Sniper
    // keeper's own fee is currently 0, so this is always called with
    // value 0n — but it's read fresh (see useGasSniperExecutorFee below)
    // rather than assumed permanently free, since that's the contract's
    // own owner-adjustable setting, not a constant.
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_owner", type: "address" },
      { internalType: "address", name: "_executor", type: "address" },
    ],
    name: "isClaimExecutor",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_executor", type: "address" }],
    name: "getExecutorCurrentFeeValue",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
