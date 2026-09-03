/**
 * Minimal toast system. Module-level store so any component can emit
 * without provider drilling. Mount <Toaster /> once at the app root.
 *
 *   import { toast } from "@oshap/shared/ui";
 *   toast.error("Failed to verify payment");
 *   toast.success("Saved");
 *   toast.info("Just so you know…");
 *   toast.neutral("A waiter is on the way");
 */

/**
 * `neutral` is the M3 snackbar: `inverse-surface`, no status meaning. Use it to
 * confirm that something registered — "a waiter is on the way", "link copied" —
 * where the three status tones would overclaim. `success` says an operation
 * succeeded; a snackbar just says it happened.
 */
export type ToastVariant = "success" | "error" | "info" | "neutral";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
  /** MingCute class, overriding the variant's default glyph. */
  icon?: string;
}

export interface ToastOptions {
  durationMs?: number;
  /** MingCute class, overriding the variant's default glyph. */
  icon?: string;
}

/** A bare number is still accepted, so `toast.error(msg, 6000)` keeps working. */
type ToastArg = number | ToastOptions;

type Subscriber = (toasts: Toast[]) => void;
export type PushSubscriber = (toast: Toast) => void;

const DEFAULT_DURATION_MS = 4000;

let _toasts: Toast[] = [];
let _nextId = 1;
const _subscribers = new Set<Subscriber>();
const _pushSubscribers = new Set<PushSubscriber>();

function notify(): void {
  for (const fn of _subscribers) fn(_toasts);
}

function push(message: string, variant: ToastVariant, arg?: ToastArg): number {
  const opts: ToastOptions = typeof arg === "number" ? { durationMs: arg } : (arg ?? {});
  const id = _nextId++;
  const t: Toast = {
    id,
    message,
    variant,
    durationMs: opts.durationMs ?? DEFAULT_DURATION_MS,
    icon: opts.icon,
  };
  _toasts = [..._toasts, t];

  for (const fn of _pushSubscribers) fn(t);

  notify();
  if (typeof window !== "undefined" && t.durationMs > 0) {
    window.setTimeout(() => dismiss(id), t.durationMs);
  }
  return id;
}

export function dismiss(id: number): void {
  _toasts = _toasts.filter((t) => t.id !== id);
  notify();
}

export function subscribe(fn: Subscriber): () => void {
  _subscribers.add(fn);
  fn(_toasts);
  return () => {
    _subscribers.delete(fn);
  };
}

export function subscribeToPush(fn: PushSubscriber): () => void {
  _pushSubscribers.add(fn);
  return () => {
    _pushSubscribers.delete(fn);
  };
}

export const toast = {
  success(message: string, opts?: ToastArg) {
    return push(message, "success", opts);
  },
  error(message: string, opts?: ToastArg) {
    return push(message, "error", opts);
  },
  info(message: string, opts?: ToastArg) {
    return push(message, "info", opts);
  },
  neutral(message: string, opts?: ToastArg) {
    return push(message, "neutral", opts);
  },
};
