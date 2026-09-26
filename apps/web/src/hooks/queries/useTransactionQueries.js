import { useQuery } from "@tanstack/react-query";

import { fetchTransaction } from "@/services/transactionService";
import { queryKeys } from "@/services/queryKeys";
import { QUICK_RESILIENCE } from "@/hooks/queries/resilience";

// `enabled` on a non-empty hash only — this only ever runs once the user
// has actually submitted the search form, never on every keystroke (see
// TransactionLookup/index.jsx, which only updates `submittedHash` on
// submit). A confirmed transaction never changes, and a pending one is
// re-checked by the user re-submitting rather than an automatic poll — no
// staleTime override needed beyond the app-wide default, since re-running
// the same search is exactly a manual refetch either way.
export function useTransactionLookup(txHash) {
  return useQuery({
    queryKey: queryKeys.transaction.lookup(txHash),
    queryFn: ({ signal }) => fetchTransaction(txHash, signal),
    enabled: Boolean(txHash),
    ...QUICK_RESILIENCE,
  });
}
