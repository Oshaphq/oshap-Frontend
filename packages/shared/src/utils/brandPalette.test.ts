import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Read rather than import: vitest stubs CSS imports to an empty module, `?raw`
 * included, so importing the token file would silently assert against "".
 * Both candidate paths are tried so the guard holds whether vitest starts at
 * the repo root or inside the workspace.
 */
function readTokensCss(): string {
  const candidates = [
    "packages/shared/src/tokens/tokens.css",
    "src/tokens/tokens.css",
  ];
  for (const rel of candidates) {
    try {
      return readFileSync(join(process.cwd(), rel), "utf8");
    } catch {
      // try the next root
    }
  }
  throw new Error(`tokens.css not found from ${process.cwd()}`);
}
import {
  brandCssVars,
  contrastRatio,
  deriveBrandPalette,
  parseHex,
} from "./brandPalette";

/**
 * The point of these tests is the sweep, not the examples.
 *
 * A restaurant can type any hex, and the failure mode is silent: the merchant
 * sees their colour in the settings screen and it looks fine to them, while a
 * guest holds a phone at a table and cannot read the button. So the guarantee
 * has to hold across the whole hue wheel rather than for the handful of
 * colours anyone thought to try.
 */

const AA_LARGE = 3;
const AA_BODY = 4.5;

