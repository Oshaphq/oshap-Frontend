import { useState } from "react";
import { useNotifications } from "../context/NotificationContext";
import NotificationSheet from "./NotificationSheet";

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setSheetOpen(true)}
        className="relative w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant text-xl transition-colors hover:bg-surface-container-highest"
      >
        <i className="mgc_notification_line" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-4 h-4 px-xs text-[10px] font-bold text-on-primary bg-primary rounded-full transform translate-x-1 -translate-y-1 shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
