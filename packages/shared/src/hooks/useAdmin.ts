import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import { REALTIME_POLL_MS } from "./useSSE";
import {
  adminCloseTable,
  adminCreateMenuItem,
  adminDeleteMenuItem,
  adminAnalytics,
  adminGetHistory,
  adminGetKitchen,
  adminGetSettings,
  adminGetTables,
  adminListMenu,
  adminToggleMenuItem,
  adminUpdateKitchenStatus,
  adminUpdateMenuItem,
  adminUpdateSettings,
  adminUploadImage,
  adminExportMenu,
  adminImportMenu,
  adminUploadSettingsImage,
  adminVerifyPayment,
  adminGetStaff,
  adminCreateStaff,
  adminUpdateStaff,
  adminDeleteStaff,
  adminCreateTable,
  adminDeleteTable,
  adminGetBankAccounts,
  adminCreateBankAccount,
  adminUpdateBankAccount,
  adminDeleteBankAccount,
  adminRejectPayment,
  adminRecordCash,
  adminZReport,
  adminDiscountOrder,
  adminTipOrder,
  adminRefundOrder,
  adminUpdateOrderItem,
  adminVoidOrderItem,
  adminCompOrderItem,
  adminOrderReceipt,
  adminAuditLogs,
} from "../api/admin";
import type {
  AdminHistoryQuery,
  AdminUpdateSettingsRequest,
  AdminCreateTableRequest,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  CreateStaffRequest,
  UpdateStaffRequest,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
  DiscountRequest,
  TipRequest,
  RefundRequest,
  UpdateOrderItemRequest,
  AuditLogQuery,
} from "../types/index";

// ---------- Settings ----------

export function useAdminSettings() {
  return useQuery({
    queryKey: queryKeys.admin.settings(),
    queryFn: adminGetSettings,
  });
}

export function useAdminUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUpdateSettingsRequest) =>
      adminUpdateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings() });
    },
  });
}

export function useAdminUploadSettingsImage() {
  return useMutation({
    mutationFn: (file: File) => adminUploadSettingsImage(file),
  });
}

// ---------- Bank accounts ----------

/**
 * Mutations invalidate the customer-facing table caches too. Changing which
 * account is default changes what every guest at every table is told to pay
 * into, so leaving `tables` stale would show them the old account.
 */
function useBankAccountMutation<TArgs>(mutationFn: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.bankAccounts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
    },
  });
}

export function useAdminBankAccounts() {
  return useQuery({
    queryKey: queryKeys.admin.bankAccounts(),
    queryFn: adminGetBankAccounts,
  });
}

export function useAdminCreateBankAccount() {
  return useBankAccountMutation((payload: CreateBankAccountRequest) =>
    adminCreateBankAccount(payload),
  );
}

export function useAdminUpdateBankAccount() {
  return useBankAccountMutation(
    ({ id, payload }: { id: string; payload: UpdateBankAccountRequest }) =>
      adminUpdateBankAccount(id, payload),
  );
}

export function useAdminDeleteBankAccount() {
  return useBankAccountMutation((id: string) => adminDeleteBankAccount(id));
}

// ---------- Staff Management ----------

export function useAdminStaff() {
  return useQuery({
    queryKey: queryKeys.admin.staff(),
    queryFn: adminGetStaff,
  });
}

export function useAdminCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStaffRequest) => adminCreateStaff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.staff() });
    },
  });
}

export function useAdminUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStaffRequest }) =>
      adminUpdateStaff(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.staff() });
    },
  });
}

export function useAdminDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminDeleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.staff() });
    },
  });
}

// ---------- Menu management ----------

export function useAdminMenu() {
  return useQuery({
    queryKey: queryKeys.admin.menu(),
    queryFn: adminListMenu,
  });
}

export function useAdminCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMenuItemRequest) =>
      adminCreateMenuItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.menu() });
      queryClient.invalidateQueries({ queryKey: queryKeys.menu.all });
    },
  });
}

export function useAdminUpdateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateMenuItemRequest;
    }) => adminUpdateMenuItem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.menu() });
      queryClient.invalidateQueries({ queryKey: queryKeys.menu.all });
    },
  });
}

export function useAdminToggleMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      adminToggleMenuItem(id, available),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.menu() });
      queryClient.invalidateQueries({ queryKey: queryKeys.menu.all });
    },
  });
}

export function useAdminDeleteMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminDeleteMenuItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.menu() });
      queryClient.invalidateQueries({ queryKey: queryKeys.menu.all });
    },
  });
}

export function useAdminExportMenu() {
  return useMutation({ mutationFn: adminExportMenu });
}

export function useAdminImportMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun?: boolean }) =>
      adminImportMenu(file, dryRun),
    onSuccess: (_data, variables) => {
      // A dry run writes nothing, so invalidating would just refetch an
      // unchanged menu and hide the fact that nothing happened yet.
      if (variables.dryRun) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.menu() });
      queryClient.invalidateQueries({ queryKey: queryKeys.menu.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventoryAlerts() });
    },
  });
}

