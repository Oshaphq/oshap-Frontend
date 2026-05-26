import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import { getMenu } from "../api/menu";

export function useMenu(restaurantId?: string) {
  return useQuery({
    queryKey: queryKeys.menu.list(restaurantId),
    queryFn: () => getMenu(restaurantId),
  });
}
