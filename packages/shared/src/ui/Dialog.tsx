import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * The modal dialog.
 *
 * Twelve of these were hand-rolled, and the backdrop was character-identical
 * in all twelve. The panel was not: seven different max-widths (400, 420, 440,
 * 448, 520, 560, 640) and three different edges, two of which drew
 * `border-primary` — an orange outline announcing that those two dialogs were
 * special, which they are not.
 *
 * The title was split down the middle too. Half the dialogs set
 * `font-display text-title-medium font-semibold`; the other half set
 * `font-bold` and nothing else, so their heading fell back to the browser's
 * default `h3` size and belonged to no typography role in the system. The M3
 * role wins.
 *
 * The behaviour is the reason this exists. Across all twelve:
 *
 * - none set `aria-labelledby`, so no dialog announced its own title
 * - none locked body scroll, so the page slid around behind the modal
 * - one of twelve closed on Escape
 * - six had no `role="dialog"` or `aria-modal` at all
 * - none managed focus: none moved focus in, none trapped Tab, and none
 *   returned focus to whatever opened them
 *
 * That last one is why a keyboard user could tab straight out of an open
 * dialog into the page underneath and go on operating it, with the scrim
 * still drawn over the top.
 *
 * Mounted means open. Call sites already gate on their own `isOpen` state and
 * an `open` prop would just duplicate it.
 */

const SIZE = {
  sm: "max-w-[400px]",
  md: "max-w-[440px]",
  lg: "max-w-[560px]",
  xl: "max-w-[640px]",
} as const;

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Nested dialogs would each restore `overflow` on unmount and the inner one
 * would unlock the page while the outer is still open, so the lock counts.
 */
let lockCount = 0;

export interface DialogProps {
  onClose: () => void;
  /** Announced as the dialog's name via `aria-labelledby`. */
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Pinned below the scrolling body. Put the actions here. */
  footer?: ReactNode;
  size?: keyof typeof SIZE;
  /**
   * Cap the height and scroll the body, keeping header and footer in place.
   * For anything list-shaped, where the content length is not yours to know.
   */
  scrollable?: boolean;
  /** Extra classes for the scrolling body — a tighter `gap-s` for dense lists. */
  bodyClassName?: string;
  /** Hide the corner close button. The dialog still closes on Escape. */
  hideClose?: boolean;
  className?: string;
}

export default function Dialog({
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  scrollable = false,
  bodyClassName = "",
  hideClose = false,
  className = "",
}: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;

    if (lockCount === 0) document.body.style.overflow = "hidden";
    lockCount += 1;

    // Skip the corner close button: landing on "Close" first is a poor
    // opening move for a form. Falls back to the panel, which is what a
    // dialog with nothing to fill in should get anyway.
    const panel = panelRef.current;
    const items = panel
      ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      : [];
    const target = items.find((el) => !el.hasAttribute("data-dialog-close"));
    if (target) target.focus();
    else panel?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      // Focus can also be on the panel itself, which is not in `items`.
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      lockCount -= 1;
      if (lockCount === 0) document.body.style.overflow = "";
      opener?.focus?.();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-sm p-md"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${SIZE[size]} rounded-xl bg-surface-container-high border border-outline-variant shadow-xl flex flex-col ${
          scrollable ? "max-h-[85vh]" : "p-l gap-md"
        } ${className}`}
      >
        <header
          className={`flex items-start justify-between gap-md ${
            scrollable ? "p-l border-b border-outline-variant" : ""
          }`}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2
              id={titleId}
              className="font-display text-title-medium font-semibold text-on-surface"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-body-medium text-on-surface-variant">
                {subtitle}
              </p>
            )}
          </div>
          {!hideClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              data-dialog-close
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            >
              <i className="mgc_close_line" aria-hidden="true" />
            </button>
          )}
        </header>

        {scrollable ? (
          <div
            className={`flex-1 overflow-y-auto p-l flex flex-col gap-md ${bodyClassName}`}
          >
            {children}
          </div>
        ) : (
          children
        )}

        {footer && (
          <div
            className={`flex items-center justify-end gap-s ${
              scrollable ? "p-l border-t border-outline-variant" : "pt-s"
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
