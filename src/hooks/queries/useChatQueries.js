import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as chatService from "@/services/chatService";
import { queryKeys } from "@/services/queryKeys";

// `enabled` is the caller's `hasSession` — a guest has no conversations to
// list at all (the endpoint requires auth), so this simply never fires
// for them rather than firing and 401ing on every mount.
export function useConversations(enabled) {
  return useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: chatService.fetchConversations,
    enabled,
    staleTime: 15_000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title) => chatService.createConversation(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    },
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, title }) => chatService.renameConversation(conversationId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) => chatService.deleteConversation(conversationId),
    onSuccess: (_data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
      queryClient.removeQueries({ queryKey: queryKeys.chat.conversation(conversationId) });
    },
  });
}