export function useAdminUploadImage() {
  return useMutation({
    mutationFn: (file: File) => adminUploadImage(file),
  });
}

// ---------- Kitchen ----------

export function useAdminKitchen() {
  return useQuery({
    queryKey: queryKeys.admin.kitchen(),
    queryFn: adminGetKitchen,
    // The board a kitchen cooks from. If the stream dies, tickets must still
    // arrive — late is survivable, never is not.
    refetchInterval: REALTIME_POLL_MS,
    refetchIntervalInBackground: true,
  });
}

export function useAdminUpdateKitchenStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminUpdateKitchenStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.kitchen() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
    },
  });
}

// ---------- History ----------

export function useAdminHistory(query: AdminHistoryQuery = {}) {
  const page = query.page ?? 1;
  const perPage = query.per_page ?? 20;
  return useQuery({
    queryKey: queryKeys.admin.history(page, perPage, query.table, query.date),
    queryFn: () => adminGetHistory({ ...query, page, per_page: perPage }),
  });
}

// ---------- Analytics ----------

export function useAdminAnalytics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.admin.analytics(startDate, endDate),
    queryFn: () => adminAnalytics({ start_date: startDate, end_date: endDate }),
  });
}

// ---------- Bill adjustments ----------

/**
 * Adjusting a bill changes what the guest owes, so the customer-facing caches
 * have to move with the admin ones — otherwise a diner watching their bill sees
 * the pre-discount figure until they happen to refetch.
 */
function useBillAdjustment<TArgs>(mutationFn: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.kitchen() });
    },
  });
}

export function useAdminDiscountOrder() {
  return useBillAdjustment(
    ({ orderId, payload }: { orderId: string; payload: DiscountRequest }) =>
      adminDiscountOrder(orderId, payload),
  );
}

export function useAdminTipOrder() {
  return useBillAdjustment(
    ({ orderId, payload }: { orderId: string; payload: TipRequest }) =>
      adminTipOrder(orderId, payload),
  );
}

export function useAdminRefundOrder() {
  return useBillAdjustment(
    ({ orderId, payload }: { orderId: string; payload: RefundRequest }) =>
      adminRefundOrder(orderId, payload),
  );
}

export function useAdminUpdateOrderItem() {
  return useBillAdjustment(
    ({
      orderId,
      itemId,
      payload,
    }: {
      orderId: string;
      itemId: string;
      payload: UpdateOrderItemRequest;
    }) => adminUpdateOrderItem(orderId, itemId, payload),
  );
}

export function useAdminVoidOrderItem() {
  return useBillAdjustment(
    ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      adminVoidOrderItem(orderId, itemId),
  );
}

export function useAdminCompOrderItem() {
  return useBillAdjustment(
    ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      adminCompOrderItem(orderId, itemId),
  );
}

// ---------- Paper trail ----------

export function useAdminReceipt(orderId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.receipt(orderId),
    queryFn: () => adminOrderReceipt(orderId),
    enabled: enabled && Boolean(orderId),
  });
}

export function useAdminAuditLogs(query: AuditLogQuery = {}) {
  const page = query.page ?? 1;
  const perPage = query.per_page ?? 25;
  return useQuery({
    queryKey: queryKeys.admin.auditLogs(page, perPage, query.action),
    queryFn: () => adminAuditLogs({ ...query, page, per_page: perPage }),
  });
}

// ---------- Z-report ----------

export function useAdminZReport(date: string) {
  return useQuery({
    queryKey: queryKeys.admin.zReport(date),
    queryFn: () => adminZReport(date),
    enabled: Boolean(date),
  });
}

// ---------- Tables / verify / close ----------

export function useAdminTables() {
  return useQuery({
    queryKey: queryKeys.admin.tables(),
    queryFn: adminGetTables,
    // Realtime is the fast path; this is the floor. Staff read this board to
    // decide whether to walk to a table, so a silently dead stream must not
    // leave it frozen — and acting on a stale row is how you get "verify" on a
    // bill that was already settled.
    refetchInterval: REALTIME_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useAdminVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminVerifyPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.kitchen() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
    // "No pending payments found" almost always means the board was stale and
    // this bill was already settled. Leaving the row on screen invites the
    // same failed click again, so correct the board on the way out.
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
    },
  });
}

export function useAdminRecordCash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminRecordCash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export function useAdminRejectPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminRejectPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.bankAccounts() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
    },
  });
}

export function useAdminCloseTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminCloseTable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
    },
  });
}

export function useAdminCreateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminCreateTableRequest) => adminCreateTable(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
    },
  });
}

export function useAdminDeleteTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tableId: string) => adminDeleteTable(tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
    },
  });
}
