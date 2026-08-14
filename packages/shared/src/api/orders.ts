import type {
  ConfirmOrdersRequest,
  ConfirmOrdersResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderDetail,
} from "../types/index";
import { request } from "./client";

export function createOrder(
  payload: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  return request<CreateOrderResponse>("/orders", {
    method: "POST",
    body: payload,
  });
}

export function getOrder(orderId: string): Promise<OrderDetail> {
  return request<OrderDetail>(`/orders/${encodeURIComponent(orderId)}`);
}

export function confirmOrders(
  payload: ConfirmOrdersRequest,
): Promise<ConfirmOrdersResponse> {
  return request<ConfirmOrdersResponse>("/orders/confirm", {
    method: "POST",
    body: payload,
  });
}
