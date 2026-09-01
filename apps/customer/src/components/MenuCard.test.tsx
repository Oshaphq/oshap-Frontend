import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MenuItem } from "@oshap/shared";
import { CartProvider } from "../context/CartContext";
import MenuCard from "./MenuCard";

/**
 * The card is the densest surface in the guest app: a name, a description, a
 * price, a stock warning and two different tap targets inside about 128px of
 * height. The rules that keep it readable are the ones easiest to undo by
 * accident, so they are asserted rather than described.
 */

const BASE: MenuItem = {
  id: "m1",
  category_id: "c1",
  name: "Chicken Shawarma",
  description: "Grilled chicken wrap with garlic sauce, pickles and fries",
  price: 250000,
  image_url: null,
  available: true,
  sort_order: 0,
  modifier_groups: [],
} as unknown as MenuItem;

const item = (over: Partial<MenuItem> = {}): MenuItem => ({ ...BASE, ...over });

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.sessionStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function mount(menuItem: MenuItem) {
  act(() => {
    root.render(
      <CartProvider tableId="T1">
        <MenuCard item={menuItem} />
      </CartProvider>,
    );
  });
}

const byLabel = (label: string) =>
  host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);

/**
 * React tracks a controlled input's value on the node, and a plain
 * `el.value = x` slips past that tracker — the assignment lands but `onChange`
 * never fires, so the component never sees it. Going through the prototype
 * setter is what makes React notice.
 */
