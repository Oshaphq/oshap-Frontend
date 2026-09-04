import type { ReactNode } from "react";

/**
 * "There is nothing here yet, and here is what to do about it."
 *
 * Lifted out of a local function in `pay.tsx`. Eleven more were hand-rolled
 * across the three apps and had drifted into eight different shapes — some
 * carded, some bare, gaps of xs, s and l, one filling its container. Nobody
 * chose that; it accumulated.
 *
 * Empty is not an error. A list with nothing in it gets the neutral tone and a
 * next step; only an actual failure gets `error`. `QueryError` is the component
 * for that case and stays separate, because a failed request is not an empty
 * result and offering "Add your first item" after a timeout is a lie.
 *
 * The glyph is decorative — the title and message carry the meaning, which is
 * why three of the four dead icon classes the v3 rebuild uncovered had been
 * sitting in empty states unnoticed.
 */
export type EmptyStateTone = "neutral" | "success" | "error" | "brand";

const TONE: Record<EmptyStateTone, string> = {
  neutral: "text-on-surface-variant",
  success: "text-success",
  error: "text-error",
  brand: "text-primary-label",
};

export interface EmptyStateProps {
  /** MingCute class, e.g. `mgc_bowl_line`. Rendered at 48px. */
  icon: string;
  title: string;
  message?: ReactNode;
  /** Tints the glyph only. Status is carried by the words, never the colour. */
  tone?: EmptyStateTone;
  /**
   * Sits on its own `surface-container-low` card. On by default — it is what
   * separates "this list is empty" from "the page has not loaded".
   *
   * Turn it off where the empty state fills a region that is already a
   * container, such as the kitchen board.
   */
  card?: boolean;
  /** The next step. One action, and it is the filled button on the view. */
  children?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  message,
  tone = "neutral",
  card = true,
  children,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-s py-10 px-md text-center ${
        card ? "rounded-lg bg-surface-container-low" : ""
      } ${className}`}
    >
      <i className={`${icon} text-5xl ${TONE[tone]}`} aria-hidden="true" />
      <span className="font-display text-title-medium font-semibold text-on-surface">
        {title}
      </span>
      {message && (
        <p className="text-body-medium text-on-surface-variant max-w-[46ch]">
          {message}
        </p>
      )}
      {children && <div className="mt-s">{children}</div>}
    </div>
  );
}
