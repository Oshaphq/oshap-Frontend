import type { ButtonHTMLAttributes } from "react";

/**
 * The M3 icon-button variants. Each one names its colour pair, so a glyph
 * never picks its own hex — on a filled or tonal container it takes that
 * container's on-color, the same rule text follows.
 *
 * That is a rule about CONTAINERS, not about every glyph in the app. An icon
 * on a plain surface has no container to take an on-color from, and there the
 * choice is between `on-surface-variant` for a neutral glyph and
 * `primary-label` for a deliberate accent — never `outline`, which is a border
 * tone and measures 4.29:1 on a card.
 *
 * `filled` is the one place the brand fill is still allowed under a white
 * glyph: an icon is a UI component, held to WCAG's 3:1 non-text bar, and
 * #f56500 clears it at 3.11:1. A *labelled* button in the same position needs
 * a 16px semibold label to clear the same bar — see {@link Button}.
 *
 * `surface` is the fifth, and it is the one the product actually uses. The
 * four M3 variants describe a control this app does not have: two dozen
 * circular controls across thirteen files carry a RESTING neutral fill, and
 * none of the four could express it — `standard` is transparent until hover,
 * `tonal` is the brown secondary container. It cannot be reached with
 * `className` either: `.bg-transparent` is emitted after `.bg-surface-container`
 * in the sheet, so a class override loses the cascade regardless of order at
 * the call site.
 */
export type IconButtonVariant =
  | "standard"
  | "surface"
  | "filled"
  | "tonal"
  | "outlined";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  /** Required: an icon-only control has no accessible name without it. */
  "aria-label": string;
  /** MingCute class, e.g. `mgc_search_line`. `_line` at rest, `_fill` active. */
  icon: string;
  variant?: IconButtonVariant;
  /**
   * 48px is the touch minimum and the default. 40px is acceptable only for
   * desktop-only controls in admin and platform, never in the customer app.
   *
   * @default "touch"
   */
  size?: "touch" | "dense";
  /** Destructive intent — colours the glyph `error` on standard and outlined. */
  destructive?: boolean;
  className?: string;
}

const VARIANT: Record<IconButtonVariant, string> = {
  standard: "bg-transparent hover:bg-surface-container-high",
  surface:
    "bg-surface-container hover:bg-surface-container-high",
  filled: "bg-primary text-on-primary hover:brightness-95",
  tonal:
    "bg-secondary-container text-on-secondary-container hover:brightness-95",
  outlined: "border border-outline bg-transparent hover:bg-on-surface/8",
};

export default function IconButton({
  icon,
  variant = "standard",
  size = "touch",
  destructive = false,
  className = "",
  type = "button",
  ...rest
}: IconButtonProps) {
  const box = size === "touch" ? "w-12 h-12 text-2xl" : "w-10 h-10 text-xl";
  // Only the unfilled variants carry intent in the glyph; on a filled or tonal
  // container the on-color already won, and overriding it would break the pair.
  const tint =
    variant === "filled" || variant === "tonal"
      ? ""
      : destructive
        ? "text-error"
        : "text-on-surface-variant";

  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition duration-100 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-on-surface-label-disabled disabled:active:scale-100 ${box} ${VARIANT[variant]} ${tint} ${className}`}
      {...rest}
    >
      <i className={icon} aria-hidden="true" />
    </button>
  );
}
