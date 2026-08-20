import type { ReactNode } from "react";

interface SecondaryButtonProps {
  children: ReactNode;
  /**
   * `lg` — full-width muted CTA: 16/16 padding, fixed 52px height, fills its
   *        container width. Use when paired with a PrimaryButton-lg.
   * `md` — compact muted chip: 12/24 padding, hugs content. Use for quiet
   *        secondary actions (Refresh, Join with PIN). Pass
   *        `className="w-full"` for fill where needed.
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
  const sizeClass =
    size === "lg" ? "w-full h-[52px] p-md" : "py-3 px-l";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-xs ${sizeClass} rounded-lg bg-surface-container text-on-surface-variant text-label-l4 leading-4 tracking-normal font-semibold font-display transition duration-100 ease-out hover:bg-surface-container-high active:bg-surface-container-highest active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}
