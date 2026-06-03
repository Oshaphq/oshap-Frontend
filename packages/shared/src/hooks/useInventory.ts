import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../api/client";
import { queryKeys } from "../api/keys";
import type {
  AdminInventoryAlertsResponse,
  InventoryUpdateRequest,
  InventoryUpdateResponse,
  GroupAnalyticsResponse,
  RestaurantGroup,
} from "../types/index";

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export function useAdminInventoryAlerts() {
  return useQuery({
    queryKey: queryKeys.admin.inventoryAlerts(),
    queryFn: () =>
      request<AdminInventoryAlertsResponse>("/admin/inventory/alerts", { admin: true }),
    refetchInterval: 60_000,
  });
}

export function useAdminUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InventoryUpdateRequest }) =>
      request<InventoryUpdateResponse>(`/admin/inventory/${id}`, {
        method: "PATCH",
        body: payload,
        admin: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.menu() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventoryAlerts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.menu.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Multi-Branch Group
// ---------------------------------------------------------------------------

export function useAdminGroup() {
  return useQuery({
    queryKey: queryKeys.admin.group(),
    queryFn: () => request<RestaurantGroup>("/admin/group", { admin: true }),
  });
}

export function useAdminGroupAnalytics() {
  return useQuery({
    queryKey: queryKeys.admin.groupAnalytics(),
    queryFn: () =>
      request<GroupAnalyticsResponse>("/admin/group/analytics", { admin: true }),
  });
}
