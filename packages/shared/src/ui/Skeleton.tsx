/**
 * A placeholder in the shape of the thing that is coming.
 *
 * Net-new: the product had none. Every one of the twenty-nine loading states
 * was a spinner, including the ones on screens whose layout is fixed and
 * known before the request returns — the menu is always a column of dish
 * cards, the kitchen is always a grid of tickets. On those screens a spinner
 * throws the layout away and then rebuilds it, which is the jump a guest sees
 * as the page "loading twice".
 *
 * `surface-container-high` on `surface-container-low` is a one-step tone
 * difference, which is enough to read as absent content without pretending to
 * be content. The pulse respects `prefers-reduced-motion`.
 *
 * A block of these is one `role="status"`, not one per bar — thirty
 * announcements of "loading" is worse than none. Wrap a group in
 * `SkeletonGroup` and give it a label.
 */

const RADIUS = {
  text: "rounded-xs",
  block: "rounded-sm",
  card: "rounded-lg",
  circle: "rounded-full",
} as const;

export interface SkeletonProps {
  /** Tailwind width, e.g. `w-full`, `w-24`. */
  width?: string;
  /** Tailwind height, e.g. `h-4`, `h-16`. */
  height?: string;
  shape?: keyof typeof RADIUS;
  className?: string;
}

export function Skeleton({
  width = "w-full",
  height = "h-4",
  shape = "text",
  className = "",
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`block bg-surface-container-high animate-pulse motion-reduce:animate-none ${RADIUS[shape]} ${width} ${height} ${className}`}
    />
  );
}

export interface SkeletonGroupProps {
  /** Say what is loading. One announcement for the whole block. */
  label: string;
  children: React.ReactNode;
  className?: string;
}

/** One `role="status"` around a whole placeholder block. */
export function SkeletonGroup({
  label,
  children,
  className = "",
}: SkeletonGroupProps) {
  return (
    <div role="status" aria-label={label} className={className}>
      {children}
    </div>
  );
}

export default Skeleton;
