import type {
  AdminCloseRequest,
  AdminCloseResponse,
  AdminHistoryQuery,
  AdminHistoryResponse,
  AdminTablesResponse,
  AdminVerifyRequest,
  AdminVerifyResponse,
  CreateMenuItemRequest,
  KitchenUpdateRequest,
  MenuItem,
  Order,
  OrderWithItems,
  UpdateMenuItemRequest,
  UploadResponse,
} from "../types/index";
import { request } from "./client";

// ---------- Menu management ----------

export function adminListMenu(): Promise<MenuItem[]> {
  return request<MenuItem[]>("/admin/menu", { admin: true });
}

export function adminCreateMenuItem(
  payload: CreateMenuItemRequest,
): Promise<MenuItem> {
  return request<MenuItem>("/admin/menu", {
    method: "POST",
    body: payload,
    admin: true,
  });
}

export function adminUpdateMenuItem(
  id: string,
  payload: UpdateMenuItemRequest,
): Promise<MenuItem> {
  return request<MenuItem>(`/admin/menu/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
    admin: true,
  });
}

export function adminToggleMenuItem(
  id: string,
  available: boolean,
): Promise<MenuItem> {
  return request<MenuItem>(`/admin/menu/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { available },
    admin: true,
  });
}

export function adminDeleteMenuItem(id: string): Promise<{ success: true }> {
  return request<{ success: true }>(`/admin/menu/${encodeURIComponent(id)}`, {
    method: "DELETE",
    admin: true,
  });
}

// ---------- Image upload ----------

export function adminUploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return request<UploadResponse>("/admin/menu/upload", {
    method: "POST",
    formData,
    admin: true,
  });
}

// ---------- Kitchen ----------

export function adminGetKitchen(): Promise<OrderWithItems[]> {
  return request<OrderWithItems[]>("/admin/kitchen", { admin: true });
}

export function adminUpdateKitchenStatus(
  payload: KitchenUpdateRequest,
): Promise<Order> {
  return request<Order>("/admin/kitchen", {
    method: "PATCH",
    body: payload,
    admin: true,
  });
}

// ---------- History ----------

export function adminGetHistory(
  query: AdminHistoryQuery = {},
): Promise<AdminHistoryResponse> {
  return request<AdminHistoryResponse>("/admin/history", {
    admin: true,
    query: {
      page: query.page,
      per_page: query.per_page,
      table: query.table,
      date: query.date,
    },
  });
}

// ---------- Tables / verify / close ----------

export function adminGetTables(): Promise<AdminTablesResponse> {
  return request<AdminTablesResponse>("/admin/tables", { admin: true });
}

export function adminVerifyPayment(
  payload: AdminVerifyRequest,
): Promise<AdminVerifyResponse> {
  return request<AdminVerifyResponse>("/admin/verify", {
    method: "POST",
    body: payload,
    admin: true,
  });
}

export function adminCloseTable(
  payload: AdminCloseRequest,
): Promise<AdminCloseResponse> {
  return request<AdminCloseResponse>("/admin/close", {
    method: "POST",
    body: payload,
    admin: true,
  });
}
