import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PrimaryButton from "./PrimaryButton";
import SecondaryButton from "./SecondaryButton";
import TertiaryButton from "./TertiaryButton";
import Button from "./Button";

/**
 * These shipped with `active:scale-[0.99]` — a 1% shrink, half a pixel on a
 * 52px button. It was technically a press state and visibly nothing, which is
 * the worst of both: it looked handled in review and did not exist in use.
 *
 * The customer app runs on a phone, on restaurant wifi, and the button people
 * press hardest is "Place Order". With no feedback they press it again, so this
 * is about not taking two orders rather than about polish.
 */

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

const buttons = [
  ["PrimaryButton", <PrimaryButton key="p">Go</PrimaryButton>],
  ["SecondaryButton", <SecondaryButton key="s">Go</SecondaryButton>],
  ["TertiaryButton", <TertiaryButton key="t">Go</TertiaryButton>],
] as const;

describe("every shared button reacts to being pressed", () => {
  it.each(buttons)("%s shrinks enough to see", (_name, el) => {
    const html = render(el);
    expect(html).toContain("active:scale-[0.97]");
    // The shrink that started this: anything at 0.99 is not a press state.
    expect(html).not.toContain("scale-[0.99]");
  });

  it.each(buttons)("%s changes surface as well as size", (name, el) => {
    // Scale alone reads as a wobble. Each button darkens in the way its own
    // background allows: brightness over a solid fill, an M3 state layer inside
    // an outline.
    const html = render(el);
    const expected =
      name === "TertiaryButton" ? "active:bg-primary/12" : "active:brightness-90";
    expect(html).toContain(expected);
  });

  it.each(buttons)("%s can animate the press it declares", (_name, el) => {
    // `transition-opacity` was the old value, and it silently dropped every
    // part of the press that was not opacity.
    const html = render(el);
    expect(html).not.toContain("transition-opacity");
    expect(html).toMatch(/class="[^"]*\btransition\b/);
  });
});

describe("a disabled button does not pretend to work", () => {
  it.each(buttons)("%s neutralises its press when disabled", (_name, el) => {
    const html = renderToStaticMarkup(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { ...el, props: { ...(el as any).props, disabled: true } } as React.ReactElement,
    );
    expect(html).toContain("disabled");
    expect(html).toContain("disabled:active:scale-100");
    expect(html).toContain("disabled:cursor-not-allowed");
  });
});

/**
 * The v2 rule that is easiest to undo by accident. White on the brand #f56500
 * is 3.11:1 — WCAG's non-text bar, not its text bar — so a *labelled* button
 * fills with `primary-action` #c24e00 at 4.79:1 instead. An icon-only button
 * may still take the brand, because a glyph is a UI component.
 */
describe("a filled button never puts a white label on the brand fill", () => {
  it.each(["sm", "md", "lg"] as const)("%s fills with primary-action", (size) => {
    const html = renderToStaticMarkup(
      <Button variant="filled" size={size}>
        Place Order
      </Button>,
    );
    expect(html).toContain("bg-primary-action");
    // `bg-primary` is the pinned brand, and would be 3.11:1 under this label.
    expect(html).not.toMatch(/\bbg-primary\b(?!-action)/);
  });
});

describe("the emphasis ladder keeps its heights", () => {
  it.each([
    ["sm", "h-8"],
    ["md", "h-10"],
    ["lg", "h-12"],
  ] as const)("%s is %s", (size, height) => {
    const html = renderToStaticMarkup(<Button size={size}>Go</Button>);
    expect(html).toContain(height);
  });

  it("keeps buttons at the 8px sm radius rather than M3's pill", () => {
    const html = renderToStaticMarkup(<Button>Go</Button>);
    expect(html).toContain("rounded-sm");
    expect(html).not.toContain("rounded-full");
  });
});
