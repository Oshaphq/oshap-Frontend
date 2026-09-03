import type { ReactNode } from "react";

/**
 * A filter pill. The customer menu's category row is the only place it ships.
 *
 * Selected is `bg-primary` with `on-primary` — the system-wide selected
 * language, shared with the nav indicator, the selection controls and the
 * selected list row. It replaces the `secondary-container` this component used
 * to carry, which was an M3 default nothing in the product ever rendered.
 *
 * At rest it is `surface-container-high` with a 30%-opacity `outline-variant`
 * hairline rather than a full-strength border: the fill already separates it
 * from the page, so a solid outline on top reads as two boundaries.
 *
 * 48px tall, not the 36 the hand-rolled version used. `apps/customer` holds
 * everything tappable to 48, and a category row is the first thing a guest
 * touches. The row is 12px taller for it.
 *
 * The label stays 14px: it is a control label, so the seed's 3.11:1 sits in the
 * same bucket as a filled button's, not in body-copy territory.
 */
export interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  /** MingCute class. M3 shows a check on a selected chip; pass `mgc_check_line`. */
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function Chip({
  children,
  selected = false,
  icon,
  onClick,
  disabled = false,
  className = "",
}: ChipProps) {
  const skin = disabled
    ? "bg-on-surface-disabled text-on-surface-label-disabled border-transparent"
    : selected
      ? "bg-primary text-on-primary border-transparent"
      : "bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-highest";

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-12 shrink-0 items-center gap-xs rounded-full border px-md text-label-large whitespace-nowrap transition-colors active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${skin} ${className}`}
    >
      {icon && <i className={icon} aria-hidden="true" />}
      {children}
    </button>
  );
}
