import type { TableInfo } from "../types/index";
import { request } from "./client";

export interface GetTableParams {
  tableId: string;
  deviceToken?: string;
  sessionId?: string;
}

export function getTable({
  tableId,
  deviceToken,
  sessionId,
}: GetTableParams): Promise<TableInfo> {
  return request<TableInfo>(`/table/${encodeURIComponent(tableId)}`, {
    query: {
      device_token: deviceToken,
      session_id: sessionId,
    },
  });
}
