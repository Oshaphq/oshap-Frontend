import type {
  CallWaiterRequest,
  CallWaiterResponse,
  TableInfo,
} from "../types/index";
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

export function callWaiter({
  table_id,
  session_id,
}: CallWaiterRequest): Promise<CallWaiterResponse> {
  return request<CallWaiterResponse>(
    `/table/${encodeURIComponent(table_id)}/call-waiter`,
    {
      method: "POST",
      body: session_id ? { session_id } : {},
    },
  );
}
