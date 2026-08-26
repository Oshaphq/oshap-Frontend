/**
 * Runs something once the page is actually being looked at.
 *
 * Staff keep the admin board in one tab and the guest app in another. Work that
 * measures out a few seconds of a person's attention — a toast that dismisses
 * itself — must not spend those seconds against a hidden tab, or it is over
 * before anyone switches back.
 *
 * Returns a cancel function. Calling it detaches the listener; if the callback
 * has already run, it does nothing.
 */
export function whenVisible(run: () => void): () => void {
  if (typeof document === "undefined") {
    run();
    return () => {};
  }

  if (document.visibilityState === "visible") {
    run();
    return () => {};
  }

  const onChange = () => {
    if (document.visibilityState !== "visible") return;
    document.removeEventListener("visibilitychange", onChange);
    run();
  };

  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
