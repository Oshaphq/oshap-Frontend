import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../api/client";
import type {
  PlatformRestaurant,
  PlatformSystemHealth,
  PlatformCreateRestaurantRequest,
  PlatformUpdateRestaurantRequest,
} from "../types/index";

interface PlatformRestaurantsResponse {
  restaurants: PlatformRestaurant[];
}

export function usePlatformRestaurants() {
  return useQuery({
    queryKey: ["platform", "restaurants"],
    queryFn: () => request<PlatformRestaurantsResponse>("/platform/restaurants"),
  });
}

export function usePlatformRestaurant(id: string) {
  return useQuery({
    queryKey: ["platform", "restaurants", id],
    queryFn: () => request<PlatformRestaurant>(`/platform/restaurants/${encodeURIComponent(id)}`),
    enabled: !!id,
  });
}

export function usePlatformHealth() {
  return useQuery({
    queryKey: ["platform", "health"],
    queryFn: () => request<PlatformSystemHealth>("/platform/health"),
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
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "restaurants"] });
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
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["platform", "restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "restaurants", id] });
    },
  });
}
