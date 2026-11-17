import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TextField from "./TextField";

describe("a field in error says so without colour", () => {
  it("puts an alert glyph before the message", () => {
    // Red alone is invisible to someone who cannot tell it apart. The glyph
    // carries "this is an error"; the words carry what went wrong.
    const html = renderToStaticMarkup(
      <TextField label="Phone number" error="Enter a valid phone number" />,
    );
    expect(html).toContain("mgc_alert_line");
    expect(html).toContain("Enter a valid phone number");
    expect(html).toMatch(/aria-hidden="true"/);
  });

  it("keeps the hint plain when there is no error", () => {
    const html = renderToStaticMarkup(
      <TextField label="Phone number" hint="We text your receipt here" />,
    );
    expect(html).not.toContain("mgc_alert_line");
  });
});
