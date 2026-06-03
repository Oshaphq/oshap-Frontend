import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../api/client";
import { queryKeys } from "../api/keys";
import type {
  PlatformRestaurant,
  PlatformRestaurantsResponse,
  PlatformSystemHealth,
  PlatformCreateRestaurantRequest,
  PlatformUpdateRestaurantRequest,
} from "../types/index";

export function usePlatformRestaurants() {
  return useQuery({
    queryKey: queryKeys.platform.restaurants(),
    queryFn: () =>
      request<PlatformRestaurantsResponse>("/platform/restaurants", { platform: true }),
  });
}

export function usePlatformRestaurant(id: string) {
  return useQuery({
    queryKey: queryKeys.platform.restaurant(id),
    queryFn: () =>
      request<PlatformRestaurant>(`/platform/restaurants/${encodeURIComponent(id)}`, {
        platform: true,
      }),
    enabled: !!id,
  });
}

export function usePlatformHealth() {
  return useQuery({
    queryKey: queryKeys.platform.health(),
    queryFn: () => request<PlatformSystemHealth>("/platform/health", { platform: true }),
    refetchInterval: 30_000,
  });
}

export function usePlatformCreateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PlatformCreateRestaurantRequest) =>
      request<PlatformRestaurant>("/platform/restaurants", {
        method: "POST",
        body: payload,
        platform: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.restaurants() });
    },
  });
}

export function usePlatformUpdateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PlatformUpdateRestaurantRequest }) =>
      request<PlatformRestaurant>(`/platform/restaurants/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: payload,
        platform: true,
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.restaurants() });
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.restaurant(id) });
    },
  });
}
