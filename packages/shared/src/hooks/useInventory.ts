import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../api/client";
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
    queryKey: ["admin", "inventory", "alerts"],
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
      queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "alerts"] });
      queryClient.invalidateQueries({ queryKey: ["menu"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Multi-Branch Group
// ---------------------------------------------------------------------------

export function useAdminGroup() {
  return useQuery({
    queryKey: ["admin", "group"],
    queryFn: () => request<RestaurantGroup>("/admin/group", { admin: true }),
  });
}

export function useAdminGroupAnalytics() {
  return useQuery({
    queryKey: ["admin", "group", "analytics"],
    queryFn: () =>
      request<GroupAnalyticsResponse>("/admin/group/analytics", { admin: true }),
  });
}
