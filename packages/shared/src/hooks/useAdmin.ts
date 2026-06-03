import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
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
  adminUploadSettingsImage,
  adminVerifyPayment,
  adminGetStaff,
  adminCreateStaff,
  adminUpdateStaff,
  adminDeleteStaff,
  adminCreateTable,
  adminDeleteTable,
} from "../api/admin";
import type {
  AdminHistoryQuery,
  AdminUpdateSettingsRequest,
  AdminCreateTableRequest,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  CreateStaffRequest,
  UpdateStaffRequest,
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

// ---------- Staff Management ----------

export function useAdminStaff() {
  return useQuery({
    queryKey: ["admin", "staff"],
    queryFn: adminGetStaff,
  });
}

export function useAdminCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStaffRequest) => adminCreateStaff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
  });
}

export function useAdminUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStaffRequest }) =>
      adminUpdateStaff(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
  });
}

export function useAdminDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminDeleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
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
    queryKey: ["admin", "analytics", startDate, endDate],
    queryFn: () => adminAnalytics({ start_date: startDate, end_date: endDate }),
  });
}

// ---------- Tables / verify / close ----------

export function useAdminTables() {
  return useQuery({
    queryKey: queryKeys.admin.tables(),
    queryFn: adminGetTables,
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
