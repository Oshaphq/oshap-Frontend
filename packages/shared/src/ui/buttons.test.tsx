import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PrimaryButton from "./PrimaryButton";
import SecondaryButton from "./SecondaryButton";
import TertiaryButton from "./TertiaryButton";

/**
 * These shipped with `active:scale-[0.99]` — a 1% shrink, half a pixel on a
 * 52px button. It was technically a press state and visibly nothing, which is
 * the worst of both: it looked handled in review and did not exist in use.
 *
 * The customer app runs on a phone, on restaurant wifi, and the button people
 * press hardest is "Place Order". With no feedback they press it again, so
 * this is about not taking two orders rather than about polish.
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
    // background allows: brightness over a solid fill, the next container step
    // over the ramp, the brand wash inside an outline.
    const html = render(el);
    const expected =
      name === "SecondaryButton"
        ? "active:bg-surface-container-highest"
        : name === "TertiaryButton"
          ? "active:bg-primary-10a"
          : "active:brightness-95";
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
