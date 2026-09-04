import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The DS v3 button — five variants in one emphasis ladder.
 *
 * The filled variant fills with the seed #F56500 and a white label. v2 derived
 * a second, darker token to reach 4.5:1; v3 deletes it and states the cost
 * instead: white on the seed is 3.11:1, which meets AA for large text and UI
 * components but NOT for body copy.
 *
 * That makes ONE rule load-bearing, and it is enforced here rather than left to
 * call sites: a filled button's label is always 16px semibold, whatever height
 * it is rendered at. Every other variant puts its label on a surface or a
 * container tone, where 14px clears comfortably.
 *
 * Radius stays 8px. M3 draws buttons as pills; a pill next to a rectangular
 * price field reads as a different generation of UI, and the apps are full of
 * rectangular price fields.
 */
export type ButtonVariant =
  | "filled"
  | "tonal"
  | "outlined"
  | "elevated"
  | "text"
  | "destructive";

/**
 * Two densities — 48px comfortable, 40px compact.
 *
 * There was a third, `sm`, at 32px. It predated the ladder, was reachable from
 * no wrapper, was passed by no call site, and failed the touch minimum on a
 * mobile surface. It existed only to be asserted against in its own test.
 */
export type ButtonSize = "md" | "lg";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the container. The mobile primary CTA is `lg` + `fullWidth`. */
  fullWidth?: boolean;
  /**
   * Recolours `text` and `outlined` to the error role, for a destructive
   * action that is not the loudest thing on the screen — "Clear All" in a
   * sheet footer, not "Delete account". The `destructive` VARIANT stays what
   * it was: a filled error button, for when it should be the loudest thing.
   *
   * A boolean rather than two more variants, and applied inside the component
   * rather than through `className`, because a class override of the same
   * specificity is settled by the order Tailwind emits the two utilities, not
   * by the order they are written at the call site.
   */
  destructive?: boolean;
  className?: string;
}

/** Height and padding only — the label size is decided by the variant. */
const SIZE: Record<ButtonSize, string> = {
  md: "h-10 px-l gap-s",
  lg: "h-12 px-7 gap-s",
};

const VARIANT: Record<ButtonVariant, string> = {
  // Seed / white. The 3:1 exception, which is why the label is pinned at 16px.
  filled: "bg-primary text-on-primary hover:brightness-95 active:brightness-90",
  // P90 / P10 — v3 moves tonal onto the primary container, not secondary.
  tonal:
    "bg-primary-container text-on-primary-container hover:brightness-95 active:brightness-90",
  // NV50 border, P40 label.
  outlined:
    "border border-outline text-primary-label hover:bg-primary/8 active:bg-primary/12",
  elevated:
    "bg-surface-container-low text-on-surface shadow-sm hover:shadow-md active:bg-surface-container",
  text: "text-primary-label hover:bg-primary/8 active:bg-primary/12",
  destructive:
    "bg-error text-on-error hover:brightness-95 active:brightness-90",
};

/**
 * A white label on the seed is only legible at large-text size, so `filled`
 * takes 16px semibold at every height. `destructive` fills with E40, which
 * clears 4.5:1 under white and needs no such pin.
 *
 * Every other variant is label-large. This used to vary by size, purely to
 * give `sm` a 13px label — the one off-scale font size in the system. With
 * `sm` gone it is a constant.
 */
const LABEL: Record<ButtonVariant, string> = {
  filled: "text-[16px] tracking-[0.1px]",
  tonal: "text-label-large",
  outlined: "text-label-large",
  elevated: "text-label-large",
  text: "text-label-large",
  destructive: "text-label-large",
};

/** `text` hugs its label rather than sitting in a slab. */
const TEXT_PADDING: Record<ButtonSize, string> = {
  md: "px-s",
  lg: "px-md",
};

export default function Button({
  children,
  variant = "filled",
  size = "md",
  fullWidth = false,
  destructive = false,
  className = "",
  type = "button",
  disabled = false,
  ...rest
}: ButtonProps) {
  const padding = variant === "text" ? TEXT_PADDING[size] : "";
  // Only the unfilled variants can carry it; a filled container has already
  // chosen its on-color, and recolouring the label would break the pair.
  const intent =
    destructive && (variant === "text" || variant === "outlined")
      ? "text-error hover:bg-error/8 active:bg-error/12"
      : "";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-sm font-display font-semibold whitespace-nowrap transition duration-100 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-on-surface-disabled disabled:text-on-surface-label-disabled disabled:shadow-none disabled:brightness-100 disabled:active:scale-100 ${SIZE[size]} ${padding} ${LABEL[variant]} ${VARIANT[variant]} ${intent} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
