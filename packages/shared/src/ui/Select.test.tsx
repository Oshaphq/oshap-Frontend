import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Select from "./Select";

/**
 * The bug this guards against shipped four times, in four files, because the
 * fix was a two-part idiom nobody could see was missing.
 *
 * A native `<select>` has its chevron painted by the browser at the inside edge
 * of the border. `padding-right` does not move it. So `px-md` gives 16px of
 * inset on the left and none on the right — the text is inset, the arrow is
 * flush, and it reads as broken because it is lopsided. The only fix is
 * `appearance-none` plus an icon positioned at the same inset as the text.
 *
 * Both halves have to be present together, which is exactly the kind of thing
 * that gets half-copied into the next file.
 */

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

/** Left text inset paired with the chevron inset it has to match. */
const densities = [
  ["md", "pl-md", "right-md"],
  ["sm", "pl-s", "right-s"],
] as const;

describe("Select draws its own chevron", () => {
  it("suppresses the native one", () => {
    // Without this the browser paints its arrow regardless of what we position
    // ourselves, and the result is two chevrons or one flush against the edge.
    expect(render(<Select />)).toContain("appearance-none");
  });

  it("renders a chevron that cannot be clicked or read aloud", () => {
    const html = render(<Select />);
    expect(html).toContain("mgc_down_line");
    // It sits on top of the control, so without this it swallows the click
    // that should open the menu.
    expect(html).toContain("pointer-events-none");
    expect(html).toContain("aria-hidden");
  });

  it.each(densities)(
    "density %s insets the chevron by the same amount as the text",
    (density, expectedLeft, expectedIconInset) => {
      const html = render(<Select density={density} />);
      expect(html).toContain(expectedLeft);
      expect(html).toContain(expectedIconInset);
    },
  );

  it("leaves clearance so a long label never slides under the chevron", () => {
    // Clearance, not the visual gap — the gap is the `right-*` above.
    expect(render(<Select density="md" />)).toContain("pr-10");
    expect(render(<Select density="sm" />)).toContain("pr-xl");
  });

  it("passes options and select attributes through", () => {
    const html = render(
      <Select aria-label="Reason" defaultValue="b">
        <option value="a">Delivery</option>
        <option value="b">Wastage</option>
      </Select>,
    );
    expect(html).toContain('aria-label="Reason"');
    expect(html).toContain("Delivery");
    expect(html).toContain("Wastage");
  });

  it("puts layout on the wrapper, not the field", () => {
    // Width belongs to the thing the parent lays out. Putting it on the select
    // would size the field inside a wrapper that had already collapsed.
    const html = render(<Select wrapperClassName="max-w-[160px]" />);
    expect(html).toMatch(/<div class="[^"]*max-w-\[160px\][^"]*"/);
  });
});