/** Every 15° around the wheel, at three chroma levels and three lightnesses. */
function hueWheel(): string[] {
  const out: string[] = [];
  for (let hue = 0; hue < 360; hue += 15) {
    for (const sat of [45, 70, 100]) {
      for (const light of [35, 50, 65]) {
        out.push(hslToHex(hue, sat, light));
      }
    }
  }
  return out;
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) =>
    lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const part = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${part(f(0))}${part(f(8))}${part(f(4))}`;
}

describe("parsing a brand colour", () => {
  it("accepts the shapes a person actually types", () => {
    expect(parseHex("#FF5733")).not.toBeNull();
    expect(parseHex("ff5733")).not.toBeNull();
    expect(parseHex("  #F53  ")).not.toBeNull();
  });

  it("returns null for anything else rather than throwing", () => {
    // The field is nullable free text on the API, so this has to survive
    // whatever reaches it — a broken page is far worse than a default colour.
    for (const bad of ["", "   ", "red", "#12345", "#GGGGGG", "rgb(1,2,3)", null, undefined]) {
      expect(parseHex(bad as string)).toBeNull();
    }
  });

  it("refuses a grey, which has no brand in it to preserve", () => {
    expect(deriveBrandPalette("#888888")).toBeNull();
    expect(deriveBrandPalette("#ffffff")).toBeNull();
  });
});

describe("every brand colour produces readable text", () => {
  const seeds = hueWheel();

  it("covers the wheel", () => {
    expect(seeds.length).toBe(216);
  });

  it.each(["light", "dark"] as const)(
    "clears large-text contrast on the brand colour in %s mode",
    (mode) => {
      const failures: string[] = [];
      for (const seed of seeds) {
        const palette = deriveBrandPalette(seed);
        if (!palette) continue;
        const roles = palette[mode];
        const ratio = contrastRatio(roles.primary, roles.onPrimary);
        if (ratio < AA_LARGE) {
          failures.push(`${seed} -> ${roles.primary} / ${roles.onPrimary} = ${ratio.toFixed(2)}`);
        }
      }
      expect(failures).toEqual([]);
    },
  );

  it.each(["light", "dark"] as const)(
    "clears body-text contrast on the container in %s mode",
    (mode) => {
      const failures: string[] = [];
      for (const seed of seeds) {
        const palette = deriveBrandPalette(seed);
        if (!palette) continue;
        const roles = palette[mode];
        const ratio = contrastRatio(roles.primaryContainer, roles.onPrimaryContainer);
        if (ratio < AA_BODY) {
          failures.push(
            `${seed} -> ${roles.primaryContainer} / ${roles.onPrimaryContainer} = ${ratio.toFixed(2)}`,
          );
        }
      }
      expect(failures).toEqual([]);
    },
  );
});

describe("the colours that break a fixed choice", () => {
  // These are the ones that make hardcoding white or black indefensible:
  // measured against pure white, yellow is 1.40:1 and cyan is 1.54:1.
  const nasty = {
    yellow: "#ffd700",
    cyan: "#00e5ff",
    lime: "#ccff00",
    navy: "#1a237e",
    pink: "#ff4081",
    "oshap orange": "#f56500",
  };

  it.each(Object.entries(nasty))("handles %s", (_name, hex) => {
    const palette = deriveBrandPalette(hex)!;
    expect(palette).not.toBeNull();
    for (const mode of ["light", "dark"] as const) {
      const r = palette[mode];
      expect(contrastRatio(r.primary, r.onPrimary)).toBeGreaterThanOrEqual(AA_LARGE);
      expect(contrastRatio(r.primaryContainer, r.onPrimaryContainer)).toBeGreaterThanOrEqual(AA_BODY);
    }
  });

  it("puts dark text on a yellow rather than white", () => {
    // White on #ffd700 is 1.40:1. Getting this wrong is not a near miss.
    const { light } = deriveBrandPalette("#ffd700")!;
    expect(contrastRatio(light.primary, "#ffffff")).toBeLessThan(AA_LARGE);
    expect(contrastRatio(light.primary, light.onPrimary)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it("puts light text on a navy rather than black", () => {
    const { light } = deriveBrandPalette("#1a237e")!;
    expect(contrastRatio(light.primary, "#000000")).toBeLessThan(AA_LARGE);
    expect(contrastRatio(light.primary, light.onPrimary)).toBeGreaterThanOrEqual(AA_LARGE);
  });
});

describe("the brand stays recognisable", () => {
  it("keeps the colour identical in both modes", () => {
    // The existing tokens do this, and a restaurant's colour should not become
    // a different colour after dark.
    for (const seed of ["#d32f2f", "#2e7d32", "#1a237e", "#ffd700"]) {
      const p = deriveBrandPalette(seed)!;
      expect(p.dark.primary).toBe(p.light.primary);
      expect(p.dark.onPrimary).toBe(p.light.onPrimary);
    }
  });

  it("swaps only the container between modes", () => {
    const p = deriveBrandPalette("#d32f2f")!;
    expect(p.light.primaryContainer).not.toBe(p.dark.primaryContainer);
  });

  it("moves lightness, never hue", () => {
    // A yellow must still read as yellow after being deepened enough to carry
    // text — hue and chroma are what a restaurant recognises as their colour.
    const { light } = deriveBrandPalette("#ffd700")!;
    const [r, g, b] = parseHex(light.primary)!;
    expect(r).toBeGreaterThan(b);
    expect(g).toBeGreaterThan(b);
  });
});

describe("brandCssVars", () => {
  it("names the variables the token file actually reads", () => {
    // bg-primary resolves through --color-primary to --ds-primary, so
    // these names are the whole mechanism — a typo silently does nothing.
    const vars = brandCssVars(deriveBrandPalette("#d32f2f")!.light);
    // Five, not eight: v3 deleted the derived action fill and its two states.
    expect(Object.keys(vars).sort()).toEqual([
      "--ds-on-primary",
      "--ds-on-primary-container",
      "--ds-primary",
      "--ds-primary-container",
      "--ds-primary-label",
    ]);
  });

  /**
   * The v1 -> v2 rename broke exactly this and nothing caught it: the generator
   * kept writing `--ds-primary`, the token file had moved to
   * `--ds-primary`, and every tenant would have silently kept Oshap
   * orange. A dangling custom property is valid CSS, so only reading the token
   * file can tell.
   */
  it("writes only variables that tokens.css declares", () => {
    const declared = new Set(
      [...readTokensCss().matchAll(/^\s*(--ds-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]),
    );
    const written = Object.keys(brandCssVars(deriveBrandPalette("#d32f2f")!.light));

    expect(written.filter((name) => !declared.has(name))).toEqual([]);
  });

  it.each(["#d32f2f", "#1a237e", "#ffd700", "#00897b", "#f56500"])(
    "derives a label that clears 4.5:1 on the surface it sits on for %s",
    (seed) => {
      const { light, dark } = deriveBrandPalette(seed)!;
      // v3 surfaces are warm neutrals: N98 light, N6 dark.
      expect(contrastRatio("#fff8f5", light.primaryLabel)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio("#181210", dark.primaryLabel)).toBeGreaterThanOrEqual(4.5);
    },
  );
});
