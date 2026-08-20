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
  TableInfo,
} from "../types/index";

/**
 * `pollMs` is the floor under `useTableEvents`, not a replacement for it.
 *
 * Off by default: the menu does not need it, and polling every guest's phone
 * for the length of a meal is a cost with no reader. A screen that is waiting
 * on a specific transition — the pay screen waiting to be verified — turns it
 * on for as long as it is waiting, so a dropped stream degrades that wait to
 * slow rather than to forever.
 */
export function useTable(
  params: GetTableParams,
  enabled = true,
  pollMs:
    | number
    | false
    | ((table: TableInfo | undefined) => number | false) = false,
) {
  return useQuery({
    queryKey: queryKeys.tables.detail(
      params.tableId,
      params.deviceToken,
      params.sessionId,
    ),
    queryFn: () => getTable(params),
    enabled: enabled && Boolean(params.tableId),
    // The function form so a caller can poll only while it is waiting on
    // something, without needing the query result to configure the query.
    refetchInterval:
      typeof pollMs === "function"
        ? (query) => pollMs(query.state.data)
        : pollMs,
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
