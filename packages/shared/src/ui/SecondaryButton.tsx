import type { ReactNode } from "react";
import Button from "./Button";

/**
 * Secondary but still consequential. Tonal rather than outlined: two bordered
 * buttons side by side read as one control split in half.
 *
 * Kept as a named wrapper over {@link Button} so the ~100 existing call sites
 * do not all move in the DS v2 migration. New code should reach for `Button`
 * with an explicit `variant`, which also opens the elevated, text and
 * destructive rungs of the ladder.
 */
interface SecondaryButtonProps {
  children: ReactNode;
  /**
   * `lg` — full-width CTA, 48px. The mobile primary action.
   * `md` — hugs its label, 40px. The default everywhere else.
   *
   * @default "lg"
   */
  size?: "lg" | "md";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  "aria-label"?: string;
}

export default function SecondaryButton({
  children,
  size = "lg",
  onClick,
  disabled = false,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
}: SecondaryButtonProps) {
  return (
    <Button
      variant="tonal"
      size={size}
      fullWidth={size === "lg"}
      onClick={onClick}
      disabled={disabled}
      type={type}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </Button>
  );
}
