import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import {
  callWaiter,
  getTable,
  requestPos,
  type GetTableParams,
} from "../api/tables";
import type {
  CallWaiterRequest,
  CallWaiterResponse,
  RequestPosRequest,
  RequestPosResponse,
} from "../types/index";

/**
 * How often a guest's screen catches up while a bill is open.
 *
 * A guest has no realtime channel at all — `GET /events` needs a staff token,
 * so the customer app's SSE connection has only ever 401'd. Until that is
 * settled, polling is the whole mechanism, which is why this is short enough
 * to feel live rather than merely eventual.
 */
const LIVE_POLL_MS = 10_000;

/**
 * Exported so the condition is a test rather than a claim. A refetch interval
 * that quietly returns `false` looks identical to a feature that was never
 * wired: the screen just never updates.
 */
export function tablePollMs(
  data: { unpaid_order?: unknown; pending_payments?: unknown } | undefined,
): number | false {
  // No data yet means we have not looked, not that there is nothing to watch.
  if (!data) return LIVE_POLL_MS;
  return data.unpaid_order || data.pending_payments ? LIVE_POLL_MS : false;
}

/**
 * The table a guest is sitting at.
 *
 * **Polls only while something is actually happening.** A guest reading a menu
 * with no order placed has nothing to catch up on, and polling them all evening
 * would spend their battery and our server to tell them nothing changed. Once a
 * bill exists — unpaid or claimed — the screen keeps up on its own, which is
 * what makes a receipt appear after staff verify a payment instead of waiting
 * for someone to think to reload.
 */
export function useTable(params: GetTableParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tables.detail(
      params.tableId,
      params.deviceToken,
      params.sessionId,
    ),
    queryFn: () => getTable(params),
    enabled: enabled && Boolean(params.tableId),
    refetchInterval: (query) => tablePollMs(query.state.data),
    /**
     * A guest who locks their phone while waiting for food and comes back
     * should see the current state, not a ten-second-old one. The customer app
     * turns this off globally, which is right for a menu and wrong here.
     */
    refetchOnWindowFocus: true,
  });
}

export function useCallWaiter() {
  return useMutation<CallWaiterResponse, Error, CallWaiterRequest>({
    mutationFn: callWaiter,
  });
}

export function useRequestPos() {
  const qc = useQueryClient();
  return useMutation<RequestPosResponse, Error, RequestPosRequest>({
    mutationFn: requestPos,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tables.all });
    },
  });
}
