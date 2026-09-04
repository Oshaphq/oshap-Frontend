/**
 * The busy indicator.
 *
 * `.oshap-spinner` was raw CSS declared three times — once in each app's
 * `index.css` — alongside three copies of the `spin` keyframes, in a codebase
 * whose rule is that all styling is Tailwind utilities. Twenty-nine call sites
 * rendered it as `<div className="oshap-spinner" />`, an empty div with no
 * role and no text, so a screen reader was told nothing at all while a page
 * loaded.
 *
 * `role="status"` with a label fixes that. The label is visually hidden
 * because the spinning ring is the visible half.
 *
 * Prefer `Skeleton` wherever the shape of what is coming is already known. A
 * spinner says "wait"; a skeleton says "wait, and here is what for".
 */

const SIZE = {
  sm: "w-5 h-5 border-2",
  md: "w-10 h-10 border-[3px]",
  lg: "w-14 h-14 border-4",
} as const;

export interface SpinnerProps {
  size?: keyof typeof SIZE;
  /** Announced to assistive tech. Say what is loading, not that it is loading. */
  label?: string;
  className?: string;
}

export default function Spinner({
  size = "md",
  label = "Loading",
  className = "",
}: SpinnerProps) {
  return (
    <span role="status" className={`inline-flex ${className}`}>
      <span
        aria-hidden="true"
        className={`${SIZE[size]} rounded-full border-surface-container-high border-t-primary animate-spin motion-reduce:animate-none`}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
