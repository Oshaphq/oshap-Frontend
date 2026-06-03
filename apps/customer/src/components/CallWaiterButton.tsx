import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCallWaiter } from "@oshap/shared";
import { useSession } from "../context/SessionContext";

const TOAST_VISIBLE_MS = 3_500;

export default function CallWaiterButton({ tableId }: { tableId: string }) {
  const { session } = useSession();
  const callWaiter = useCallWaiter();
  const [toastKey, setToastKey] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleClick = async () => {
    if (callWaiter.isPending) return;
    try {
      await callWaiter.mutateAsync({
        table_id: tableId,
        session_id: session?.id,
      });
      setToastKey((k) => k + 1);
      setToastVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(
        () => setToastVisible(false),
        TOAST_VISIBLE_MS,
      );
    } catch {
      // Retry is fine — leave the button enabled so the user can tap again.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={callWaiter.isPending}
        aria-label="Call waiter"
        title="Call waiter"
        className="w-10 h-10 flex items-center justify-center rounded-4xl text-xl transition-colors bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:cursor-wait"
      >
        {callWaiter.isPending ? (
          <i className="mgc_loading_line animate-spin" />
        ) : (
          <ServiceBellIcon />
        )}
      </button>
      {toastVisible &&
        typeof document !== "undefined" &&
        createPortal(<WaiterToast key={toastKey} />, document.body)}
    </>
  );
}

function ServiceBellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M0 0h24v24H0z" fill="none" />
      <path
        fill="currentColor"
        d="M11.75 7.5a.75.75 0 0 0 0 1.5c1.322 0 2.712.759 3.41 1.756a.75.75 0 1 0 1.229-.86C15.413 8.502 13.567 7.5 11.75 7.5m-2.25-3a2.5 2.5 0 0 1 5 0v.88a8.245 8.245 0 0 1 5.75 7.87a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75c0-3.679 2.422-6.793 5.75-7.858zm3.5 0a1 1 0 1 0-2 0v.563a8.3 8.3 0 0 1 2-.005zm-7.708 8h13.417c-.37-3.376-3.216-6-6.688-6c-3.475 0-6.354 2.628-6.73 6M4 15a2 2 0 1 0 0 4h16a2 2 0 1 0 0-4zm-.5 2a.5.5 0 0 1 .5-.5h16a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5"
      />
    </svg>
  );
}

function WaiterToast() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[calc(env(safe-area-inset-top,0px)+1rem)] left-1/2 -translate-x-1/2 z-[60] flex items-center gap-s px-md py-s rounded-4xl bg-inverse-surface text-inverse-on-surface shadow-lg max-w-[calc(100vw-2rem)]"
      style={{ animation: "slide-down 220ms ease-out" }}
    >
      <span className="text-xl text-primary">
        <ServiceBellIcon />
      </span>
      <span className="text-label-l4 font-medium">
        A waiter is on the way
      </span>
    </div>
  );
}
