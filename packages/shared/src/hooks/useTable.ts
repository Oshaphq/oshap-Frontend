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

export function useRequestPos() {
  const qc = useQueryClient();
  return useMutation<RequestPosResponse, Error, RequestPosRequest>({
    mutationFn: requestPos,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tables.all });
    },
  });
}
