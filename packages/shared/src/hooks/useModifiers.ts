import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import {
  createGroup,
  createOption,
  deleteGroup,
  deleteOption,
  listGroups,
  setMenuItemGroups,
  updateGroup,
  updateOption,
} from "../api/modifiers";
import type {
  CreateModifierGroupRequest,
  CreateModifierOptionRequest,
  SetMenuItemModifierGroupsRequest,
  UpdateModifierGroupRequest,
  UpdateModifierOptionRequest,
} from "../types";

export function useAdminModifierGroups() {
  return useQuery({
    queryKey: queryKeys.admin.modifierGroups(),
    queryFn: listGroups,
  });
}

/**
 * Every write invalidates the menu as well as the group list: groups are
 * attached to dishes, so renaming an option or changing its price changes what
 * `GET /menu` returns for every item carrying that group.
 */
function useModifierMutation<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.modifierGroups(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.menu() });
      queryClient.invalidateQueries({ queryKey: queryKeys.menu.all });
    },
  });
}

export function useAdminCreateModifierGroup() {
  return useModifierMutation((payload: CreateModifierGroupRequest) =>
    createGroup(payload),
  );
}

export function useAdminUpdateModifierGroup() {
  return useModifierMutation(
    ({ id, payload }: { id: string; payload: UpdateModifierGroupRequest }) =>
      updateGroup(id, payload),
  );
}

export function useAdminDeleteModifierGroup() {
  return useModifierMutation((id: string) => deleteGroup(id));
}

export function useAdminCreateModifierOption() {
  return useModifierMutation(
    ({
      groupId,
      payload,
    }: {
      groupId: string;
      payload: CreateModifierOptionRequest;
    }) => createOption(groupId, payload),
  );
}

export function useAdminUpdateModifierOption() {
  return useModifierMutation(
    ({ id, payload }: { id: string; payload: UpdateModifierOptionRequest }) =>
      updateOption(id, payload),
  );
}

export function useAdminDeleteModifierOption() {
  return useModifierMutation((id: string) => deleteOption(id));
}

export function useAdminSetMenuItemGroups() {
  return useModifierMutation(
    ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: SetMenuItemModifierGroupsRequest;
    }) => setMenuItemGroups(itemId, payload),
  );
}
