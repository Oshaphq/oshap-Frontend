import { describe, it, expect, vi, afterEach } from "vitest";
import { whenVisible } from "./whenVisible";

const setVisibility = (state: "visible" | "hidden") =>
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });

afterEach(() => setVisibility("visible"));

/**
 * Staff keep the admin board in one tab and the guest app in another — often
 * the same person, testing. A toast that arrived while the board was hidden
 * used to spend its five seconds in the background and be gone before anyone
 * switched back, so the alerts looked dead when they were firing all along.
 */
describe("waiting until somebody is looking", () => {
  it("runs straight away when the tab is already visible", () => {
    setVisibility("visible");
    const run = vi.fn();
    whenVisible(run);
    expect(run).toHaveBeenCalledOnce();
  });

  it("waits while the tab is hidden", () => {
    setVisibility("hidden");
    const run = vi.fn();
    whenVisible(run);
    expect(run).not.toHaveBeenCalled();
  });

  it("runs on the switch back", () => {
    setVisibility("hidden");
    const run = vi.fn();
    whenVisible(run);

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(run).toHaveBeenCalledOnce();
  });

  it("ignores a change that is not to visible", () => {
    setVisibility("hidden");
    const run = vi.fn();
    whenVisible(run);

    // Some browsers fire this more than once while still hidden.
    document.dispatchEvent(new Event("visibilitychange"));
    expect(run).not.toHaveBeenCalled();
  });

  it("runs once, however many times the tab is switched", () => {
    setVisibility("hidden");
    const run = vi.fn();
    whenVisible(run);

    for (const state of ["visible", "hidden", "visible"] as const) {
      setVisibility(state);
      document.dispatchEvent(new Event("visibilitychange"));
    }
    expect(run).toHaveBeenCalledOnce();
  });

  it("can be cancelled before the tab comes back", () => {
    // The component unmounts; a pending alert must not fire into nothing.
    setVisibility("hidden");
    const run = vi.fn();
    const cancel = whenVisible(run);
    cancel();

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(run).not.toHaveBeenCalled();
  });

  it("cancelling after it has run is harmless", () => {
    setVisibility("visible");
    const run = vi.fn();
    expect(() => whenVisible(run)()).not.toThrow();
    expect(run).toHaveBeenCalledOnce();
  });
});
