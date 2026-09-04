import { useCallWaiter } from "@oshap/shared";
import { Fab, toast } from "@oshap/shared/ui";
import { useSession } from "../context/SessionContext";

const TOAST_VISIBLE_MS = 3_500;

/**
 * Floating action button, bottom-right, above the nav bar.
 *
 * Was an icon in the header, which meant it scrolled out of reach on a long
 * menu — exactly when a guest is most likely to want someone. A FAB keeps it
 * thumb-reachable on every screen, and the label is there because the pilot
 * restaurant asked for the call-out: an unlabelled bell is not a control
 * guests discover.
 *
 * Sits at z-40 so drawers and sheets (z-90/100) cover it, and offset above the
 * 4rem BottomNav plus the iOS home-indicator inset.
 *
 * The confirmation goes through the shared toast queue. It used to be a private
 * portal with its own timer, visibility flag and remount key, painting a pill
 * at exactly the coordinates <Toaster /> already occupies in this app — so two
 * confirmations could land on the same point and cover each other.
 */
export default function CallWaiterFab({ tableId }: { tableId: string }) {
  const { session } = useSession();
  const callWaiter = useCallWaiter();

  const handleClick = async () => {
    if (callWaiter.isPending) return;
    try {
      await callWaiter.mutateAsync({
        table_id: tableId,
        session_id: session?.id,
      });
      toast.neutral("A waiter is on the way", TOAST_VISIBLE_MS);
    } catch {
      // Retry is fine — leave the button enabled so the user can tap again.
    }
  };

  return (
    /* Labelled rather than icon-only: the pilot restaurant asked for a
       visible call-out, and an unlabelled bell is not a control guests
       reliably discover. `shrink-0` keeps the label intact on narrow
       phones — the header title truncates instead. */
    <Fab
      onClick={handleClick}
      disabled={callWaiter.isPending}
      title="Call a waiter"
      label={callWaiter.isPending ? "Calling…" : "Call a waiter"}
      icon={
        callWaiter.isPending ? (
          <i className="mgc_loading_line animate-spin" />
        ) : (
          <ServiceBellIcon />
        )
      }
      className="fixed right-4 bottom-[calc(4rem+1rem+env(safe-area-inset-bottom,0px))] z-40"
    />
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
