import { formatEther } from "viem";

import {
  CLAIM_SETUP_MANAGER_ADDRESS,
  CLAIM_SETUP_MANAGER_ABI,
  GAS_SNIPER_KEEPER_ADDRESS,
} from "@/config/claimSetupManager";

// A real, user-reported "insufficient balance" failure — investigated
// directly against the live contract rather than assumed to be a wallet
// UI quirk. Confirmed via a direct eth_call against Coston2's own RPC: the
// keeper's own fee (`getExecutorCurrentFeeValue`, GasSniperCard.jsx's
// `keeperFee`) genuinely is 0 right now, ruling out a units/decimals bug
// inflating the `value` this app sends — the actual `setClaimExecutors`
// call this flow makes needs no C2FLR *value* at all today. What it does
// need is gas, and Coston2's live gas price is high enough (confirmed
// live: ~650 gwei) that a plain ~116,000-gas call costs a genuinely
// nontrivial ~0.075 C2FLR — independently verified via
// `estimateGas`/`getGasPrice` against the same public RPC this app
// already uses, and matching, almost to the decimal, what MetaMask's own
// confirmation screen showed as its "Network fee" warning. This isn't a
// bug in this app's request; it's Coston2's real, current cost to send
// this transaction, and a wallet funded with only a small testnet-faucet
// amount can legitimately fall short of it.
//
// The fix isn't a code change to the transaction itself (there's nothing
// wrong with it) — it's checking for this *before* asking the wallet to
// sign anything, so the failure is a clear, immediate, specific message
// instead of whatever vague error the wallet's own JSON-RPC layer happens
// to surface once the attempt is already underway (confirmed live: at
// least one WalletConnect-connected wallet reports this exact case as
// "An unknown RPC error occurred," with no indication of why). MetaMask
// happens to have a nicer built-in warning for this same condition
// (that's what "Network fee ⚠️ 0.0754 C2FLR" was); this check gives every
// connector — WalletConnect included — the same clarity up front, and
// saves the round trip to the wallet entirely when it's already known to
// fail.
export class InsufficientGasBalanceError extends Error {
  constructor({ required, available }) {
    super("The connected wallet doesn't have enough C2FLR to cover this transaction's network fee.");
    this.name = "InsufficientGasBalanceError";
    this.required = required;
    this.available = available;
  }
}

// `publicClient` — a plain, read-only RPC client scoped to Coston2 (see
// GasSniperCard.jsx's `usePublicClient({ chainId: coston2.id })`), not the
// connected wallet's own provider. Gas estimation and balance are public
// chain state; asking over the wallet's own (sometimes WalletConnect-
// relayed, sometimes slow or unreliable) connection would be slower and,
// for a WalletConnect connector, would need this app to already be on
// Coston2 — exactly the thing not yet guaranteed at this point in the
// flow. `value` is the same amount handleApprove is about to send
// (`keeperFee ?? 0n` today, but read live rather than assumed, matching
// how keeperFee itself is read).
export async function assertSufficientCoston2GasBalance({ publicClient, account, value }) {
  const [gasEstimate, gasPrice, balance] = await Promise.all([
    publicClient.estimateContractGas({
      address: CLAIM_SETUP_MANAGER_ADDRESS,
      abi: CLAIM_SETUP_MANAGER_ABI,
      functionName: "setClaimExecutors",
      args: [[GAS_SNIPER_KEEPER_ADDRESS]],
      account,
      value,
    }),
    publicClient.getGasPrice(),
    publicClient.getBalance({ address: account }),
  ]);

  const required = gasEstimate * gasPrice + value;
  if (balance < required) {
    throw new InsufficientGasBalanceError({ required, available: balance });
  }
}

// C2FLR is 18 decimals, same as FLR/ETH — formatEther is exact here, not
// an approximation borrowed from a differently-scaled token. Trimmed to 4
// decimal places for a toast (matching the precision MetaMask's own
// "0.0754 C2FLR" happened to show), not the full 18-decimal-place string
// formatEther alone would give.
export function formatC2FlrShortfall(amount) {
  const [whole, fraction = ""] = formatEther(amount).split(".");
  return fraction ? `${whole}.${fraction.slice(0, 4)}` : whole;
}
