import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The floating action button.
 *
 * Rewritten to match the only FAB that ships. This component used to describe
 * M3's three shapes on `primary-container` at radius 16 — none of which the
 * product rendered. The real one is a full-radius 48px pill filled with the
 * seed, and it is always labelled: the pilot restaurant asked for a visible
 * call-out, and an unlabelled bell is not a control guests reliably discover.
 *
 * A shadow is correct here. A FAB is one of the few things in the system that
 * genuinely floats, so it is an exception to "elevation is a tone change".
 *
 * `icon` is a node rather than a MingCute class because the shipping FAB draws
 * its own service-bell SVG — MingCute has no bell that reads as "call someone"
 * rather than "notification".
 *
 * The label is 14px on the seed. That is the same 3.11:1 exception a filled
 * button's label sits under, and it holds for the same reason: this is a
 * control label, not body copy. Keep it short enough to stay on one line.
 */
export interface FabProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  /** Rendered at 20px. Pass an `<i className="mgc_…" />` or an inline SVG. */
  icon: ReactNode;
  /** Omit for the icon-only 48px circle. */
  label?: string;
  className?: string;
}

export default function Fab({
  icon,
  label,
  className = "",
  type = "button",
  ...rest
}: FabProps) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center gap-xs rounded-full bg-primary text-on-primary text-xl shadow-lg font-display transition duration-100 ease-out hover:opacity-90 active:scale-[0.97] active:brightness-95 disabled:opacity-50 disabled:cursor-wait disabled:active:scale-100 ${
        label ? "h-12 px-md" : "w-12 h-12"
      } ${className}`}
      {...rest}
    >
      {icon}
      {label && (
        <span className="text-label-large font-semibold whitespace-nowrap">
          {label}
        </span>
      )}
    </button>
  );
}
