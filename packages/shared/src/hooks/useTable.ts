import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import { getTable, type GetTableParams } from "../api/tables";

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
