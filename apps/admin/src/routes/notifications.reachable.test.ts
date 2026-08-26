import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A confirmation nobody can open is worse than no feature: it compiles, it
 * type-checks, its tests pass, and it ships as a button that is simply absent.
 *
 * That happened here. The Clear confirmation panel went out with no control
 * that could set `confirmClear` to true, so the backlog it existed to clear
 * stayed put and the bell kept reading 9+.
 *
 * Source-level rather than a render test, because the failure was structural —
 * the JSX was never there at all.
 */
const src = readFileSync(
  resolve(process.cwd(), "apps/admin/src/routes/notifications.tsx"),
  "utf8",
);

describe("the Clear confirmation can actually be opened", () => {
  it("something sets confirmClear to true", () => {
    expect(src).toMatch(/setConfirmClear\(true\)/);
  });

  it("and something sets it back to false", () => {
    // Otherwise it opens once and traps the page.
    expect(src).toMatch(/setConfirmClear\(false\)/);
  });

  it("the panel it opens is still there", () => {
    expect(src).toContain("Yes, clear them");
  });

  it("the trigger is a real control, not a stray reference", () => {
    // `onClick={() => setConfirmClear(true)}` — a mention inside a comment or a
    // handler that is never wired would satisfy the first test alone.
    expect(src).toMatch(/onClick=\{\(\)\s*=>\s*setConfirmClear\(true\)\}/);
  });
});
