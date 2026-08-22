import type {
  BranchCreateRequest,
  BranchUpdateRequest,
  RestaurantBranch,
} from "../types/index";
import { request } from "./client";

/**
 * The venues a restaurant group runs.
 *
 * Branches are what separates Pro from the plans below it, so this is a
 * commercial surface as much as an operational one. Everything here is scoped
 * by the caller's own restaurant — there is no cross-group read.
 */

export function adminGetBranches(): Promise<RestaurantBranch[]> {
  return request<RestaurantBranch[]>("/admin/branches", { admin: true });
}

export function adminCreateBranch(
  payload: BranchCreateRequest,
): Promise<RestaurantBranch> {
  return request<RestaurantBranch>("/admin/branches", {
    method: "POST",
    body: payload,
    admin: true,
  });
}

/**
 * PATCH, not PUT: a caller that only wants to rename a venue should not have
 * to resend its address and hours, and would silently blank them if it forgot.
 */
export function adminUpdateBranch(
  branchId: string,
  payload: BranchUpdateRequest,
): Promise<RestaurantBranch> {
  return request<RestaurantBranch>(
    `/admin/branches/${encodeURIComponent(branchId)}`,
    {
      method: "PATCH",
      body: payload,
      admin: true,
    },
  );
}
