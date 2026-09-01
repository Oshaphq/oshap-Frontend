import type { ReactNode } from "react";

/**
 * Chips no longer change token by context.
 *
 * They are outlined at rest and take `secondary-container` when selected. A
 * border reads against every step of the surface ladder, so whoever places a
 * chip no longer has to know what it is sitting on — which is what went wrong
 * when the resting fill was a surface step and the chip moved onto a card.
 */
export interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  /** MingCute class. On a selected chip M3 shows a check; pass `mgc_check_line`. */
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
  const skin = selected
    ? "bg-secondary-container text-on-secondary-container border-transparent"
    : "bg-transparent text-on-surface-variant border-outline hover:bg-on-surface/8";

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 shrink-0 items-center gap-xs rounded-full border px-l text-label-large whitespace-nowrap transition duration-100 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-on-surface-disabled disabled:text-on-surface-label-disabled disabled:active:scale-100 ${skin} ${className}`}
    >
      {icon && <i className={icon} aria-hidden="true" />}
      {children}
    </button>
  );
}
