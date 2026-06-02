import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { subscribeToPush, type ToastVariant, type Toast } from "@oshap/shared/ui";

export interface NotificationItem {
  id: string;
  message: string;
  variant: ToastVariant;
  timestamp: number;
  read: boolean;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

function getStorageKey(tableId: string) {
  return `oshap-notifications-${tableId}`;
}

export function NotificationProvider({ tableId, children }: { tableId: string; children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(tableId));
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        setNotifications([]);
      }
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  }, [tableId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey(tableId), JSON.stringify(notifications));
  }, [notifications, tableId]);

  useEffect(() => {
    const unsubscribe = subscribeToPush((toast: Toast) => {
      setNotifications((prev) => {
        const newNotif: NotificationItem = {
          id: `${Date.now()}-${toast.id}`,
          message: toast.message,
          variant: toast.variant,
          timestamp: Date.now(),
          read: false,
        };
        return [newNotif, ...prev];
      });
    });
    return unsubscribe;
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
