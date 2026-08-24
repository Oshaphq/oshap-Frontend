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
 * How many notifications match one filter, without fetching them.
 *
 * The agreed contract put `unread_total` and `unresolved_total` on every list
 * response. Neither shipped, and reading the missing field did not fail loudly
 * — it produced `undefined`, which left the bell permanently unlit and the
 * "Mark all read" button permanently disabled.
 *
 * `total` counts the filtered set rather than the page, so asking for one row
 * makes `total` the answer. It also keeps the property that mattered: paging a
 * list never disturbs a count.
 */
export function useNotificationCount(filter: "unread" | "unresolved") {
  return useQuery({
    queryKey: queryKeys.admin.notificationCount(filter),
    queryFn: () =>
      adminNotifications({
        page: 1,
        per_page: 1,
        ...(filter === "unread"
          ? { unread_only: true }
          : { unresolved_only: true }),
      }),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    select: (data) => data.total,
  });
}

/**
 * The bell's number.
 *
 * Counts **unresolved**, not unread — it should mean "work outstanding", not
 * "things you haven't looked at". Reading a call you cannot act on must not
 * clear the badge for the person who can.
 */
export function useNotificationBadge() {
  const query = useNotificationCount("unresolved");
  return { ...query, data: query.data === undefined ? undefined : { unresolved: query.data } };
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
