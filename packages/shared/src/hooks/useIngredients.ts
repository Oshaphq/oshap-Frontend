import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import {
  adjustStock,
  createIngredient,
  getRecipe,
  listIngredients,
  listMovements,
  setRecipe,
  updateIngredient,
} from "../api/ingredients";
import type {
  AdjustStockRequest,
  CreateIngredientRequest,
  SetRecipeRequest,
  StockMovementQuery,
  UpdateIngredientRequest,
} from "../types";

export function useAdminIngredients() {
  return useQuery({
    queryKey: queryKeys.admin.ingredients(),
    queryFn: listIngredients,
  });
}

export function useAdminStockMovements(query: StockMovementQuery = {}) {
  return useQuery({
    queryKey: queryKeys.admin.stockMovements(
      query.page ?? 1,
      query.per_page ?? 25,
      query.reason,
    ),
    queryFn: () => listMovements(query),
  });
}

export function useAdminRecipe(menuItemId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.recipe(menuItemId),
    queryFn: () => getRecipe(menuItemId),
    enabled: enabled && Boolean(menuItemId),
  });
}

function useIngredientMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.ingredients() });
      // A movement changes a level, so the ledger and the low-stock banner
      // both go stale at the same moment.
      queryClient.invalidateQueries({
        queryKey: ["admin", "stock-movements"],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventoryAlerts(),
      });
    },
  });
}

export function useAdminCreateIngredient() {
  return useIngredientMutation((payload: CreateIngredientRequest) =>
    createIngredient(payload),
  );
}

export function useAdminUpdateIngredient() {
  return useIngredientMutation(
    ({ id, payload }: { id: string; payload: UpdateIngredientRequest }) =>
      updateIngredient(id, payload),
  );
}

export function useAdminAdjustStock() {
  return useIngredientMutation(
    ({ id, payload }: { id: string; payload: AdjustStockRequest }) =>
      adjustStock(id, payload),
  );
}

export function useAdminSetRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      menuItemId,
      payload,
    }: {
      menuItemId: string;
      payload: SetRecipeRequest;
    }) => setRecipe(menuItemId, payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.recipe(vars.menuItemId),
      });
    },
  });
}
