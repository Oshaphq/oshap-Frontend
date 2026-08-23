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
 * Deliberately not read off the list: the list pages, and a badge that changed
 * when someone turned a page would stop meaning "work outstanding". One row is
 * fetched purely so the totals come back — they count the caller's whole scope,
 * not the page.
 */
export function useNotificationBadge() {
  return useQuery({
    queryKey: queryKeys.admin.notificationBadge(),
    queryFn: () => adminNotifications({ page: 1, per_page: 1 }),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    select: (data) => ({
      unresolved: data.unresolved_total,
      unread: data.unread_total,
    }),
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
