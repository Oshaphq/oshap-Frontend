import { useMutation, useQuery } from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import {
  callWaiter,
  getTable,
  type GetTableParams,
} from "../api/tables";
import type {
  CallWaiterRequest,
  CallWaiterResponse,
} from "../types/index";

export function useTable(params: GetTableParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tables.detail(
      params.tableId,
      params.deviceToken,
      params.sessionId,
    ),
    queryFn: () => getTable(params),
    enabled: enabled && Boolean(params.tableId),
  });
}

export function useCallWaiter() {
  return useMutation<CallWaiterResponse, Error, CallWaiterRequest>({
    mutationFn: callWaiter,
  });
}
