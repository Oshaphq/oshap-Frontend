import { request } from "./client";
import type {
  PlatformCreateRestaurantRequest,
  PlatformRestaurant,
  PlatformRestaurantsResponse,
  PlatformSystemHealth,
  PlatformUpdateRestaurantRequest,
} from "../types";

/**
 * Internal operator portal — tenant administration.
 *
 * Every call carries `x-platform-token`, which the operator types at the gate.
 * The token is never compiled into the bundle: a `VITE_`-prefixed variable is
 * inlined as a literal at build time, so a publicly hosted platform app built
 * with one would publish the secret that administers every tenant.
 */

export function getHealth(): Promise<PlatformSystemHealth> {
  return request<PlatformSystemHealth>("/platform/health", { platform: true });
}

export function listRestaurants(): Promise<PlatformRestaurantsResponse> {
  return request<PlatformRestaurantsResponse>("/platform/restaurants", {
    platform: true,
  });
}

export function getRestaurant(id: string): Promise<PlatformRestaurant> {
  return request<PlatformRestaurant>(
    `/platform/restaurants/${encodeURIComponent(id)}`,
    { platform: true },
  );
}

export function createRestaurant(
  payload: PlatformCreateRestaurantRequest,
): Promise<PlatformRestaurant> {
  return request<PlatformRestaurant>("/platform/restaurants", {
    method: "POST",
    body: payload,
    platform: true,
  });
}

export function updateRestaurant(
  id: string,
  payload: PlatformUpdateRestaurantRequest,
): Promise<PlatformRestaurant> {
  return request<PlatformRestaurant>(
    `/platform/restaurants/${encodeURIComponent(id)}`,
    { method: "PATCH", body: payload, platform: true },
  );
}
