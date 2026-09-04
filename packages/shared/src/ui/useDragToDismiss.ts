import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

interface UseDragToDismissOptions {
  /** Distance in px past which a release will dismiss. Default 80. */
  threshold?: number;
  /** Velocity in px/ms past which a release dismisses even under threshold. Default 0.5. */
  velocityThreshold?: number;
}

interface UseDragToDismissResult {
  /** Attach to the sheet element (the one that should translate down). */
  sheetRef: RefObject<HTMLDivElement | null>;
  /** Spread onto the drag handle. Pointer events bubble up from here. */
  handleProps: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    style: { touchAction: "none" };
  };
  /** True while the user is actively dragging. */
  isDragging: boolean;
}

/**
 * Drag-to-dismiss for bottom sheets. Touch + mouse + pen via Pointer Events.
 *
 * Usage:
 *   const { sheetRef, handleProps } = useDragToDismiss(() => setOpen(false));
 *   <div ref={sheetRef} className="...sheet">
 *     <div {...handleProps} className="...handle">...</div>
 *     ...
 *   </div>
 *
 * The hook only listens on the handle, so scrollable content inside the sheet
 * keeps its native touch behaviour.
 */
export function useDragToDismiss(
  onDismiss: () => void,
  { threshold = 80, velocityThreshold = 0.5 }: UseDragToDismissOptions = {},
): UseDragToDismissResult {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const sheet = sheetRef.current;
      if (!sheet) return;

      // Only left mouse button or touch/pen
      if (e.button !== 0 && e.pointerType === "mouse") return;

      const startY = e.clientY;
      const startTime = Date.now();
      let lastY = startY;

      // Pause the mount slide-up animation and any prior transition so the
      // sheet tracks the finger 1:1.
      const prevAnimation = sheet.style.animation;
      const prevTransition = sheet.style.transition;
      sheet.style.animation = "none";
      sheet.style.transition = "none";

      setIsDragging(true);

      const onMove = (ev: PointerEvent) => {
        const dy = Math.max(0, ev.clientY - startY); // can't drag up past origin
        lastY = ev.clientY;
        sheet.style.transform = `translateY(${dy}px)`;
      };

      const finish = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        setIsDragging(false);

        const dy = Math.max(0, (ev?.clientY ?? lastY) - startY);
        const dt = Date.now() - startTime;
        const velocity = dy / Math.max(dt, 1);
        const shouldDismiss = dy > threshold || velocity > velocityThreshold;

        sheet.style.transition = "transform 200ms ease-out";

        if (shouldDismiss) {
          const h = sheet.offsetHeight;
          sheet.style.transform = `translateY(${h}px)`;
          window.setTimeout(() => {
            // Restore styles in case the parent keeps the node mounted.
            sheet.style.transform = "";
            sheet.style.transition = prevTransition;
            sheet.style.animation = prevAnimation;
            onDismiss();
          }, 200);
        } else {
          sheet.style.transform = "translateY(0)";
          window.setTimeout(() => {
            sheet.style.transform = "";
            sheet.style.transition = prevTransition;
            sheet.style.animation = prevAnimation;
          }, 200);
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    },
    [onDismiss, threshold, velocityThreshold],
  );

  return {
    sheetRef,
    handleProps: {
      onPointerDown,
      style: { touchAction: "none" },
    },
    isDragging,
  };
}
