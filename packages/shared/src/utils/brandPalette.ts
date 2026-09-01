/**
 * Turning one brand colour into a token set a guest can actually read.
 *
 * A restaurant gives us a single hex. Everything the customer app needs —
 * the colour itself, the text that sits on it, the tinted container and the
 * text on *that* — has to be derived, and every pair has to clear a contrast
 * threshold or a guest ends up squinting at a menu in daylight.
 *
 * The trap this exists to avoid: there is no fixed text colour that works.
 * White on a brand yellow measures 1.40:1 and is effectively invisible; white
 * on a brand navy measures 13.24:1. The right answer inverts across the hue
 * wheel, so anything hardcoded is wrong for roughly half of all brands — and
 * the merchant is never the one who finds out. Their guests are.
 *
 * The method is: derive perceptually in OKLCH, then verify numerically with
 * WCAG relative luminance, because the two disagree and only the second one
 * governs whether text can be read.
 */

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/**
 * WCAG AA for large or bold text. This is the bar for text on the brand colour
 * itself, and it is legitimate rather than a compromise: the brand colour is
 * only ever used behind large, bold content — primary buttons, the header, and
 * uppercase badges. See `docs/branding.md`.
 *
 * For reference, Oshap's own orange with white text measures 3.11:1, so the
 * default has always sat on this rule too.
 */
const MIN_ON_PRIMARY = 3;

/**
 * WCAG AA for body text. The container is where real reading happens — chips,
 * tinted panels, secondary labels — so it gets the stricter threshold.
 */
const MIN_ON_CONTAINER = 4.5;

/**
 * WCAG AA for body text, applied to the *action* fill under a white label.
 *
 * This is the v2 rule that replaced sizing the label up until 3:1 was allowed.
 * Inflating type until the contrast bar is technically met is the tail wagging
 * the dog — label size should follow the density of the screen, not the fill
 * behind it. So the fill moves instead, and the brand keeps its own hex for
 * identity.
 */
const MIN_ON_ACTION = 4.5;

/** Beyond this, containers vibrate against text at the sizes a menu uses. */
const MAX_CHROMA = 0.19;

/**
 * A brand colour is kept recognisable, but a near-white or near-black seed
 * cannot carry text at all, so lightness is clamped into a usable band before
 * anything else happens.
 */
const PRIMARY_L_MIN = 0.45;
const PRIMARY_L_MAX = 0.78;

export interface BrandRoles {
  /** Identity only — the venue mark, the splash. Held to the 3:1 non-text bar. */
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  /**
   * The interface fill: filled buttons, FAB, active indicators, focus rings.
   * Derived by walking the brand down until white clears 4.5:1, so a label on
   * it is readable at any size rather than only when it is large and bold.
   */
  primaryAction: string;
  primaryActionHover: string;
  primaryActionPressed: string;
  /** The brand as a LABEL on a surface — outlined and text buttons, links. */
  primaryLabel: string;
}

