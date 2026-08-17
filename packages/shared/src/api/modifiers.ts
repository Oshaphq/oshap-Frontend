import { request } from "./client";
import type {
  CreateModifierGroupRequest,
  CreateModifierOptionRequest,
  ModifierGroup,
  ModifierOption,
  SetMenuItemModifierGroupsRequest,
  UpdateModifierGroupRequest,
  UpdateModifierOptionRequest,
} from "../types";

/**
 * Modifier groups are restaurant-owned and reusable, so they live at their own
 * collection rather than under a menu item. Attaching them to a dish is a
 * separate call (`setMenuItemGroups`) — the same "Protein" group is shared by
 * every rice dish, and editing it once fixes all of them.
 */

export function listGroups(): Promise<ModifierGroup[]> {
  return request<ModifierGroup[]>("/admin/modifier-groups", { admin: true });
}

export function createGroup(
  payload: CreateModifierGroupRequest,
): Promise<ModifierGroup> {
  return request<ModifierGroup>("/admin/modifier-groups", {
    method: "POST",
    body: payload,
    admin: true,
  });
}

export function updateGroup(
  groupId: string,
  payload: UpdateModifierGroupRequest,
): Promise<ModifierGroup> {
  return request<ModifierGroup>(
    `/admin/modifier-groups/${encodeURIComponent(groupId)}`,
    { method: "PATCH", body: payload, admin: true },
  );
}

export function deleteGroup(groupId: string): Promise<void> {
  return request<void>(
    `/admin/modifier-groups/${encodeURIComponent(groupId)}`,
    { method: "DELETE", admin: true },
  );
}

export function createOption(
  groupId: string,
  payload: CreateModifierOptionRequest,
): Promise<ModifierOption> {
  return request<ModifierOption>(
    `/admin/modifier-groups/${encodeURIComponent(groupId)}/options`,
    { method: "POST", body: payload, admin: true },
  );
}

export function updateOption(
  optionId: string,
  payload: UpdateModifierOptionRequest,
): Promise<ModifierOption> {
  return request<ModifierOption>(
    `/admin/modifier-options/${encodeURIComponent(optionId)}`,
    { method: "PATCH", body: payload, admin: true },
  );
}

export function deleteOption(optionId: string): Promise<void> {
  return request<void>(
    `/admin/modifier-options/${encodeURIComponent(optionId)}`,
    { method: "DELETE", admin: true },
  );
}

/**
 * Replaces the item's whole attachment set — the server takes the full list,
 * not a delta, so callers send every group id they want to keep.
 */
export function setMenuItemGroups(
  itemId: string,
  payload: SetMenuItemModifierGroupsRequest,
): Promise<MenuItemGroupsResponse> {
  return request<MenuItemGroupsResponse>(
    `/admin/menu/${encodeURIComponent(itemId)}/modifier-groups`,
    { method: "PUT", body: payload, admin: true },
  );
}

/** The item's groups after the write, so the cache can be updated in place. */
export interface MenuItemGroupsResponse {
  modifier_groups: ModifierGroup[];
}