const type = (el: HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

const click = (el: Element | null) => {
  expect(el).not.toBeNull();
  act(() => {
    el!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

describe("what the card is allowed to hide", () => {
  it("gives the name two lines and clamps there", () => {
    mount(item());
    const title = host.querySelector("h3")!;
    // Two lines, not one: the name is what a guest scans by. Not three: the
    // price and ADD would leave the card.
    expect(title.className).toContain("line-clamp-2");
  });

  it("clamps the description to a single line", () => {
    mount(item());
    const description = host.querySelector("p")!;
    expect(description.className).toContain("line-clamp-1");
    // The full text is still in the DOM — the clamp is visual, so the sheet and
    // assistive tech both still have it.
    expect(description.textContent).toBe(BASE.description);
  });

  it("falls back to an icon when the dish has no photo", () => {
    mount(item({ image_url: null }));
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector(".mgc_fork_spoon_line")).not.toBeNull();
  });
});

describe("tapping the card body", () => {
  it("opens the detail sheet for a plain dish rather than adding it", () => {
    mount(item());
    click(byLabel("View Chicken Shawarma"));

    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    // Opening is not ordering.
    expect(byLabel("Decrease Chicken Shawarma quantity")).toBeNull();
  });

  it("still opens for a sold-out dish, so the guest can read what it was", () => {
    mount(item({ stock_count: 0 } as Partial<MenuItem>));

    expect(host.textContent).toContain("Unavailable");
    click(byLabel("View Chicken Shawarma"));

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    // Everything shown, nothing addable.
    expect(dialog!.textContent).toContain("Sold out");
  });

  it("is a sibling of the controls, never their ancestor", () => {
    // A wrapper button would nest ADD inside a button: invalid HTML, and both
    // screen readers and Enter/Space handling get it wrong.
    mount(item());
    const body = byLabel("View Chicken Shawarma")!;
    expect(body.querySelector("button")).toBeNull();
    expect(byLabel("Add Chicken Shawarma to cart")).not.toBeNull();
  });
});

describe("tapping ADD", () => {
  it("adds a plain dish straight to the cart and swaps in the stepper", () => {
    mount(item());
    click(byLabel("Add Chicken Shawarma to cart"));

    // No sheet: a dish with nothing to choose has nothing to ask.
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(byLabel("Add Chicken Shawarma to cart")).toBeNull();
    expect(byLabel("Increase Chicken Shawarma quantity")).not.toBeNull();
    expect(byLabel("Decrease Chicken Shawarma quantity")).not.toBeNull();
  });

  it("routes a dish with choices through the sheet instead", () => {
    mount(
      item({
        modifier_groups: [
          {
            id: "g1",
            name: "Size",
            required: true,
            min: 1,
            max: 1,
            sort_order: 0,
            options: [
              { id: "o1", name: "Regular", price_delta: 0, available: true, sort_order: 0 },
            ],
          },
        ],
      } as Partial<MenuItem>),
    );

    click(byLabel("Choose options for Chicken Shawarma"));

    // A bare "+1" cannot say which variant to add, so it must ask first.
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host.textContent).toContain("Choices available");
  });
});

describe("stock", () => {
  it("warns with the number left rather than a bare refusal", () => {
    mount(item({ stock_count: 2, low_stock_threshold: 3 } as Partial<MenuItem>));
    expect(host.textContent).toContain("Only 2 left");
  });

  it("stops the stepper at what is left", () => {
    mount(item({ stock_count: 1 } as Partial<MenuItem>));
    click(byLabel("Add Chicken Shawarma to cart"));

    const increase = byLabel("Increase Chicken Shawarma quantity")!;
    expect(increase.disabled).toBe(true);
    expect(increase.title).toContain("Only 1 left");
  });
});

/**
 * Measured off the Figma extract of `Property1=chickenShawarma` (2186:409),
 * whose own arithmetic is exact: Top 40 + gap 7.65 + Footer 31.31 = 79.31, and
 * that column sits inside a 96px image row. Three separate rules have to hold
 * for the card to look like the design, and each fails silently on its own.
 */
describe("card geometry", () => {
  it("centres the text column against the image instead of stretching it", () => {
    mount(item());
    const card = host.querySelector("article")!;
    // The column is 79.31 tall against 96px of image. Stretching it and then
    // spreading the contents makes the gap a function of the image height.
    expect(card.className).toContain("items-center");
    expect(card.className).toContain("gap-md");
    expect(card.className).toContain("p-md");
  });

  it("spaces the column with a fixed gap, never space-between", () => {
    mount(item());
    const column = host.querySelector("article > div:nth-of-type(2)")!;
    expect(column.className).toContain("gap-s");
    expect(column.className).not.toContain("justify-between");
  });

  it("sits the price on the button's bottom edge", () => {
    mount(item());
    const footer = host.querySelector("article > div:nth-of-type(2) > div:nth-of-type(2)")!;
    expect(footer.className).toContain("items-end");
    expect(footer.className).not.toContain("items-center");
  });

  it("keeps the name and description four pixels apart", () => {
    mount(item());
    const top = host.querySelector("article > div:nth-of-type(2) > div:nth-of-type(1)")!;
    expect(top.className).toContain("gap-xs");
  });

  it("holds the thumbnail at 96 square", () => {
    mount(item());
    const thumb = host.querySelector("article > div:nth-of-type(1)")!;
    expect(thumb.className).toContain("w-24");
    expect(thumb.className).toContain("h-24");
    expect(thumb.className).toContain("shrink-0");
  });
});

describe("the notes field in the detail sheet", () => {
  it("is one row tall, so the placeholder sits on the centre line", () => {
    mount(item());
    click(byLabel("View Chicken Shawarma"));

    const notes = host.querySelector<HTMLTextAreaElement>("#oshap-item-notes")!;
    // A two-row box parks the placeholder against the top edge, where it reads
    // as a misaligned label rather than a prompt.
    expect(notes.rows).toBe(1);
    // 16px either side of a 20px line — a 54px field, over the 48px touch
    // minimum, with the line centred whether it holds placeholder or text.
    expect(notes.className).toContain("py-md");
    expect(notes.className).not.toContain("py-s");
    // DS assigns `sm` to buttons and text fields; `lg` is the card radius.
    expect(notes.className).toContain("rounded-sm");
    // `outline: none` is forbidden outright — it removes the focus ring.
    expect(notes.className).not.toContain("outline-none");
    // text-outline measures 3.65:1 on this container and fails AA.
    expect(notes.className).toContain("placeholder:text-on-surface-variant");
    // It grows instead of scrolling, so centring never costs the guest text.
    expect(notes.className).toContain("overflow-hidden");
    expect(notes.className).toContain("resize-none");
  });

  it("grows to fit what is typed rather than scrolling", () => {
    mount(item());
    click(byLabel("View Chicken Shawarma"));

    const notes = host.querySelector<HTMLTextAreaElement>("#oshap-item-notes")!;
    act(() => {
      type(notes, "no onions please, and extra yaji on the side if you have it");
    });

    expect(notes.value).toContain("no onions");
    // jsdom reports scrollHeight as 0, so the height it lands on is not
    // meaningful here; what matters is that the handler ran and set one.
    expect(notes.style.height).not.toBe("");
  });
});

/**
 * The sheet's accessible name is a contract, not a detail: `order-flow.e2e.ts`
 * finds it with `getByRole("dialog", { name: /Choose options/i })` in five
 * tests. Flattening it to the dish name broke all five, and nothing in the unit
 * suite noticed — so both branches are pinned here.
 */
describe("what the detail sheet calls itself", () => {
  const withChoices = () =>
    item({
      modifier_groups: [
        {
          id: "g1",
          name: "Size",
          required: true,
          min: 1,
          max: 1,
          sort_order: 0,
          options: [
            { id: "o1", name: "Large", price_delta: 0, available: true, sort_order: 0 },
          ],
        },
      ],
    } as Partial<MenuItem>);

  it("names itself for the choosing when there is something to choose", () => {
    mount(withChoices());
    click(byLabel("Choose options for Chicken Shawarma"));

    const dialog = host.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-label")).toBe(
      "Choose options for Chicken Shawarma",
    );
  });

  it("names itself for the dish when there is not", () => {
    mount(item());
    click(byLabel("View Chicken Shawarma"));

    const dialog = host.querySelector('[role="dialog"]')!;
    // "Choose options" would misdescribe a sheet with no options in it.
    expect(dialog.getAttribute("aria-label")).toBe("Chicken Shawarma");
  });
});
