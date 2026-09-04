import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { dismiss, subscribe, type Toast } from "./toast";

/**
 * `neutral` is the M3 snackbar and is shaped differently on purpose. A status
 * toast can carry a whole error sentence, so it is a full-width block that
 * wraps; a snackbar is a short confirmation, so it shrink-wraps into a pill.
 * `self-center` is what lets it out of the column's default stretch.
 */
const VARIANT_META: Record<
  Toast["variant"],
  { icon: string; wrapperClass: string }
> = {
  success: {
    icon: "mgc_check_circle_line",
    wrapperClass: "items-start p-md rounded-sm bg-success-container text-on-success-container",
  },
  error: {
    icon: "mgc_alert_diamond_line",
    wrapperClass: "items-start p-md rounded-sm bg-error-container text-on-error-container",
  },
  info: {
    icon: "mgc_information_line",
    wrapperClass: "items-start p-md rounded-sm bg-primary-container text-on-primary-container",
  },
  neutral: {
    icon: "mgc_check_circle_line",
    wrapperClass:
      "items-center self-center w-auto max-w-full px-md py-s rounded-full bg-inverse-surface text-inverse-on-surface",
  },
};

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribe(setToasts), []);

  if (typeof document === "undefined" || toasts.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="fixed top-[calc(env(safe-area-inset-top,0px)+1rem)] left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-s w-[calc(100vw-2rem)] max-w-[448px] pointer-events-none"
    >
      {toasts.map((t) => {
        const meta = VARIANT_META[t.variant];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex gap-s shadow-lg text-left ${meta.wrapperClass}`}
            style={{ animation: "slide-down 220ms ease-out" }}
          >
            <i className={`${t.icon ?? meta.icon} text-xl shrink-0`} aria-hidden="true" />
            <span className="text-label-large font-medium flex-1">{t.message}</span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
