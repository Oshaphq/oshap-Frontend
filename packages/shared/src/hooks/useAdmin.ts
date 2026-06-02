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
} from "../api/admin";
import type {
  AdminHistoryQuery,
  AdminUpdateSettingsRequest,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
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

export function useAdminKitchen(pollMs = 5000) {
  return useQuery({
    queryKey: queryKeys.admin.kitchen(),
    queryFn: adminGetKitchen,
    refetchInterval: pollMs,
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

// ---------- Tables / verify / close ----------

export function useAdminTables(pollMs = 5000) {
  return useQuery({
    queryKey: queryKeys.admin.tables(),
    queryFn: adminGetTables,
    refetchInterval: pollMs,
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
