import { useEffect, useRef, useState } from "react";
import type { Unsubscribe } from "firebase/messaging";
import { getMessagingInstance } from "../utils/fcm";
import { playChime } from "../utils/chime";

interface Alert {
  id: number;
  title: string;
  body: string;
  iconClass: string;
  iconColorClass: string;
}

const VISIBLE_MS = 5_000;

const TYPE_META: Record<
  string,
  { iconClass: string; iconColorClass: string; chime: boolean }
> = {
  pos_requested: {
    iconClass: "mgc_card_pay_line",
    iconColorClass: "text-primary",
    chime: true,
  },
  waiter_called: {
    iconClass: "mgc_service_line",
    iconColorClass: "text-primary",
    chime: true,
  },
  new_order: {
    iconClass: "mgc_shopping_bag_2_line",
    iconColorClass: "text-primary",
    chime: true,
  },
  payment_claimed: {
    iconClass: "mgc_wallet_4_line",
    iconColorClass: "text-warning",
    chime: true,
  },
};

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const nextIdRef = useRef(1);

  useEffect(() => {
    let unsub: Unsubscribe | undefined;
    let cancelled = false;

    (async () => {
      const messaging = getMessagingInstance();
      if (!messaging) return;
      const { onMessage } = await import("firebase/messaging");
      if (cancelled) return;

      unsub = onMessage(messaging, (payload) => {
        const type = (payload.data?.type as string | undefined) ?? "";
        const meta = TYPE_META[type];
        if (!meta) return;

        const title = payload.notification?.title ?? "Notification";
        const body = payload.notification?.body ?? "";
        const id = nextIdRef.current++;

        setAlerts((prev) => [
          ...prev,
          { id, title, body, iconClass: meta.iconClass, iconColorClass: meta.iconColorClass },
        ]);

        if (meta.chime) playChime();

        setTimeout(() => {
          setAlerts((prev) => prev.filter((a) => a.id !== id));
        }, VISIBLE_MS);
      });
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top,0px)+1rem)] right-4 z-[60] flex flex-col gap-s max-w-[calc(100vw-2rem)] w-[360px]">
      {alerts.map((a) => (
        <div
          key={a.id}
          role="status"
          aria-live="polite"
          className="flex items-start gap-s p-md rounded-lg bg-inverse-surface text-inverse-on-surface shadow-lg"
          style={{ animation: "slide-down 220ms ease-out" }}
        >
          <i className={`${a.iconClass} text-2xl shrink-0 ${a.iconColorClass}`} />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-label-l4 font-semibold font-display">
              {a.title}
            </span>
            <p className="text-label-l5 text-outline-variant">{a.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
