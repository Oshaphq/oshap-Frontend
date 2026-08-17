import { request } from "./client";
import type {
  AdjustStockRequest,
  CreateIngredientRequest,
  Ingredient,
  RecipeResponse,
  SetRecipeRequest,
  StockMovement,
  StockMovementQuery,
  StockMovementsResponse,
  UpdateIngredientRequest,
} from "../types";

/**
 * Ingredient-level stock: what dishes are made of, as opposed to the
 * plate-level `stock_count` on a menu item.
 *
 * Stock is never assigned a value directly — `adjust` moves it by a signed
 * delta with a reason, so the movement ledger can always explain how a level
 * was reached. A stock take is therefore also a delta, not an overwrite.
 */

export function listIngredients(): Promise<Ingredient[]> {
  return request<Ingredient[]>("/admin/ingredients", { admin: true });
}

export function createIngredient(
  payload: CreateIngredientRequest,
): Promise<Ingredient> {
  return request<Ingredient>("/admin/ingredients", {
    method: "POST",
    body: payload,
    admin: true,
  });
}

export function updateIngredient(
  id: string,
  payload: UpdateIngredientRequest,
): Promise<Ingredient> {
  return request<Ingredient>(`/admin/ingredients/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
    admin: true,
  });
}

export function adjustStock(
  id: string,
  payload: AdjustStockRequest,
): Promise<StockMovement> {
  return request<StockMovement>(
    `/admin/ingredients/${encodeURIComponent(id)}/adjust`,
    { method: "POST", body: payload, admin: true },
  );
}

export function listMovements(
  query: StockMovementQuery = {},
): Promise<StockMovementsResponse> {
  return request<StockMovementsResponse>("/admin/ingredients/movements", {
    admin: true,
    query: {
      reason: query.reason,
      page: query.page ?? 1,
      per_page: query.per_page ?? 25,
    },
  });
}

export function getRecipe(menuItemId: string): Promise<RecipeResponse> {
  return request<RecipeResponse>(
    `/admin/menu/${encodeURIComponent(menuItemId)}/recipe`,
    { admin: true },
  );
}

/** Replaces the dish's whole recipe — send every line to keep. */
export function setRecipe(
  menuItemId: string,
  payload: SetRecipeRequest,
): Promise<RecipeResponse> {
  return request<RecipeResponse>(
    `/admin/menu/${encodeURIComponent(menuItemId)}/recipe`,
    { method: "PUT", body: payload, admin: true },
  );
}
