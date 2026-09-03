import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

/**
 * The filled text field.
 *
 * This replaces eleven separate `const inputClass = "…"` declarations that had
 * drifted into six variants of the same string. The differences were not
 * choices — `w-full` on some, `disabled:` handling on two of eleven, and two
 * different container tones — they were what happens when a string is pasted.
 *
 * Two of those variants were wrong against `docs/color-usage.md`, and the
 * component is where that gets settled once:
 *
 * - The border is `outline`, not `outline-variant`. Using `outline-variant` on
 *   a control the user can focus is an explicit don't: it is `grey-88`, so the
 *   field boundary was close to invisible and well under the 3:1 that WCAG
 *   asks of a non-text UI boundary. Seven of the eleven copies did this.
 * - The container is `surface-container`. That is the row the doc gives for a
 *   filled text field, and it is a step up from the `surface-container-low`
 *   card a form usually sits on, so the field reads as inset rather than
 *   floating on the same tone as its own card.
 *
 * The label is the real reason this is a component rather than a shared
 * string. The forms rendered `<label>Name</label>` next to an input with no
 * `htmlFor` and no wrapping — 26 of 37 labels across admin and platform were
 * associated with nothing, so the field was unnamed to a screen reader and the
 * label was not clickable. Here the id comes from `useId` and the association
 * cannot be left out.
 *
 * Metrics are deliberately unchanged from what shipped. M3 draws a filled
 * field taller than this, but re-spacing forty-five admin fields is a layout
 * change, not a token fix, and does not belong in the same commit.
 */

const FIELD =
  "w-full rounded-sm bg-surface-container border text-on-surface placeholder:text-on-surface-placeholder outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const DENSITY = {
  md: "px-md py-s text-body-medium",
  sm: "px-s py-xs text-body-medium",
} as const;

interface FieldOwnProps {
  /** Rendered as a real `<label htmlFor>`. Omit only when `aria-label` is set. */
  label?: ReactNode;
  /** Quiet helper text under the field. Announced via `aria-describedby`. */
  hint?: ReactNode;
  /** Sets `aria-invalid`, tints the border, and is announced like the hint. */
  error?: ReactNode;
  density?: keyof typeof DENSITY;
  /** Layout for the wrapper — width, flex, grid span. The field fills it. */
  wrapperClassName?: string;
  /**
   * An affordance inside the field's right edge — a password reveal, a clear
   * button, a unit suffix. The field reserves clearance for it, so nothing has
   * to be padded by hand at the call site.
   */
  trailing?: ReactNode;
  /** Render a `<textarea>`. Everything else behaves the same. */
  multiline?: boolean;
  rows?: number;
}

export type TextFieldProps = FieldOwnProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

export default function TextField({
  label,
  hint,
  error,
  density = "md",
  trailing,
  wrapperClassName = "",
  multiline = false,
  rows = 3,
  className = "",
  id,
  ...rest
}: TextFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy =
    [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const shared = {
    ...rest,
    id: fieldId,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: `${FIELD} ${DENSITY[density]} ${
      error ? "border-error focus:border-error" : "border-outline focus:border-primary"
    } ${trailing ? "pr-12" : ""} ${className}`,
  };

  const field = multiline ? (
    <textarea
      rows={rows}
      {...(shared as unknown as TextareaHTMLAttributes<HTMLTextAreaElement>)}
    />
  ) : (
    <input {...shared} />
  );

  return (
    <div className={wrapperClassName}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-body-medium font-semibold text-on-surface mb-xs"
        >
          {label}
        </label>
      )}
      {trailing ? (
        <div className="relative">
          {field}
          <div className="absolute right-xs top-1/2 -translate-y-1/2 flex items-center">
            {trailing}
          </div>
        </div>
      ) : (
        field
      )}
      {error && (
        <p id={errorId} className="mt-xs text-body-small text-error">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-xs text-body-small text-on-surface-variant">
          {hint}
        </p>
      )}
    </div>
  );
}
