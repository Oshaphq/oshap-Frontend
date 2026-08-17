import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import {
  createRestaurant,
  getHealth,
  getRestaurant,
  listRestaurants,
  updateRestaurant,
} from "../api/platform";
import type {
  PlatformCreateRestaurantRequest,
  PlatformUpdateRestaurantRequest,
} from "../types/index";

export function usePlatformRestaurants() {
  return useQuery({
    queryKey: queryKeys.platform.restaurants(),
    queryFn: listRestaurants,
  });
}

export function usePlatformRestaurant(id: string) {
  return useQuery({
    queryKey: queryKeys.platform.restaurant(id),
    queryFn: () => getRestaurant(id),
    enabled: !!id,
  });
}

export function usePlatformHealth() {
  return useQuery({
    queryKey: queryKeys.platform.health(),
    queryFn: getHealth,
    refetchInterval: 30_000,
  });
}

export function usePlatformCreateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PlatformCreateRestaurantRequest) =>
      createRestaurant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.restaurants(),
      });
    },
  });
}

export function usePlatformUpdateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: PlatformUpdateRestaurantRequest;
    }) => updateRestaurant(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.restaurants(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.restaurant(id),
      });
    },
  });
}
