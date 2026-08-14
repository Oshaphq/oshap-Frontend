import { ReactNode } from "react";
import CallWaiterButton from "./CallWaiterButton";
import NotificationBell from "./NotificationBell";

interface CustomerHeaderProps {
  tableId: string;
  leftSlot?: ReactNode; // e.g. Back button
  rightSlot?: ReactNode; // e.g. Search button
  title?: ReactNode;
  subtitle?: ReactNode;
}

/**
 * Deliberately carries no restaurant branding.
 *
 * The guest already knows whose restaurant they're in — they're sitting in it,
 * and the QR card they scanned carries the logo and name. Repeating it here
 * spent the width that the actions need, and on a 360px phone it pushed the
 * name into an ellipsis and wrapped the table badge onto two lines. Branding
 * belongs on the QR sheet and on receipts, not in a sticky action bar.
 *
 * So the heading is the table: the one piece of context a guest actually needs
 * to confirm before ordering.
 */
export default function CustomerHeader({
  tableId,
  leftSlot,
  rightSlot,
  title,
  subtitle,
}: CustomerHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-s p-md bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-s min-w-0">
        {leftSlot}
        <div className="flex flex-col gap-0.5 min-w-0">
          <h1 className="font-display text-display-h1 font-bold text-primary-text truncate">
            {title || `Table ${tableId}`}
          </h1>
          {subtitle && (
            <span className="text-label-l5 text-secondary-text truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-s shrink-0">
        <NotificationBell />
        <CallWaiterButton tableId={tableId} />
        {rightSlot}
      </div>
    </header>
  );
}
