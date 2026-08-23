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

/** Matches `useTable` — the guest's only way of learning anything changed. */
const LIVE_POLL_MS = 10_000;

/** An order still moving through the kitchen or waiting to be paid for. */
const IN_PROGRESS: ReadonlySet<string> = new Set([
  "CREATED",
  "PREPARING",
  "READY",
  "PAYMENT_PENDING",
]);

/**
 * Every order on this table, for the guest.
 *
 * **Polls only while an order is still moving.** The screen already knows how
 * to say "Your order is ready" the moment a status changes — that code has
 * existed all along and has never had anything to react to, because nothing
 * ever refetched. Once every order is settled or cancelled there is nothing
 * left to watch, so it stops.
 */
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
    refetchInterval: (query) => {
      const orders = query.state.data?.orders ?? [];
      return orders.some((o) => IN_PROGRESS.has(o.status)) ? LIVE_POLL_MS : false;
    },
    // Coming back to the app after locking the phone is exactly when a guest
    // wants to know whether the food is up.
    refetchOnWindowFocus: true,
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
