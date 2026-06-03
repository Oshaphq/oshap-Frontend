import type {
  AdminCloseRequest,
  AdminCloseResponse,
  AdminHistoryQuery,
  AdminHistoryResponse,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminMeResponse,
  AdminTablesResponse,
  AdminUpdateSettingsRequest,
  AdminVerifyRequest,
  AdminVerifyResponse,
  CreateMenuItemRequest,
  CreateStaffRequest,
  KitchenUpdateRequest,
  MenuItem,
  Order,
  OrderWithItems,
  Restaurant,
  StaffMember,
  UpdateMenuItemRequest,
  UpdateStaffRequest,
  UploadResponse,
} from "../types/index";
import { request } from "./client";

// ---------- Identity ----------

export function adminLoginEmail(payload: AdminLoginRequest): Promise<AdminLoginResponse> {
  return request<AdminLoginResponse>("/admin/login", {
    method: "POST",
    body: payload,
  });
}

export function adminGetMe(): Promise<AdminMeResponse> {
  return request<AdminMeResponse>("/admin/me", { admin: true });
}

// ---------- Staff Management ----------

export function adminGetStaff(): Promise<StaffMember[]> {
  return request<StaffMember[]>("/admin/staff", { admin: true });
}

export function adminCreateStaff(payload: CreateStaffRequest): Promise<StaffMember> {
  return request<StaffMember>("/admin/staff", {
    method: "POST",
    body: payload,
    admin: true,
  });
}

export function adminUpdateStaff(id: string, payload: UpdateStaffRequest): Promise<StaffMember> {
  return request<StaffMember>(`/admin/staff/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
    admin: true,
  });
}

export function adminDeleteStaff(id: string): Promise<{ success: true }> {
  return request<{ success: true }>(`/admin/staff/${encodeURIComponent(id)}`, {
    method: "DELETE",
    admin: true,
  });
}

// ---------- Settings ----------

export function adminGetSettings(): Promise<Restaurant> {
  return request<Restaurant>("/admin/settings", { admin: true });
}

export function adminUpdateSettings(
  payload: AdminUpdateSettingsRequest,
): Promise<Restaurant> {
  return request<Restaurant>("/admin/settings", {
    method: "PATCH",
    body: payload,
    admin: true,
  });
}

export function adminUploadSettingsImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return request<UploadResponse>("/admin/settings/upload", {
    method: "POST",
    formData,
    admin: true,
  });
}

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
