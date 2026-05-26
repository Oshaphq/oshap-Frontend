import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import { joinSession, startSession } from "../api/sessions";

export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export function useJoinSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}
