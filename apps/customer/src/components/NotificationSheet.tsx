import { Sheet } from "@oshap/shared/ui";
import { useNotifications } from "../context/NotificationContext";

export default function NotificationSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { notifications, markAsRead, markAllAsRead, clearAll } =
    useNotifications();

  if (!isOpen) return null;

  return (
    <Sheet
      onClose={onClose}
      title="Notifications"
      bodyClassName="space-y-s"
      footer={
        notifications.length > 0 ? (
          <div className="flex justify-between gap-s">
            <button
              type="button"
              onClick={clearAll}
              className="px-md py-s rounded-full font-semibold text-title-large text-error hover:bg-error/10 transition-colors cursor-pointer"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={markAllAsRead}
              className="px-md py-s rounded-full font-semibold text-title-large text-primary-label hover:bg-primary/8 transition-colors cursor-pointer"
            >
              Mark all as read
            </button>
          </div>
        ) : undefined
      }
    >
      {notifications.length === 0 ? (
        <div className="py-xl text-center text-on-surface-variant">
          <i className="mgc_notification_off_line text-4xl mb-s" aria-hidden="true" />
          <p>No notifications yet</p>
        </div>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => {
              if (!n.read) markAsRead(n.id);
            }}
            className={`p-s rounded-2xl border transition-colors cursor-pointer ${
              n.read
                ? "bg-surface border-transparent opacity-75"
                : "bg-surface border-primary"
            }`}
          >
            <div className="flex items-start gap-s">
              <div
                className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${
                  n.read ? "bg-transparent" : "bg-primary"
                }`}
              />
              <div>
                <p
                  className={`text-body-medium ${n.read ? "text-on-surface-variant" : "text-on-surface font-medium"}`}
                >
                  {n.message}
                </p>
                <p className="text-body-medium text-on-surface-variant mt-xs">
                  {new Date(n.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </Sheet>
  );
}
