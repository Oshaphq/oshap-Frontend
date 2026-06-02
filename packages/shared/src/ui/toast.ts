/**
 * Minimal toast system. Module-level store so any component can emit
 * without provider drilling. Mount <Toaster /> once at the app root.
 *
 *   import { toast } from "@oshap/shared/ui";
 *   toast.error("Failed to verify payment");
 *   toast.success("Saved");
 *   toast.info("Just so you know…");
 */

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

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

function push(message: string, variant: ToastVariant, durationMs?: number): number {
  const id = _nextId++;
  const t: Toast = {
    id,
    message,
    variant,
    durationMs: durationMs ?? DEFAULT_DURATION_MS,
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
  success(message: string, durationMs?: number) {
    return push(message, "success", durationMs);
  },
  error(message: string, durationMs?: number) {
    return push(message, "error", durationMs);
  },
  info(message: string, durationMs?: number) {
    return push(message, "info", durationMs);
  },
};
