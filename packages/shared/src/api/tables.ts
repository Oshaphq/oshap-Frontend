import type {
  CallWaiterRequest,
  CallWaiterResponse,
  RequestPosRequest,
  RequestPosResponse,
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

export function requestPos({
  table_id,
  session_id,
  device_token,
}: RequestPosRequest): Promise<RequestPosResponse> {
  const body: Record<string, string> = {};
  if (session_id) body.session_id = session_id;
  if (device_token) body.device_token = device_token;
  return request<RequestPosResponse>(
    `/table/${encodeURIComponent(table_id)}/request-pos`,
    {
      method: "POST",
      body,
    },
  );
}
