import { ReactNode } from "react";
import { TableBadge } from "@oshap/shared/ui";
import CallWaiterButton from "./CallWaiterButton";
import NotificationBell from "./NotificationBell";
import { getDeviceToken, useTable } from "@oshap/shared";
import { useSession } from "../context/SessionContext";

interface CustomerHeaderProps {
  tableId: string;
  leftSlot?: ReactNode; // e.g. Back button
  rightSlot?: ReactNode; // e.g. Search button
  title?: ReactNode;
  subtitle?: ReactNode;
}

export default function CustomerHeader({ tableId, leftSlot, rightSlot, title, subtitle }: CustomerHeaderProps) {
  const { session } = useSession();
  const deviceToken = getDeviceToken();

  const tableQuery = useTable({
    tableId,
    deviceToken,
    sessionId: session?.id,
  });
  
  const restaurant = tableQuery.data?.restaurant;
  const restaurantName = restaurant?.name ?? "";
  const logoUrl = restaurant?.logo_url;

  // Only on the restaurant's own header — a page with its own title ("Pay Bill",
  // "My Orders") is about the page, not the venue.
  const showLogo = !title && Boolean(logoUrl);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-s p-md bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-s min-w-0">
        {leftSlot}
        {showLogo && (
          <img
            src={logoUrl!}
            alt=""
            aria-hidden="true"
            className="w-9 h-9 shrink-0 rounded-lg object-cover bg-surface-container-high"
          />
        )}
        <div className="flex flex-col gap-0.5 min-w-0">
          <h1 className="font-display text-display-h1 font-bold text-primary-text truncate">
            {title || restaurantName || "Oshap"}
          </h1>
          {subtitle && (
            <span className="text-label-l5 text-secondary-text truncate">{subtitle}</span>
          )}
        </div>
        {!title && <TableBadge tableId={tableId} />}
      </div>
      <div className="flex items-center gap-s shrink-0">
        <NotificationBell />
        <CallWaiterButton tableId={tableId} />
        {rightSlot}
      </div>
    </header>
  );
}
