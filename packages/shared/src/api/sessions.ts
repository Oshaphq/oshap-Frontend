import type {
  SessionJoinRequest,
  SessionOrdersResponse,
  SessionResponse,
  SessionStartRequest,
} from "../types/index";
import { request } from "./client";

export function startSession(
  payload: Omit<SessionStartRequest, "action">,
): Promise<SessionResponse> {
  return request<SessionResponse>("/session", {
    method: "POST",
    body: { ...payload, action: "START" } satisfies SessionStartRequest,
  });
}

export function joinSession(
  payload: Omit<SessionJoinRequest, "action">,
): Promise<SessionResponse> {
  return request<SessionResponse>("/session", {
    method: "POST",
    body: { ...payload, action: "JOIN" } satisfies SessionJoinRequest,
  });
}

export interface GetSessionOrdersParams {
  sessionId?: string;
  tableId?: string;
  deviceToken?: string;
}

export function getSessionOrders({
  sessionId,
  tableId,
  deviceToken,
}: GetSessionOrdersParams): Promise<SessionOrdersResponse> {
  return request<SessionOrdersResponse>("/session/orders", {
    query: {
      session_id: sessionId,
      table_id: tableId,
      device_token: deviceToken,
    },
  });
}
