import type {
  RegisterDeviceRequest,
  RegisterDeviceResponse,
} from "../types/index";
import { request } from "./client";

/**
 * Register an FCM device token with the backend so the merchant device can
 * receive push notifications (new orders, payment claims, etc.).
 * Used by the admin app only — see Phase 6 wiring.
 */
export function registerDevice(
  payload: RegisterDeviceRequest,
): Promise<RegisterDeviceResponse> {
  return request<RegisterDeviceResponse>("/devices/register", {
    method: "POST",
    body: payload,
    admin: true,
  });
}
