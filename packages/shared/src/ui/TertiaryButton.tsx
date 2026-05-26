import type { ReactNode } from "react";

interface TertiaryButtonProps {
  children: ReactNode;
  /**
   * `lg` — full-width outlined CTA: 16/16 padding, fixed 52px height, fills
   *        its container width. Pair with PrimaryButton-lg.
   * `md` — compact outlined CTA: 12/24 padding, hugs content. Pass
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

export default function TertiaryButton({
  children,
  size = "lg",
  onClick,
  disabled = false,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
}: TertiaryButtonProps) {
  const sizeClass =
    size === "lg" ? "w-full h-[52px] p-md" : "py-3 px-l";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-xs ${sizeClass} rounded-lg bg-transparent text-primary border-2 border-primary text-label-l4 leading-4 tracking-normal font-semibold font-display transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
