import { useConnections, useDisconnect } from "wagmi";

// wagmi can end up with more than one connector "connected" at once — e.g.
// both Rabby and MetaMask still authorized at the extension level from an
// earlier session — even though only one is ever shown as `current`.
// Disconnecting just the current one leaves the other's entry in wagmi's
// internal connections map, and wagmi's own disconnect action then
// silently promotes that leftover entry to `current` instead of going to a
// disconnected state — no new handshake, no permission prompt, just the
// previous wallet's address reappearing. Disconnecting every active
// connection here guarantees nothing is left to fall back to, so the next
// connect attempt always starts fresh.
//
// Shared by Sidebar's footer control and Navbar's wallet dropdown — both
// need this exact defensive behavior, not just a plain single disconnect.
export function useDisconnectAllWallets() {
  const { mutateAsync: disconnectAsync } = useDisconnect();
  const connections = useConnections();

  return async () => {
    for (const connection of connections) {
      await disconnectAsync({ connector: connection.connector }).catch(
        () => {},
      );
    }
  };
}
