import type { ReactNode } from "react";

interface PrimaryButtonProps {
  children: ReactNode;
  /**
   * `lg` — full-width hero CTA: 16/16 padding, fixed 52px height, fills its
   *        container width. Use for top-level actions (Login, Place Order,
   *        Confirm Order, "I've Sent the Money", Verify Payment).
   * `md` — compact action: 12/24 padding, hugs content (both axes). Use for
   *        in-flow actions (Start Session, Browse Menu, Add Item, Save).
   *        Pass `className="w-full"` if you need fill in a specific spot.
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

export default function PrimaryButton({
  children,
  size = "lg",
  onClick,
  disabled = false,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
}: PrimaryButtonProps) {
  const sizeClass =
    size === "lg" ? "w-full h-[52px] p-md" : "py-3 px-l";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-xs ${sizeClass} rounded-lg bg-primary text-on-primary text-label-l4 leading-4 tracking-normal font-semibold font-display transition duration-100 ease-out hover:opacity-90 active:scale-[0.97] active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:active:brightness-100 ${className}`}
    >
      {children}
    </button>
  );
}
