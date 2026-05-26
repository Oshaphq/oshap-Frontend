import type { ReactNode } from "react";

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  "aria-label"?: string;
}

export default function PrimaryButton({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`py-md px-l bg-primary text-on-primary rounded-sm text-label-l4 font-semibold font-display text-center transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
