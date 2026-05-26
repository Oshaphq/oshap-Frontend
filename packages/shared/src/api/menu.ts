import type { MenuItem } from "../types/index";
import { request } from "./client";

export function getMenu(restaurantId?: string): Promise<MenuItem[]> {
  return request<MenuItem[]>("/menu", {
    query: { restaurant_id: restaurantId },
  });
}
