import type { ButtonHTMLAttributes } from "react";

/**
 * The floating action button, in M3's three shapes.
 *
 * It fills with `primary-container` rather than the brand: a FAB floats over
 * scrolling content, so it needs to hold its own against every surface step
 * underneath it, and a tonal container does that where a saturated fill starts
 * to fight the page.
 *
 * The FAB keeps its 16px container rather than moving to the pill the rest of
 * the shape scale would suggest — it already reads as its own component, and
 * nothing else in the system depends on the corner.
 */
export interface FabProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  /** MingCute class, e.g. `mgc_add_line`. */
  icon: string;
  /** Present on the `extended` size only; ignored otherwise. */
  label?: string;
  size?: "small" | "default" | "extended";
  className?: string;
}

export default function Fab({
  icon,
  label,
  size = "default",
  className = "",
  type = "button",
  ...rest
}: FabProps) {
  const box =
    size === "small"
      ? "w-10 h-10 rounded-md text-xl shadow-md"
      : size === "extended"
        ? "h-14 gap-2.5 rounded-lg px-l text-label-large shadow-lg"
        : "w-14 h-14 rounded-lg text-2xl shadow-lg";

  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center bg-primary-container font-display font-semibold text-on-primary-container transition duration-100 ease-out hover:brightness-97 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-on-surface-disabled disabled:text-on-surface-label-disabled disabled:shadow-none disabled:active:scale-100 ${box} ${className}`}
      {...rest}
    >
      <i className={icon} aria-hidden="true" />
      {size === "extended" && label}
    </button>
  );
}
