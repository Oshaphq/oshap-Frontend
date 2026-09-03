import type { ReactNode } from "react";

/**
 * A status pill — PAID, OWES, SAYS PAID, SPLIT, LOW STOCK.
 *
 * Typography rewritten to match the pills admin already rendered inline: 11px
 * bold, uppercase, wide tracking. The previous 12px medium sentence-case badge
 * described nothing in the product. Uppercase at this weight reads as a state
 * marker rather than content, which is what lets it sit inside a dense
 * payments row without being mistaken for a value.
 *
 * Status is never carried by colour alone: every badge shows a word. That rule
 * is what keeps the payments table readable to a colour-blind waiter closing a
 * bill.
 *
 * The `icon` prop is gone. None of the shipping pills carried one, the word is
 * what does the work, and a 14px glyph beside an 11px label fought it.
 *
 * `tertiary` is the olive at H 103.54 — 60° off the seed, and far enough from
 * `success-container` that SPLIT and PAID never read as the same pale chip in
 * the payments column. Use it for what a thing *is*, never for what state it
 * is in.
 *
 * `neutral` takes `on-surface-variant`, not `outline`. A border tone used as
 * text is a documented don't, and `outline` fails AA on a raised surface.
 */
export type StatusTone =
  | "success"
  | "warning"
  | "error"
  | "primary"
  | "tertiary"
  | "neutral";

export interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}

const TONE: Record<StatusTone, string> = {
  success: "bg-success-container text-on-success-container",
  warning: "bg-warning-container text-on-warning-container",
  error: "bg-error-container text-on-error-container",
  primary: "bg-primary-container text-on-primary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

export default function StatusBadge({
  children,
  tone = "neutral",
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center px-s py-0.5 rounded-full text-label-small font-bold uppercase tracking-wider whitespace-nowrap ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
