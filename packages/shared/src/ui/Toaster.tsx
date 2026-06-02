import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { dismiss, subscribe, type Toast } from "./toast";

const VARIANT_META: Record<
  Toast["variant"],
  { icon: string; iconColorClass: string }
> = {
  success: {
    icon: "mgc_check_circle_line",
    iconColorClass: "text-success",
  },
  error: {
    icon: "mgc_alert_diamond_line",
    iconColorClass: "text-error",
  },
  info: {
    icon: "mgc_information_line",
    iconColorClass: "text-primary",
  },
};

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribe(setToasts), []);

  if (typeof document === "undefined" || toasts.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="fixed top-[calc(env(safe-area-inset-top,0px)+1rem)] left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-s w-[calc(100vw-2rem)] max-w-md pointer-events-none"
    >
      {toasts.map((t) => {
        const meta = VARIANT_META[t.variant];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto flex items-start gap-s p-md rounded-lg bg-inverse-surface text-inverse-on-surface shadow-lg text-left"
            style={{ animation: "slide-down 220ms ease-out" }}
          >
            <i className={`${meta.icon} text-xl shrink-0 ${meta.iconColorClass}`} />
            <span className="text-label-l4 font-medium flex-1">{t.message}</span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
