import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import { getMenu } from "../api/menu";

/**
 * The options behind `useMenu`, exported so the guard below can be asserted.
 *
 * **Waits for `restaurantId`.** Without that, this fired immediately with
 * `undefined`, and the API answers an unscoped `/menu` with *every* tenant's
 * items — 109 dishes across 25 restaurants, measured against production. So
 * each scan fetched a cross-tenant list, rendered it, threw it away and
 * fetched the right one: a wasted round trip on an API that takes 1.5s to
 * answer, and a window where a guest could see another restaurant's food at
 * another restaurant's prices.
 *
 * The endpoint should refuse an unscoped read rather than guess. That has gone
 * to the backend; this stops us asking.
 *
 * Polls at a minute rather than ten seconds. A menu changes when staff edit
 * it, which is rare. What genuinely moves is availability, and a minute is
 * soon enough to stop someone ordering a dish that just sold out — where ten
 * seconds cost six requests a minute for every guest sitting with the app
 * open.
 */
export function menuQueryOptions(
  restaurantId?: string,
  pollMs: number | false = 60000,
) {
  return {
    queryKey: queryKeys.menu.list(restaurantId),
    queryFn: () => getMenu(restaurantId),
    enabled: Boolean(restaurantId),
    refetchInterval: pollMs,
  };
}

export function useMenu(restaurantId?: string, pollMs: number | false = 60000) {
  return useQuery(menuQueryOptions(restaurantId, pollMs));
}
