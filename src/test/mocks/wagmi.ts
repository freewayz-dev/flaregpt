import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { mock, type MockParameters } from "wagmi/connectors";
import { getAddress } from "viem";

import { flare, coston2 } from "@/config/web3Config";
import { TEST_ADDRESSES } from "@/test/fixtures";

// Test-only Wagmi config — never the real `web3Config.js` (which targets
// real injected/WalletConnect connectors). Built on wagmi's own `mock`
// connector so tests can simulate a connected wallet deterministically,
// with no real extension, network call, or WalletConnect relay involved.
// Same chain set as production so chain-dependent code (Gas Sniper's
// Coston2 requirement, FlareScan tx links) behaves identically under test.
//
// Deliberately does NOT use the mock connector's own `defaultConnected`
// feature — confirmed live (see test-utils.test.jsx) that it does not
// synchronously (or even eventually, without persisted connector state
// wagmi has no reason to have here) put the config into a connected state
// on its own; wagmi's real reconnect-on-mount only fires for a connector
// it has actual persisted history for. Getting to "connected" for a test
// is instead done by actually driving `useConnect()` (see
// test-utils.jsx's AutoConnect) exactly like a real user/component would
// — slower to set up than a flag, but it's real behavior, not a shortcut
// that could silently stop reflecting what the app actually does.
interface CreateTestWagmiConfigOptions {
  address?: string;
  features?: MockParameters["features"];
}

export function createTestWagmiConfig({
  address = TEST_ADDRESSES.primary,
  features,
}: CreateTestWagmiConfigOptions = {}) {
  return createConfig({
    chains: [flare, mainnet, coston2],
    connectors: [
      mock({
        // viem validates EIP-55 checksums strictly (confirmed live: a
        // plain lowercase/repeated-digit placeholder address throws
        // "invalid address" the moment connect() is actually driven
        // through useConnect() — see AutoConnect in test-utils.jsx).
        // Checksumming here means any caller can pass a plain hex address
        // without needing to hand-verify its casing.
        accounts: [getAddress(address)],
        features,
      }),
    ],
    transports: {
      [flare.id]: http(),
      [mainnet.id]: http(),
      [coston2.id]: http(),
    },
  });
}
