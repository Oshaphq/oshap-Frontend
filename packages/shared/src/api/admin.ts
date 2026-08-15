import type {
  AdminAnalyticsResponse,
  AdminCloseRequest,
  AdminCloseResponse,
  AdminCreateTableRequest,
  AdminCreateTableResponse,
  AdminDeleteTableResponse,
  AdminHistoryQuery,
  AdminHistoryResponse,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminMeResponse,
  AdminTablesResponse,
  AdminUpdateSettingsRequest,
  AdminVerifyRequest,
  AdminVerifyResponse,
  AdminRejectRequest,
  AdminRejectResponse,
  BankAccount,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
  CreateMenuItemRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  CreateStaffRequest,
  KitchenUpdateRequest,
  MenuImportResponse,
  MenuItem,
  RecordCashRequest,
  RecordCashResponse,
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

// Identity lives under /auth, not /admin: it isn't admin-scoped, and the
// platform app will eventually authenticate through the same endpoints.
export function adminLoginEmail(payload: AdminLoginRequest): Promise<AdminLoginResponse> {
  return request<AdminLoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

/**
 * `skipAuthRefresh` so a failed refresh can't trigger another refresh — the
 * client's retry path calls this endpoint directly for the same reason.
 */
export function adminRefreshToken(
  payload: RefreshTokenRequest,
): Promise<RefreshTokenResponse> {
  return request<RefreshTokenResponse>("/auth/refresh", {
    method: "POST",
    body: payload,
    skipAuthRefresh: true,
  });
}

export function adminGetMe(): Promise<AdminMeResponse> {
  return request<AdminMeResponse>("/auth/me", { admin: true });
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

// ---------- Bulk menu import / export ----------

/**
 * Returns raw CSV, not JSON. `request()` falls back to `response.text()` for
 * non-JSON content types, so the string arrives intact.
 */
export function adminExportMenu(): Promise<string> {
  return request<string>("/admin/menu/export", { admin: true });
}

/**
 * `dryRun` validates and reports without writing — the whole file is checked,
 * so a failure at row 60 doesn't leave a half-imported menu.
 */
export function adminImportMenu(
  file: File,
  dryRun = false,
): Promise<MenuImportResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return request<MenuImportResponse>("/admin/menu/import", {
    method: "POST",
    formData,
    admin: true,
    query: dryRun ? { dry_run: true } : undefined,
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

// ---------- Analytics ----------

export function adminAnalytics(query: { start_date: string; end_date: string }): Promise<AdminAnalyticsResponse> {
  return request<AdminAnalyticsResponse>("/admin/analytics", {
    admin: true,
    query,
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

// ---------- Bank accounts ----------

export function adminGetBankAccounts(): Promise<BankAccount[]> {
  return request<BankAccount[]>("/admin/settings/bank-accounts", { admin: true });
}

export function adminCreateBankAccount(
  payload: CreateBankAccountRequest,
): Promise<BankAccount> {
  return request<BankAccount>("/admin/settings/bank-accounts", {
    method: "POST",
    body: payload,
    admin: true,
  });
}

export function adminUpdateBankAccount(
  id: string,
  payload: UpdateBankAccountRequest,
): Promise<BankAccount> {
  return request<BankAccount>(
    `/admin/settings/bank-accounts/${encodeURIComponent(id)}`,
    { method: "PATCH", body: payload, admin: true },
  );
}

export function adminDeleteBankAccount(id: string): Promise<{ success: true }> {
  return request<{ success: true }>(
    `/admin/settings/bank-accounts/${encodeURIComponent(id)}`,
    { method: "DELETE", admin: true },
  );
}

/** Rejects a claimed payment — orders return to unpaid and the account is penalised. */
export function adminRejectPayment(
  payload: AdminRejectRequest,
): Promise<AdminRejectResponse> {
  return request<AdminRejectResponse>("/admin/reject", {
    method: "POST",
    body: payload,
    admin: true,
  });
}

export function adminRecordCash(
  payload: RecordCashRequest,
): Promise<RecordCashResponse> {
  return request<RecordCashResponse>("/admin/orders/cash", {
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

export function adminCreateTable(
  payload: AdminCreateTableRequest,
): Promise<AdminCreateTableResponse> {
  return request<AdminCreateTableResponse>("/admin/tables", {
    method: "POST",
    body: payload,
    admin: true,
  });
}

export function adminDeleteTable(
  tableId: string,
): Promise<AdminDeleteTableResponse> {
  return request<AdminDeleteTableResponse>(
    `/admin/tables/${encodeURIComponent(tableId)}`,
    { method: "DELETE", admin: true },
  );
}
