import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as chatService from "@/services/chatService";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";

// `enabled` is the caller's `hasSession` — a guest has no conversations to
// list at all (the endpoint requires auth), so this simply never fires
// for them rather than firing and 401ing on every mount. The query key
// itself is scoped by `authenticatedAddress` (see queryKeys.ts's own
// comment, and useWatchlistQueries.ts's `useWatchlist` for the identical
// pattern) — reading it directly from the store here keeps every existing
// `useConversations(hasSession)` call site unchanged.
export function useConversations(enabled) {
  const authenticatedAddress = useAuthStore((state) => state.authenticatedAddress);
  return useQuery({
    queryKey: queryKeys.chat.conversations(authenticatedAddress),
    queryFn: ({ signal }) => chatService.fetchConversations(signal),
    enabled,
    staleTime: 15_000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const authenticatedAddress = useAuthStore((state) => state.authenticatedAddress);
  return useMutation({
    mutationFn: (title) => chatService.createConversation(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations(authenticatedAddress) });
    },
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();
  const authenticatedAddress = useAuthStore((state) => state.authenticatedAddress);
  return useMutation({
    mutationFn: ({ conversationId, title }) =>
      chatService.renameConversation(conversationId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations(authenticatedAddress) });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const authenticatedAddress = useAuthStore((state) => state.authenticatedAddress);
  return useMutation({
    mutationFn: (conversationId) => chatService.deleteConversation(conversationId),
    onSuccess: (_data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations(authenticatedAddress) });
      queryClient.removeQueries({ queryKey: queryKeys.chat.conversation(conversationId) });
    },
  });
}
