import type { ReactNode } from "react";

interface SecondaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  "aria-label"?: string;
}

export default function SecondaryButton({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
}: SecondaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`py-md px-l bg-surface-container text-on-surface-variant rounded-sm text-label-l4 font-semibold font-display text-center transition-colors hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
