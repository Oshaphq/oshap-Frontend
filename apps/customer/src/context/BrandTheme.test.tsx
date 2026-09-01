import { describe, it, expect, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandTheme } from "./BrandTheme";

/**
 * The restaurant's colour reached the guest's phone for months and was thrown
 * away, because `Restaurant` never declared the field. These tests are less
 * about the CSS than about the three states that decide whether a guest sees
 * the right thing: branded, unbranded, and still loading.
 */

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("a restaurant with a brand colour", () => {
  it("overrides the token the utilities actually read", () => {
    // `bg-primary` resolves through `--color-primary` to `--ds-brand-primary`.
    // If the name is wrong nothing breaks visibly — it just silently stays
    // orange, which is how the v1 name survived the v2 rename unnoticed.
    const html = render(
      <BrandTheme tableId="T1" primaryColor="#1a237e">
        <span>menu</span>
      </BrandTheme>,
    );
    expect(html).toContain("--ds-brand-primary:");
    expect(html).toContain("--ds-on-primary:");
    expect(html).toContain("--ds-primary-container:");
    // The interface fill is the role a filled button actually paints with, so a
    // tenant that rebrands only the identity colour would still ship Oshap
    // orange buttons.
    expect(html).toContain("--ds-primary-action:");
    expect(html).toContain("--ds-primary-label:");
    expect(html).toContain("data-brand");
  });

  it("emits both modes, because guests will be in both", () => {
    const html = render(
      <BrandTheme tableId="T1" primaryColor="#1a237e">
        <span>menu</span>
      </BrandTheme>,
    );
    expect(html).toContain("[data-brand]");
    expect(html).toContain('[data-theme="dark"]');
  });

  it("never keys off the OS preference", () => {
    // It used to, guarded on `:not([data-theme="light"])` — but light mode
    // *removes* the attribute rather than setting it to "light". So a guest on
    // a dark phone who switched the app to light got dark brand colours over
    // light surfaces, which is the contrast failure the palette derivation
    // exists to prevent. `data-theme` is the single source of truth.
    const html = render(
      <BrandTheme tableId="T1" primaryColor="#1a237e">
        <span>menu</span>
      </BrandTheme>,
    );
    expect(html).not.toContain("prefers-color-scheme");
  });
});

describe("a restaurant without a usable one", () => {
  it.each([null, "", "not a colour", "#GGGGGG", "#888888"])(
    "falls back silently for %o",
    (value) => {
      // Grey is included deliberately: it parses, but there is no brand in it
      // to preserve, and a "branded" grey app is worse than the default.
      const html = render(
        <BrandTheme tableId="T1" primaryColor={value}>
          <span>menu</span>
        </BrandTheme>,
      );
      expect(html).not.toContain("--ds-brand-primary:");
      expect(html).toContain("menu");
    },
  );

  it("still renders the menu, which is the thing that matters", () => {
    const html = render(
      <BrandTheme tableId="T1" primaryColor="garbage">
        <span>Jollof rice</span>
      </BrandTheme>,
    );
    expect(html).toContain("Jollof rice");
  });
});

describe("while the table is still loading", () => {
  it("uses the last known brand rather than flashing to default and back", () => {
    // The colour arrives with the table fetch. Without the cache, a returning
    // guest watches the app change colour on every navigation, which reads as
    // a glitch rather than a load.
    render(
      <BrandTheme tableId="T4" primaryColor="#d32f2f">
        <span>menu</span>
      </BrandTheme>,
    );
    // The provider writes the cache in an effect, which does not run during a
    // static render — so seed it the way a previous visit would have.
    const seeded = window.sessionStorage.getItem("oshap-brand-T4");
    expect(seeded).toBeNull();

    window.sessionStorage.setItem(
      "oshap-brand-T4",
      JSON.stringify({
        light: {
          primary: "#cf3634",
          onPrimary: "#fffbfa",
          primaryContainer: "#ffe0dc",
          onPrimaryContainer: "#80060f",
          primaryAction: "#a81f1e",
          primaryActionHover: "#8c1616",
          primaryActionPressed: "#710f10",
          primaryLabel: "#a81f1e",
        },
        dark: {
          primary: "#cf3634",
          onPrimary: "#fffbfa",
          primaryContainer: "#420104",
          onPrimaryContainer: "#fed2cd",
          primaryAction: "#a81f1e",
          primaryActionHover: "#8c1616",
          primaryActionPressed: "#710f10",
          primaryLabel: "#ff9d92",
        },
      }),
    );

    const loading = render(
      <BrandTheme tableId="T4" primaryColor={undefined}>
        <span>menu</span>
      </BrandTheme>,
    );
    expect(loading).toContain("#cf3634");
  });

  it("shows nothing branded when there is no cache to fall back on", () => {
    const html = render(
      <BrandTheme tableId="T9" primaryColor={undefined}>
        <span>menu</span>
      </BrandTheme>,
    );
    expect(html).not.toContain("--ds-brand-primary:");
  });

  it("keeps each table's brand separate", () => {
    // One device can scan codes in two restaurants. Sharing a cache key would
    // paint one venue in another's colour.
    window.sessionStorage.setItem("oshap-brand-T1", JSON.stringify({ light: {}, dark: {} }));
    const other = render(
      <BrandTheme tableId="T2" primaryColor={undefined}>
        <span>menu</span>
      </BrandTheme>,
    );
    expect(other).not.toContain("--ds-brand-primary:");
  });
});
