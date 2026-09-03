interface AddButtonProps {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  "aria-label"?: string;
}

export default function AddButton({
  label = "ADD",
  onClick,
  disabled = false,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
}: AddButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`py-s px-l bg-transparent text-primary-label border-2 border-primary rounded-sm text-label-large font-semibold uppercase font-display transition-colors hover:bg-primary/8 active:bg-primary/12 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {label}
    </button>
  );
}
