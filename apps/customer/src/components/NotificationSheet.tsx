import { useNotifications } from "../context/NotificationContext";
import { useDragToDismiss } from "../hooks/useDragToDismiss";

export default function NotificationSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { sheetRef, handleProps } = useDragToDismiss(onClose);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-scrim z-[90] animate-[fade-in_0.2s_ease]"
        onClick={onClose}
      />
      <div 
        ref={sheetRef}
        role="dialog"
        aria-label="Notifications"
        className="fixed left-0 right-0 bottom-0 max-h-[80vh] bg-surface-container-low rounded-t-l z-[100] flex flex-col shadow-[0_-4px_24px_var(--ds-shadow)] animate-[slide-up-drawer_0.3s_ease] will-change-transform"
      >
        <div {...handleProps} className="flex justify-center py-s cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-4xl bg-outline-variant" />
        </div>

        <div className="flex items-center justify-between px-md pb-md border-b border-outline-variant">
          <h2 className="text-display-h2 font-display font-semibold text-primary-text">
            Notifications
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <i className="mgc_close_line text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-md space-y-s">
          {notifications.length === 0 ? (
            <div className="py-xl text-center text-secondary-text">
              <i className="mgc_notification_off_line text-4xl mb-s opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.read) markAsRead(n.id);
                }}
                className={`p-s rounded-xl border transition-colors cursor-pointer ${
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
                    <p className={`text-p2 ${n.read ? "text-secondary-text" : "text-primary-text font-medium"}`}>
                      {n.message}
                    </p>
                    <p className="text-caption-md text-secondary-text mt-1">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-md border-t border-outline-variant flex justify-between gap-s">
            <button
              onClick={clearAll}
              className="px-md py-s rounded-full font-semibold text-label-l2 text-error hover:bg-error/10 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={markAllAsRead}
              className="px-md py-s rounded-full font-semibold text-label-l2 text-primary hover:bg-primary/10 transition-colors"
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </>
  );
}
