import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import {
  confirmOrders,
  createOrder,
  getOrder,
} from "../api/orders";
import { claimPayment } from "../api/payments";
import {
  getSessionOrders,
  type GetSessionOrdersParams,
} from "../api/sessions";

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId ?? ""),
    queryFn: () => getOrder(orderId!),
    enabled: Boolean(orderId),
  });
}

export function useSessionOrders(
  params: GetSessionOrdersParams,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.orders.sessionList(
      params.sessionId,
      params.tableId,
      params.deviceToken,
    ),
    queryFn: () => getSessionOrders(params),
    enabled:
      enabled && Boolean(params.sessionId ?? params.tableId),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
    },
  });
}

export function useClaimPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: claimPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
    },
  });
}

export function useConfirmOrders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
    },
  });
}