export interface BrandPalette {
  light: BrandRoles;
  dark: BrandRoles;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * `primary_color` is nullable free text on the API, not a validated hex, so
 * this has to survive anything. Returns null rather than throwing: a guest
 * seeing the default brand is a non-event, a guest seeing an unstyled page is
 * not.
 */
export function parseHex(input: string | null | undefined): [number, number, number] | null {
  if (typeof input !== "string") return null;
  const raw = input.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}

function toHex(rgb: [number, number, number]): string {
  const part = (c: number) =>
    Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${part(rgb[0])}${part(rgb[1])}${part(rgb[2])}`;
}

// ---------------------------------------------------------------------------
// Contrast — WCAG 2.x relative luminance
// ---------------------------------------------------------------------------

function channelLuminance(c: number): number {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** WCAG contrast ratio between two hex colours, 1:1 to 21:1. */
export function contrastRatio(a: string, b: string): number {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return 1;
  const la = relativeLuminance(ca);
  const lb = relativeLuminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ---------------------------------------------------------------------------
// OKLab / OKLCH — Björn Ottosson's transform
// ---------------------------------------------------------------------------

const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const linearToSrgb = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;

interface Oklch {
  l: number;
  c: number;
  h: number;
}

function rgbToOklch(rgb: [number, number, number]): Oklch {
  const [r, g, b] = rgb.map(srgbToLinear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {
    l: L,
    c: Math.sqrt(A * A + B * B),
    h: Math.atan2(B, A),
  };
}

function oklchToRgb({ l, c, h }: Oklch): [number, number, number] {
  const A = c * Math.cos(h);
  const B = c * Math.sin(h);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    linearToSrgb(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    linearToSrgb(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    linearToSrgb(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ];
}

const inGamut = (rgb: number[]) => rgb.every((c) => c >= -0.001 && c <= 1.001);

/**
 * A hue at full chroma often falls outside sRGB at the lightness we want.
 * Reducing chroma keeps the hue — which is what a restaurant recognises as
 * "our colour" — where clipping the channels would shift it.
 */
function toneHex(base: Oklch, lightness: number): string {
  let chroma = Math.min(base.c, MAX_CHROMA);
  let rgb = oklchToRgb({ l: lightness, c: chroma, h: base.h });
  let guard = 0;
  while (!inGamut(rgb) && chroma > 0 && guard < 60) {
    chroma = Math.max(0, chroma - 0.005);
    rgb = oklchToRgb({ l: lightness, c: chroma, h: base.h });
    guard += 1;
  }
  return toHex(rgb as [number, number, number]);
}

// ---------------------------------------------------------------------------
// Role assignment
// ---------------------------------------------------------------------------

/**
 * The two candidates for text on the brand colour: a near-white and a
 * near-black *of the brand's own hue*, so an orange gets a warm off-white
 * rather than something clinical.
 */
function onCandidates(base: Oklch): [string, string] {
  return [toneHex(base, 0.99), toneHex(base, 0.16)];
}

/**
 * Pick whichever candidate reads better. That is the whole rule, and it is
 * already optimal — preferring light text when it merely passes would only
 * shave margin off for nothing.
 *
 * The reason is arithmetic. For any colour, its contrast against white and
 * against black multiply to a constant 21, so the better of the two is always
 * at least sqrt(21) ~ 4.58:1. Measured across a 216-colour sweep of the hue
 * wheel the worst case here is 4.39:1 — the small shortfall is because these
 * candidates are brand-tinted rather than pure white and black.
 *
 * Flipping to dark text costs no brand fidelity: the brand colour itself is
 * unchanged either way, only the label on top of it differs. It buys real
 * margin on a menu read on a cheap phone in daylight, which is where this is
 * actually used.
 */
function bestOn(primary: string, base: Oklch): { hex: string; ratio: number } {
  const [light, dark] = onCandidates(base);
  const lr = contrastRatio(primary, light);
  const dr = contrastRatio(primary, dark);
  return lr >= dr ? { hex: light, ratio: lr } : { hex: dark, ratio: dr };
}

/**
 * Clamp lightness into a band that can carry text, then verify.
 *
 * The clamp is what does the work: a near-white or near-black seed is dragged
 * to L 0.45-0.78, which is why a brand yellow comes back deepened but still
 * unmistakably yellow. Only lightness moves — hue and chroma are what a
 * restaurant recognises as "our colour".
 *
 * The loop below it is a backstop that, on current thresholds, never runs. A
 * 216-colour sweep of the hue wheel bottoms out at 4.39:1 against a 3:1
 * requirement, because a colour's contrast against white and against black
 * multiply to 21 and so the better of the two cannot be low. It is kept for
 * the case where someone raises `MIN_ON_PRIMARY`, not because it fires today.
 */
function resolvePrimary(base: Oklch): { hex: string; on: string } {
  let lightness = Math.min(PRIMARY_L_MAX, Math.max(PRIMARY_L_MIN, base.l));
  let hex = toneHex(base, lightness);
  let on = bestOn(hex, base);
  if (on.ratio >= MIN_ON_PRIMARY) return { hex, on: on.hex };

  // Which way to move depends on which candidate is winning: a dark text
  // colour wants a lighter surface, and vice versa.
  const [lightCandidate] = onCandidates(base);
  const direction = on.hex === lightCandidate ? -1 : 1;

  for (let step = 0; step < 40; step += 1) {
    lightness = Math.min(0.97, Math.max(0.08, lightness + direction * 0.02));
    hex = toneHex(base, lightness);
    on = bestOn(hex, base);
    if (on.ratio >= MIN_ON_PRIMARY) break;
  }
  return { hex, on: on.hex };
}

/**
 * Text on the tinted container. Starts at the tone the existing token set uses
 * and deepens until it clears body-text contrast, because this is where a
 * guest actually reads rather than glances.
 */
function resolveOnContainer(base: Oklch, container: string, startL: number, direction: 1 | -1): string {
  let lightness = startL;
  let hex = toneHex(base, lightness);
  for (let step = 0; step < 45 && contrastRatio(container, hex) < MIN_ON_CONTAINER; step += 1) {
    lightness = Math.min(0.99, Math.max(0.02, lightness + direction * 0.02));
    hex = toneHex(base, lightness);
  }
  // Fall back to plain black or white if the hue simply cannot get there.
  if (contrastRatio(container, hex) < MIN_ON_CONTAINER) {
    const black = contrastRatio(container, "#000000");
    const white = contrastRatio(container, "#ffffff");
    return black >= white ? "#000000" : "#ffffff";
  }
  return hex;
}

/**
 * Walk the brand down its own ramp until white clears body-text contrast.
 *
 * Measured rather than nominal: the ramps here are OKLCH steps, so a fixed
 * "tone 50" is not the same contrast for every hue. Oshap's own orange lands on
 * #c24e00 this way, which is the value the reference page shows.
 */
function resolveAction(base: Oklch, startL: number): string {
  let lightness = startL;
  let hex = toneHex(base, lightness);
  for (
    let step = 0;
    step < 60 && contrastRatio(hex, "#ffffff") < MIN_ON_ACTION;
    step += 1
  ) {
    lightness = Math.max(0.05, lightness - 0.015);
    hex = toneHex(base, lightness);
  }
  return hex;
}

/**
 * The brand as small text on a surface — an outlined button, a link.
 *
 * The action fill is not reusable here: it was derived against white, and this
 * sits on `surface`. Light walks down, dark walks up, both until 4.5:1.
 */
function resolveLabel(
  base: Oklch,
  surface: string,
  startL: number,
  direction: 1 | -1,
): string {
  let lightness = startL;
  let hex = toneHex(base, lightness);
  for (
    let step = 0;
    step < 60 && contrastRatio(surface, hex) < MIN_ON_CONTAINER;
    step += 1
  ) {
    lightness = Math.min(0.97, Math.max(0.05, lightness + direction * 0.015));
    hex = toneHex(base, lightness);
  }
  return hex;
}

/**
 * Derive the full token set from one brand hex.
 *
 * The brand colour itself is identical in both modes — that is how the
 * existing tokens behave, and a restaurant's colour should not become a
 * different colour after dark. Only the container and its text swap.
 *
 * Returns null for anything unparseable, so the caller falls back to the
 * default theme rather than rendering something broken.
 */
export function deriveBrandPalette(input: string | null | undefined): BrandPalette | null {
  const rgb = parseHex(input);
  if (!rgb) return null;

  const base = rgbToOklch(rgb);
  // A grey seed has no hue worth preserving and would produce a grey "brand".
  if (base.c < 0.02) return null;

  const { hex: primary, on: onPrimary } = resolvePrimary(base);

  const lightContainer = toneHex(base, 0.93);
  const darkContainer = toneHex(base, 0.24);

  // States walk down the same ramp, so contrast only improves as the user
  // interacts — the fill never gets lighter under a label that is already white.
  const action = resolveAction(base, Math.min(base.l, PRIMARY_L_MAX));
  const actionL = rgbToOklch(parseHex(action)!).l;
  const actionHover = toneHex(base, Math.max(0.05, actionL - 0.06));
  const actionPressed = toneHex(base, Math.max(0.05, actionL - 0.12));

  const roles = (
    container: string,
    onStart: number,
    dir: 1 | -1,
    surface: string,
    labelStart: number,
    labelDir: 1 | -1,
  ): BrandRoles => ({
    primary,
    onPrimary,
    primaryContainer: container,
    onPrimaryContainer: resolveOnContainer(base, container, onStart, dir),
    primaryAction: action,
    primaryActionHover: actionHover,
    primaryActionPressed: actionPressed,
    primaryLabel: resolveLabel(base, surface, labelStart, labelDir),
  });

  // The surfaces the label is measured against are the v2 defaults: N98 in
  // light, N6 in dark.
  return {
    light: roles(lightContainer, 0.38, -1, "#fafafa", actionL, -1),
    dark: roles(darkContainer, 0.9, 1, "#100f10", 0.78, 1),
  };
}

/**
 * The custom properties to set on a wrapper element.
 *
 * `bg-primary` resolves through `--color-primary` to `--ds-brand-primary`, so
 * overriding this group rebrands every utility at once — no rebuild, no inline
 * styles on components, no markup changes.
 *
 * Every name here must exist in `tokens/tokens.css`. A variable no token reads
 * is not an error anywhere: it sets cleanly, resolves to nothing, and the tenant
 * silently keeps Oshap orange. The "writes only variables that tokens.css
 * declares" test is what guards that.
 */
export function brandCssVars(roles: BrandRoles): Record<string, string> {
  return {
    "--ds-brand-primary": roles.primary,
    "--ds-on-primary": roles.onPrimary,
    "--ds-primary-container": roles.primaryContainer,
    "--ds-on-primary-container": roles.onPrimaryContainer,
    "--ds-primary-action": roles.primaryAction,
    "--ds-primary-action-hover": roles.primaryActionHover,
    "--ds-primary-action-pressed": roles.primaryActionPressed,
    "--ds-primary-label": roles.primaryLabel,
  };
}
