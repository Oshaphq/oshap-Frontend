import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDragToDismiss } from "./useDragToDismiss";

/**
 * The bottom sheet.
 *
 * Four of these were hand-rolled and the panel was near-identical in all four
 * — same fill, same radius, same shadow, same slide-up, differing only in
 * `max-h`, which was 80vh three times and 88vh once. The drag handle, its
 * grab cursor and its 40×4 bar were pasted out four times too.
 *
 * What differed was the part nobody can see. All four set `role="dialog"`, and
 * then:
 *
 * - none set `aria-modal`, so a screen reader was free to wander the menu
 *   behind the open sheet
 * - none set `aria-labelledby`; two named themselves with `aria-label`, which
 *   duplicates a heading already on screen
 * - none closed on Escape
 * - one of four locked body scroll, so on the other three the page scrolled
 *   under the sheet while the sheet scrolled too
 * - one of four portalled; the rest rendered inline, inheriting whatever
 *   stacking context their parent happened to sit in
 *
 * `useDragToDismiss` moved here with it. It lived in `apps/customer/src/hooks`
 * and all four consumers are now this component, so the sheet owns the drag
 * and no call site has to remember to wire a handle to a ref.
 *
 * Mounted means open, as with Dialog.
 */

/** Matches Dialog's, so a sheet opened over a dialog does not unlock the page. */
let lockCount = 0;

export interface SheetProps {
  onClose: () => void;
  /** Announced as the sheet's name via `aria-labelledby`. */
  title: ReactNode;
  /**
   * Replaces the default title row — for a sheet whose head is a whole block
   * rather than a line, like a dish with its image and price. Pass `label`
   * alongside it: with no rendered `<h2>` to point at, the name comes from
   * `aria-label` instead.
   */
  header?: ReactNode;
  /** Overrides the accessible name. Required when `header` is used. */
  label?: string;
  /** Actions pinned below the scrolling body. */
  footer?: ReactNode;
  children: ReactNode;
  /** Tailwind max-height for the panel. `max-h-[80vh]` unless a sheet is unusually tall. */
  maxHeight?: string;
  /** Extra classes for the scrolling body. */
  bodyClassName?: string;
  className?: string;
}

export default function Sheet({
  onClose,
  title,
  header,
  label,
  footer,
  children,
  maxHeight = "max-h-[80vh]",
  bodyClassName = "",
  className = "",
}: SheetProps) {
  const titleId = useId();
  const { sheetRef, handleProps } = useDragToDismiss(onClose);

  useEffect(() => {
    if (lockCount === 0) document.body.style.overflow = "hidden";
    lockCount += 1;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      lockCount -= 1;
      if (lockCount === 0) document.body.style.overflow = "";
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-scrim z-[90] animate-[fade-in_0.2s_ease]"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={label ? undefined : titleId}
        aria-label={label}
        className={`fixed left-0 right-0 bottom-0 ${maxHeight} bg-surface-container-low rounded-t-xl z-[100] flex flex-col shadow-[0_-4px_24px_var(--ds-shadow)] animate-[slide-up-drawer_0.3s_ease] will-change-transform ${className}`}
      >
        {/* The grab target is the handle alone, so content inside the sheet
            keeps its native scrolling. */}
        <div
          {...handleProps}
          className="flex justify-center py-s cursor-grab active:cursor-grabbing shrink-0"
        >
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>

        <header className="flex items-start justify-between gap-s px-md pb-md border-b border-outline-variant shrink-0">
          {header ?? (
            <h2
              id={titleId}
              className="font-display text-title-large font-semibold text-on-surface min-w-0 truncate self-center"
            >
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <i className="mgc_close_line text-xl" aria-hidden="true" />
          </button>
        </header>

        <div className={`flex-1 overflow-y-auto p-md ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className="shrink-0 p-md border-t border-outline-variant pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
