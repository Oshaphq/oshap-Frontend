import { ReactNode } from "react";
import { TableBadge, ThemeToggle } from "@oshap/shared/ui";
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
  
  const restaurantName = tableQuery.data?.restaurant?.name ?? "";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between p-md bg-surface-container-low border-b border-outline-variant">
      <div className="flex items-center gap-s">
        {leftSlot}
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-display-h1 font-bold text-primary-text">
            {title || restaurantName || "Oshap"}
          </h1>
          {subtitle && <span className="text-label-l5 text-secondary-text">{subtitle}</span>}
        </div>
        {!title && <TableBadge tableId={tableId} />}
      </div>
      <div className="flex items-center gap-s">
        <ThemeToggle />
        <NotificationBell />
        <CallWaiterButton tableId={tableId} />
        {rightSlot}
      </div>
    </header>
  );
}
