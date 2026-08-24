import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The parts of a form control the browser draws itself — a date field's text
 * and calendar icon, its dropdown panel, scrollbars, spin buttons — ignore CSS
 * variables entirely. They follow `color-scheme`, and with none declared they
 * follow the operating system.
 *
 * That is why the date pickers on analytics, history and the Z-report stayed
 * dark on a dark machine even with the app switched to light. Two declarations
 * fix every native control in all three apps at once, which is also what makes
 * them easy to delete without noticing.
 *
 * Lives here rather than beside the stylesheet because the shared package has
 * no Node types, and Vite's `?raw` import is stubbed under vitest.
 */
const css = readFileSync(
  resolve(process.cwd(), "packages/shared/src/tokens/tokens.css"),
  "utf8",
);

describe("native controls are told which theme they are in", () => {
  const block = (selector: string) => {
    const start = css.indexOf(selector + " {");
    expect(start, `${selector} block not found`).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf("\n}", start));
  };

  it("light is declared on the root", () => {
    expect(block(":root")).toMatch(/color-scheme:\s*light/);
  });

  it("dark is declared alongside the dark tokens", () => {
    expect(block('[data-theme="dark"]')).toMatch(/color-scheme:\s*dark/);
  });

  it("declares it for both, not just one", () => {
    // Only one would leave the other theme borrowing the OS again — and it
    // would look correct to whoever's machine happens to match.
    expect(css.match(/color-scheme:\s*(light|dark)/g) ?? []).toHaveLength(2);
  });
});
