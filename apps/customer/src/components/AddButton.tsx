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
      className={`py-s px-l bg-transparent text-primary border-2 border-primary rounded-lg text-label-l4 font-semibold uppercase font-display transition-colors hover:bg-primary hover:text-on-primary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {label}
    </button>
  );
}
