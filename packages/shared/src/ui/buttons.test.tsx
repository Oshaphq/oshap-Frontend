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
 * The v3 rule that is easiest to undo by accident.
 *
 * v3 deletes the derived interface fill: `filled` uses the seed #F56500, where
 * white measures 3.11:1 — AA for large text and UI components, NOT for body
 * copy. The whole exception rests on the label never dropping below large-text
 * size, so that is asserted at every height rather than trusted to call sites.
 */
describe("a filled button keeps its label at large-text size", () => {
  it.each(["sm", "md", "lg"] as const)("%s pins the label to 16px", (size) => {
    const html = renderToStaticMarkup(
      <Button variant="filled" size={size}>
        Place Order
      </Button>,
    );
    expect(html).toContain("bg-primary");
    expect(html).toContain("text-[16px]");
    // 13px or 14px white-on-seed is the failure this rule exists to prevent.
    expect(html).not.toContain("text-[13px]");
    expect(html).not.toContain("text-label-large");
  });

  it("lets the other variants drop to 14px, since none sits on the seed", () => {
    const html = renderToStaticMarkup(
      <Button variant="outlined" size="md">
        Edit table
      </Button>,
    );
    expect(html).toContain("text-label-large");
    expect(html).not.toContain("text-[16px]");
  });

  it("puts tonal on the primary container, not secondary", () => {
    // v2 used secondary-container here. In v3 secondary is a muted brown for
    // weight, and the tonal button is P90/P10.
    const html = renderToStaticMarkup(<Button variant="tonal">Add to order</Button>);
    expect(html).toContain("bg-primary-container");
    expect(html).not.toContain("bg-secondary-container");
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
