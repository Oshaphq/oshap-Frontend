import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The DS v2 button — one emphasis ladder, five variants, three heights.
 *
 * Every filled variant fills with `primary-action` #c24e00, never the brand
 * #f56500. White on the brand measures 3.11:1, which clears WCAG's non-text bar
 * and fails the 4.5:1 text bar; white on `primary-action` measures 4.79:1. So
 * the fill carries the contrast and the label size is free to follow the
 * density of the screen, which is the way round it should be.
 *
 * Radius stays at `sm` 8px. M3 draws buttons as pills; Oshap does not, so no
 * button silhouette moves in this migration.
 */
export type ButtonVariant =
  | "filled"
  | "elevated"
  | "tonal"
  | "outlined"
  | "text"
  | "destructive";

/** `sm` never stands alone on a mobile surface — 32px fails the 48px touch
 *  minimum unless it sits in a row that provides the target. */
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the container. The mobile primary CTA is `lg` + `fullWidth`. */
  fullWidth?: boolean;
  className?: string;
}

/**
 * Heights and labels are 32/13, 40/14, 48/16. Only `md` lands exactly on a type
 * role (`label-large`); the other two set size and tracking directly rather
 * than borrow a body role, which would drag its 400 weight and 0.5px tracking
 * onto a label that wants Archivo 600 at 0.1px.
 */
const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-md gap-xs text-[13px] tracking-[0.1px]",
  md: "h-10 px-l gap-s text-label-large",
  lg: "h-12 px-7 gap-s text-[16px] tracking-[0.1px]",
};

const VARIANT: Record<ButtonVariant, string> = {
  filled:
    "bg-primary-action text-on-primary hover:brightness-95 active:brightness-90",
  elevated:
    "bg-surface-container-low text-on-surface shadow-sm hover:shadow-md active:bg-surface-container",
  tonal:
    "bg-secondary-container text-on-secondary-container hover:brightness-95 active:brightness-90",
  outlined:
    "border border-outline text-primary-label hover:bg-primary/8 active:bg-primary/12",
  text: "text-primary-label hover:bg-primary/8 active:bg-primary/12",
  destructive:
    "bg-error text-on-error hover:brightness-95 active:brightness-90",
};

/** `text` is the one variant that hugs its label rather than sitting in a slab. */
const TEXT_PADDING: Record<ButtonSize, string> = {
  sm: "px-s",
  md: "px-s",
  lg: "px-md",
};

export default function Button({
  children,
  variant = "filled",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  disabled = false,
  ...rest
}: ButtonProps) {
  const padding = variant === "text" ? TEXT_PADDING[size] : "";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-sm font-display font-semibold whitespace-nowrap transition duration-100 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-on-surface-disabled disabled:text-on-surface-label-disabled disabled:shadow-none disabled:brightness-100 disabled:active:scale-100 ${SIZE[size]} ${padding} ${VARIANT[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
