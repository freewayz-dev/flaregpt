// Injected via page.addInitScript() so this runs before any app code, the
// same timing a real extension gets. Announces via EIP-6963, matching
// ConnectWalletModal.jsx's real detection order (checked by reading its
// isWalletDetected()/findRdnsConnector()/findInjectedProvider()): it looks
// for an EIP-6963 announcement by rdns FIRST, only falling back to sniffing
// window.ethereum flags if nothing announced. Announcing as "io.metamask"
// exercises that primary path instead of the fallback.
export const MOCK_WALLET_ADDRESS = "0x1111111111111111111111111111111111111111";

// page.addInitScript(fn) stringifies this function and evaluates it fresh
// in the page — it does NOT run as a real JS closure, so it can't see
// MOCK_WALLET_ADDRESS or any other module-scope binding above. Callers must
// use `page.addInitScript(injectedWalletScript, MOCK_WALLET_ADDRESS)`
// (Playwright's own supported way to pass a JSON-serializable value into an
// init script) rather than a hardcoded literal here — otherwise this and
// the exported constant are two independently-typed copies of the same
// address that can silently drift apart.
export function injectedWalletScript(address) {
  const signature = `0x${"ab".repeat(65)}`;
  const chainId = "0xe"; // Flare mainnet, chain id 14

  // A real extension only reveals accounts via eth_accounts *after* a site
  // has been granted permission through an explicit eth_requestAccounts —
  // an untouched page always gets []. Answering eth_accounts with the
  // address unconditionally let wagmi's silent reconnect-on-mount check
  // "discover" this wallet before the test ever clicked Connect, which
  // skipped the disconnected empty state entirely.
  let authorized = false;

  const provider = {
    isMetaMask: true,
    async request({ method }) {
      switch (method) {
        case "eth_requestAccounts":
          authorized = true;
          return [address];
        case "eth_accounts":
          return authorized ? [address] : [];
        case "eth_chainId":
          return chainId;
        case "personal_sign":
          return signature;
        case "wallet_switchEthereumChain":
          return null;
        default:
          throw new Error(`Mock wallet: unhandled method ${method}`);
      }
    },
    on() {},
    removeListener() {},
  };

  const announce = () => {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({
          info: {
            uuid: "mock-wallet-uuid",
            name: "MetaMask",
            icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
            rdns: "io.metamask",
          },
          provider,
        }),
      }),
    );
  };

  window.addEventListener("eip6963:requestProvider", announce);
  announce();
}
