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

/** Matches `useTable` — the guest's only way of learning anything changed. */
const LIVE_POLL_MS = 10_000;

/**
 * An order still moving through the kitchen or waiting to be paid for.
 *
 * `SERVED` belongs here even though the food has arrived: it says nothing about
 * the money, and a guest who pays after eating still needs to watch their bill
 * settle. Leaving it out would stop polling at the exact moment the guest picks
 * their phone back up to pay.
 */
const IN_PROGRESS: ReadonlySet<string> = new Set([
  "CREATED",
  "PREPARING",
  "READY",
  "SERVED",
  "PAYMENT_PENDING",
]);

/**
 * Exported so the condition is a test rather than a claim. A refetch interval
 * that silently returns `false` is invisible: the screen simply never updates,
 * which is indistinguishable from the feature not being wired at all.
 */
export function orderDetailPollMs(
  data: { status?: string } | undefined,
): number | false {
  if (!data?.status) return LIVE_POLL_MS;
  return IN_PROGRESS.has(data.status) ? LIVE_POLL_MS : false;
}

export function sessionOrdersPollMs(
  data: { orders?: { status: string }[] } | undefined,
): number | false {
  const orders = data?.orders;
  // No data yet is not "nothing to watch" — it is "we have not looked".
  if (!orders) return LIVE_POLL_MS;
  return orders.some((o) => IN_PROGRESS.has(o.status)) ? LIVE_POLL_MS : false;
}

/**
 * One order, for the guest.
 *
 * **This is what the receipt reads.** The pay screen shows a receipt once the
 * order is settled, and this query had no polling — so the table could refresh
 * underneath it and the receipt still would not appear until someone reloaded
 * the page. Two other queries were given a poll and this one was missed, which
 * is exactly the gap a guest actually noticed.
 */
export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId ?? ""),
    queryFn: () => getOrder(orderId!),
    enabled: Boolean(orderId),
    refetchInterval: (query) => orderDetailPollMs(query.state.data),
    refetchOnWindowFocus: true,
  });
}

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
    refetchInterval: (query) => sessionOrdersPollMs(query.state.data),
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
