import { create } from "zustand";

// Overview's wallet-dependent cards (WalletBalancesCard, FtsoPortfolioCard,
// ClaimsHistoryCard, DelegationsBreakdownCard, ClaimsAndDelegationsSection's
// mobile tabs) are each fully self-contained — none of them receive props
// from Dashboard/index.tsx today, and it stays that way here too. A tiny,
// dedicated store (matching this app's existing pattern of small single-
// purpose stores — useUIStore, usePwaInstallStore, ...) is what lets any of
// them open the one real modal instance (mounted once, in Dashboard/index.tsx)
// without threading an onAddWallet callback through several unrelated
// component trees. Deliberately NOT persisted — unlike useWalletHubStore,
// "the add-wallet modal was open" is never something that should survive a
// reload.


export const useAddWalletModalStore = create()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
