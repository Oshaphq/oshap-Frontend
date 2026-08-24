import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import {
  adminMarkNotificationsRead,
  adminNotifications,
  adminResolveNotification,
} from "../api/notifications";
import type { NotificationQuery } from "../types";

/**
 * Falls back to polling when the stream is quiet.
 *
 * Notifications arrive on `/events`, and when that works this poll is pure
 * belt-and-braces. It has not always worked — `waiter_called` regressed once
 * and staff heard nothing for a day — and a bell that silently stops being a
 * bell is worse than one that is a minute late. Thirty seconds is cheap against
 * a handful of admin tabs.
 */
const POLL_MS = 30_000;

export function useAdminNotifications(query: NotificationQuery = {}) {
  const page = query.page ?? 1;
  const perPage = query.per_page ?? 20;
  return useQuery({
    queryKey: queryKeys.admin.notifications({ ...query, page, per_page: perPage }),
    queryFn: () => adminNotifications({ ...query, page, per_page: perPage }),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * The badge's own query.
 *
 * The agreed contract returned `unresolved_total` on every list response. It
 * did not ship, so the badge read `undefined` and the bell never lit — a
 * notification centre whose only always-visible part was permanently blank.
 *
 * `total` is the count for the query asked, so asking for unresolved rows with
 * `per_page=1` makes `total` exactly the number wanted, without dragging back
 * twenty rows to count them. It also keeps the property that mattered: the
 * badge counts the whole scope, so paging the list never disturbs it.
 */
export function useNotificationBadge() {
  return useQuery({
    queryKey: queryKeys.admin.notificationBadge(),
    queryFn: () => adminNotifications({ page: 1, per_page: 1, unresolved_only: true }),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    select: (data) => ({ unresolved: data.total }),
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminMarkNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
  });
}

export function useResolveNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminResolveNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
  });
}
