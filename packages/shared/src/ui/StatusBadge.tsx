import type { ReactNode } from "react";

/**
 * A status pill — PAID, OWES, SAYS PAID, SPLIT, LOW STOCK.
 *
 * Status is never carried by colour alone: every badge shows a word, and an
 * `icon` is available where the row is dense enough that the word alone is easy
 * to skim past. That rule is what keeps the payments table readable to a
 * colour-blind waiter closing a bill.
 *
 * `tertiary` is violet rather than the olive the old system used. The palette
 * generator's default hue put tertiary's container 10.8° from
 * `success-container`, which would have put two pale mint chips in the same
 * column — where PAID means settled and SPLIT does not.
 */
export type StatusTone =
  | "success"
  | "warning"
  | "error"
  | "primary"
  | "tertiary"
  | "accent"
  | "neutral";

export interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusTone;
  /** MingCute class, e.g. `mgc_check_circle_line`. */
  icon?: string;
  className?: string;
}

const TONE: Record<StatusTone, string> = {
  success: "bg-success-container text-on-success-container",
  warning: "bg-warning-container text-on-warning-container",
  error: "bg-error-container text-on-error-container",
  primary: "bg-primary-container text-on-primary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
  // Attention without action — an open table, a promo, an unread count.
  // Never a payment state, which a guest could misread.
  accent: "bg-accent-container text-on-accent-container",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

export default function StatusBadge({
  children,
  tone = "neutral",
  icon,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-xs rounded-full px-2.5 py-xs text-label-medium ${TONE[tone]} ${className}`}
    >
      {icon && <i className={icon} aria-hidden="true" />}
      {children}
    </span>
  );
}
