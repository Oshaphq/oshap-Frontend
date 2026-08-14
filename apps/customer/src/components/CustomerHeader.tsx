import { ReactNode } from "react";
import { getDeviceToken, useTable } from "@oshap/shared";
import NotificationBell from "./NotificationBell";
import { useSession } from "../context/SessionContext";

interface CustomerHeaderProps {
  tableId: string;
  leftSlot?: ReactNode; // e.g. Back button
  rightSlot?: ReactNode; // e.g. Search button
  title?: ReactNode;
  subtitle?: ReactNode;
}

/**
 * Two layouts sharing one bar.
 *
 * Without a `title` (the menu) it's a place-setting header: brand mark, where
 * you are, which table. "You're sitting at …" reads as orientation rather than
 * branding, which is the honest job — a guest scanned a code and wants to know
 * the app is talking about the right room and the right table before they order.
 *
 * With a `title` (Pay Bill, Confirm Order, My Orders) the page takes over the
 * heading, and the table pill stays for continuity.
 *
 * The call-waiter action deliberately isn't here — it's a FAB, so it stays
 * reachable while scrolling a long menu instead of scrolling away.
 */
export default function CustomerHeader({
  tableId,
  leftSlot,
  rightSlot,
  title,
  subtitle,
}: CustomerHeaderProps) {
  const { session } = useSession();
  const deviceToken = getDeviceToken();

  const tableQuery = useTable({
    tableId,
    deviceToken,
    sessionId: session?.id,
  });

  const address = tableQuery.data?.restaurant?.address;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-s p-md bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-s min-w-0">
        {leftSlot}

        {!title && (
          <img
            src="/oshap.png"
            alt=""
            aria-hidden="true"
            className="w-8 h-8 shrink-0 rounded-lg object-contain"
          />
        )}

        <div className="flex flex-col min-w-0">
          {title ? (
            <>
              <h1 className="font-display text-display-h1 font-bold text-primary-text truncate">
                {title}
              </h1>
              {subtitle && (
                <span className="text-label-l5 text-secondary-text truncate">
                  {subtitle}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-caption-xs text-secondary-text leading-tight">
                You&rsquo;re sitting at
              </span>
              {/* Falls back to the app name rather than an empty bar while the
                  table request is in flight, or if no address is configured. */}
              <h1 className="text-label-l3 font-semibold text-primary-text truncate leading-tight">
                {address || "Oshap"}
              </h1>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-s shrink-0">
        <span className="px-s py-xs rounded-4xl border border-primary text-primary text-caption-md font-semibold whitespace-nowrap">
          Table {tableId}
        </span>
        <NotificationBell />
        {rightSlot}
      </div>
    </header>
  );
}
