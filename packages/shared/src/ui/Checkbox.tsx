import { useId, type ReactNode } from "react";

/**
 * A checkbox.
 *
 * The design already existed, drawn twice and correctly both times — a 20px
 * box, 2px `outline` border, `bg-primary` with a check glyph when on, in
 * `ItemModifiersDialog` and in the customer's `ModifierSheet`. Everywhere
 * else the app used a bare `<input type="checkbox" class="w-4 h-4
 * accent-primary">`, which is a different control in the same product: a
 * 16px native box painted with the seed.
 *
 * Sixteen pixels is the problem. WCAG 2.2 asks 24 for a target, and while a
 * wrapping `<label>` rescues three of the four call sites by making the whole
 * row clickable, the fourth — the per-dish select box on the menu — has no
 * wrapping label and is a bare 16px square. Here the label is the control, so
 * the target is the row by construction.
 *
 * Built on a real `<input>` rather than a `<button role="checkbox">`. The
 * button version has to re-implement what the platform already does — Space
 * toggling, the indeterminate state, form participation — and the two places
 * that did it were only correct because someone was careful.
 */

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Rendered beside the box. Omit only when `aria-label` is given. */
  label?: ReactNode;
  /** A quieter second line under the label. */
  description?: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
  /** Classes for the `<label>`, which is the whole clickable row. */
  className?: string;
}

export default function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  "aria-label": ariaLabel,
  className = "",
}: CheckboxProps) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={`inline-flex items-start gap-s min-h-6 select-none ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`w-5 h-5 mt-0.5 shrink-0 flex items-center justify-center rounded-xs border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${
          checked
            ? "bg-primary border-primary text-on-primary"
            : "border-outline"
        }`}
      >
        {checked && <i className="mgc_check_line text-xs font-bold" />}
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5 min-w-0">
          {label && (
            <span className="text-body-medium text-on-surface">{label}</span>
          )}
          {description && (
            <span className="text-body-small text-on-surface-variant">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}
