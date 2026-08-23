import { request } from "./client";
import type {
  Notification,
  NotificationQuery,
  NotificationsMarkReadRequest,
  NotificationsMarkReadResponse,
  NotificationsResponse,
} from "../types";

/**
 * The admin notification centre, per `docs/notifications.md`.
 *
 * Why this exists at all: realtime alerts were a five-second toast held in
 * component state. A waiter call that fired while nobody was looking at the
 * screen left no trace, so "did anyone go to table 6?" had no answer. The
 * toast is right for the moment it fires; it was wrong as the only copy.
 *
 * Branch scoping is handled by `client.ts`, which attaches `x-active-branch`
 * — a notification belongs to the venue it happened at, and "table 4 needs
 * attention" means nothing across two buildings that both have a table 4.
 */

export function adminNotifications(
  query: NotificationQuery = {},
): Promise<NotificationsResponse> {
  return request<NotificationsResponse>("/admin/notifications", {
    admin: true,
    query: {
      page: query.page,
      per_page: query.per_page,
      unread_only: query.unread_only,
      unresolved_only: query.unresolved_only,
      type: query.type,
    },
  });
}

/** Idempotent — marking a read row read again succeeds. */
export function adminMarkNotificationsRead(
  body: NotificationsMarkReadRequest,
): Promise<NotificationsMarkReadResponse> {
  return request<NotificationsMarkReadResponse>("/admin/notifications/read", {
    method: "POST",
    admin: true,
    body,
  });
}

/**
 * "I'll go" — claims a call so a colleague can see it is handled.
 *
 * Only `waiter_called` and `pos_requested` can be claimed. The other four
 * resolve themselves when the thing they describe changes, and letting a person
 * close one by hand would put this list out of step with the board.
 *
 * Already claimed returns 200 with the existing record rather than an error:
 * two waiters tapping at once is the normal case, and the second one needs to
 * see who got there first.
 */
export function adminResolveNotification(id: string): Promise<Notification> {
  return request<Notification>(
    `/admin/notifications/${encodeURIComponent(id)}/resolve`,
    { method: "POST", admin: true },
  );
}
