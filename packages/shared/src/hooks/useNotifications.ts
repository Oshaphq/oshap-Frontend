import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../api/keys";
import {
  adminMarkNotificationsRead,
  adminNotifications,
  adminResolveNotification,
} from "../api/notifications";
import type { Notification, NotificationQuery } from "../types";

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
 * How far the badge looks before it gives up and says "lots".
 *
 * The badge caps its display at 9+, so counting past thirty tells nobody
 * anything — and it keeps this to one small page rather than the whole history.
 */
const BADGE_SCAN = 30;

/**
 * How many notifications match one filter.
 *
 * **Counts the rows rather than trusting `total`.** The badge sat at 9+ and
 * never moved, and the two candidate causes are indistinguishable from here:
 * either `total` is computed before the filter is applied, or notifications
 * that should resolve themselves never do. Counting rows we can see, on a field
 * we can read, is right under both — and self-corrects the moment the server
 * does.
 *
 * The filter still goes on the request, so the server narrows it where it can;
 * this only stops us believing the number that comes back.
 */
export function useNotificationCount(filter: "unread" | "unresolved") {
  return useQuery({
    queryKey: queryKeys.admin.notificationCount(filter),
    queryFn: () =>
      adminNotifications({
        page: 1,
        per_page: BADGE_SCAN,
        ...(filter === "unread"
          ? { unread_only: true }
          : { unresolved_only: true }),
      }),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    select: (data) => countMatching(data.notifications, filter),
  });
}

/**
 * `resolved_at` and `read_at` are facts; `is_unresolved` and `is_unread` are
 * the server's reading of them and both default to true. Where the two
 * disagree the timestamp wins, because a row with a resolution time on it has
 * plainly been resolved.
 *
 * Rows routed to somebody else's role never count. Being badged for work you
 * cannot do is how people learn to ignore a bell.
 */
export function countMatching(
  rows: Notification[],
  filter: "unread" | "unresolved",
): number {
  return rows.filter((n) => {
    if (n.for_my_role === false) return false;
    return filter === "unread" ? !n.read_at && n.is_unread : !n.resolved_at;
  }).length;
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
  return {
    ...query,
    data: query.data === undefined ? undefined : { unresolved: query.data },
  };
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

/**
 * Clears every notification that is still outstanding.
 *
 * Derived notifications close themselves when the order or payment moves — but
 * only from the moment that was wired up. Rows created before it sit at
 * `resolved_at: null` for good, because the transitions that would have closed
 * them are long past. At Jobiz that left the bell reading `9+` with nothing a
 * person could do about it.
 *
 * Resolving one at a time rather than in a batch, because the API has no bulk
 * route. Failures are counted rather than thrown: one row that refuses must not
 * strand the other twenty, and the caller reports what actually happened.
 */
export function useResolveAllNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      let cleared = 0;
      const failed: string[] = [];
      for (const id of ids) {
        try {
          await adminResolveNotification(id);
          cleared++;
        } catch {
          failed.push(id);
        }
      }
      return { cleared, failed };
    },
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
