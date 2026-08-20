import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminCreateBranch,
  adminGetBranches,
  adminUpdateBranch,
} from "../api/branches";
import { queryKeys } from "../api/keys";
import type { BranchCreateRequest, BranchUpdateRequest } from "../types/index";

export function useAdminBranches() {
  return useQuery({
    queryKey: queryKeys.admin.branches(),
    queryFn: adminGetBranches,
  });
}

/**
 * Creating or changing a branch moves more than the branch list.
 *
 * Every admin query is scoped to the active branch by a header rather than by
 * its query key, so the cached answers for "the menu", "the tables", "today's
 * orders" all belong to whichever venue was selected when they were fetched.
 * Invalidating the whole admin tree is blunt and correct: the alternative is a
 * manager reading one branch's takings under another's name.
 */
export function useAdminCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BranchCreateRequest) => adminCreateBranch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}

export function useAdminUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BranchUpdateRequest }) =>
      adminUpdateBranch(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}
