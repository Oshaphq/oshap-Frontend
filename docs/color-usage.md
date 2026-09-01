# Color Usage — Oshap DS v2

Canonical rules for `apps/customer`, `apps/admin`, `apps/platform`. Derived from
Material Design 3, not from the current implementation. The accent ramps are
**generated from the single key color `#F56500`**, the same way every tenant palette
is; the neutral and status ramps are fixed. Every role below points into them.

Rendered reference: `Oshap Design System v2.dc.html`. Derivation notes: `ds-v2-plan.md`.
The previous system is recorded in `Oshap Design System.dc.html` and its rules are
superseded by this file.

Never hardcode a hex. Never use a raw ramp step (`bg-neutral-90`) as a surface. Tokens
swap on `[data-theme="dark"]`, so use the semantic utility, never a `dark:` prefix.

---

## Method

Roles are assigned by **measured contrast**, not by tone number. M3's default role/tone
mapping does not survive gamut mapping intact, so every pair is measured rather than
assumed. Two ramps (`success`, `warning`) run bright and their roles step down
accordingly. Every text pair below clears WCAG AA at 4.5:1.

`accent-2` is retired. `accent` is now a single assigned role — see **Key colors**.

---

## Key colors

Oshap's palette is generated from **one key color**, the same way every tenant's is.
`#F56500` in OKLCH is L 0.679 · C 0.196 · H 44.6, and the four role ramps rotate hue and
step chroma down from it:

| Role | Rotation | Chroma | Hue | Character |
|---|---|---|---|---|
| primary | H + 0 | × 1.00 | 44.6 | The brand — orange |
| secondary | H + 40 | × 0.90 | 84.6 | Amber |
| tertiary | H + 260 | × 0.75 | 304.6 | Violet |
| accent | H + 200 | × 0.85 | 244.6 | Blue |

**Tertiary is rotated off the algorithm's default.** H+140 put its T90 container at hue
183.6, only 10.8° from `success-container` at 172.7 — two pale mint chips in the same
column of the payments table, where PAID means settled and SPLIT does not. H+260 clears
every status container by 69° or more. The collision check in the tenant generator now
measures T90 containers rather than base roles, because those are what render as chips
and gamut mapping pulls pale tints toward different hues than their bases.

Tone is CIE L*, so tone 40 is the same perceived lightness in every ramp. The brand hex is
pinned at **tone 60**, the step nearest its own lightness, so it appears in the ramp
exactly rather than as a re-derived approximation.

**One accent, assigned.** The old palette carried two spare accent ramps with no callers.
There is now a single `accent` role with a job — attention without action:

| Token | Light | Dark |
|---|---|---|
| `accent` / `on-accent` | #00639D on white · 6.42:1 | #92CEFF on #003354 · 7.80:1 |
| `accent-container` / `on-` | #CAE7FF on #003354 · 10.23:1 | #004A78 on #CAE7FF · 7.28:1 |

Use it for the open-table badge, promos and unread counts. Not for anything a guest could
read as a payment state.

Base roles (`secondary`, `tertiary`, `accent`) take **tone 40** in light mode, not 50:
white fails on tertiary-50 (4.25:1) and accent-50 (4.44:1). Containers are tone 90 with a
tone 20 on-color, giving 10:1 or better across all four families.

**Neutrals and status ramps are not derived.** They are fixed, and a tenant's brand never
tints them — a restaurant with a red brand must not get a red "paid" chip.

## Surfaces

| Role | Light | Dark |
|---|---|---|
| `surface` | `#fafafa` | `#100f10` |
| `surface-dim` | `#dfdddf` | `#100f10` |
| `surface-bright` | `#fafafa` | `#3e3c3e` |
| `surface-container-lowest` | `#ffffff` | `#0a0a0a` |
| `surface-container-low` | `#f5f5f5` | `#1a191a` |
| `surface-container` | `#f0eff0` | `#1f1e1f` |
| `surface-container-high` | `#ebeaeb` | `#2c2b2c` |
| `surface-container-highest` | `#e6e5e6` | `#393739` |
| `on-surface` | `#1a191a` | `#e6e5e6` |
| `on-surface-variant` | `#4d4950` | `#ccc9cf` |
| `outline` | `#817986` | `#9a949e` |
| `outline-variant` | `#ccc9cf` | `#4d4950` |
| `inverse-surface` | `#343234` | `#e6e5e6` |
| `inverse-on-surface` | `#f2f2f2` | `#343234` |

**The page is lighter than the cards.** M3 puts the floor at near-white and steps down in
lightness as elevation rises. This inverts today's grey-page/white-card look and is the
most visible change in the system. `surface-container-lowest` `#ffffff` remains for
surfaces that must be pure white.

### Assignment

| Element | Token |
|---|---|
| Page background, top app bar | `surface` |
| Card, sheet, drawer, rail, side panel | `surface-container-low` |
| Nested block or quiet button inside a card | `surface-container` |
| Dialog, modal, menu, tooltip | `surface-container-high` |
| Hover on a nested element | one step up (`-high`, then `-highest`) |
| Filled text field container | `surface-container` |
| Snackbar | `inverse-surface` + `inverse-on-surface` |

Chips no longer change token by context: they are **outlined at rest** and take
`secondary-container` when selected. A border reads against any surface in the ladder, so
whoever places a chip no longer has to know what it is sitting on.

---

## Accent & status roles

| Role | Light bg / fg | Dark bg / fg |
|---|---|---|
| primary | `#f56500` / `#ffffff` | `#f56500` / `#ffffff` |
| primary-container | `#ffe1cc` / `#662a00` | `#993f00` / `#ffe1cc` |
| secondary | `#8d583f` / `#ffffff` | `#dfc5b9` / `#462c20` |
| secondary-container | `#efe2dc` / `#462c20` | `#6a422f` / `#efe2dc` |
| tertiary | `#706829` / `#ffffff` | `#e4deb4` / `#4b451b` |
| tertiary-container | `#f1efda` / `#4b451b` | `#706829` / `#f1efda` |
| error | `#bd0f1b` / `#ffffff` | `#f8a0a6` / `#5f070d` |
| error-container | `#fbd0d3` / `#5f070d` | `#8e0b14` / `#fbd0d3` |
| success | `#006644` / `#ffffff` | `#99ffdd` / `#006644` |
| success-container | `#ccffee` / `#006644` | `#006644` / `#ccffee` |
| warning | `#8e5d01` / `#ffffff` | `#fedc9a` / `#654301` |
| warning-container | `#ffedcc` / `#654301` | `#8e5d01` / `#ffedcc` |

### Primary holds in both themes, with white on-primary

The one deliberate deviation from M3, which would shift primary to a lighter tone in dark
mode. Oshap orange stays `#f56500` in both because the brand is the colour, and
`on-primary` is white.

White on that fill measures **3.11:1**. WCAG sets two bars, and the fill sits between them:

| Bar | Applies to | Result |
|---|---|---|
| 3:1 | Large text (≥18.66px bold / 24px regular), icons, UI boundaries | ✅ passes |
| 4.5:1 | Body-size text | ❌ fails |

So the size carries the contrast:

- **Filled button label: 18px semibold, height 48px.** Above the large-text line, and the
  thumb-zone size the customer app wanted anyway.
- **Small white text on the brand fill is not allowed.** Counts, badges and dense labels
  take `primary-30` `#993f00`, where white reaches 6.85:1.
- **Icons on primary need no size bump** — a glyph is a UI component, held to 3:1.

Tonal, outlined and text buttons are unaffected; none of them puts white on the brand fill.

### Status roles never take a brand tint

A venue's colour must not become the colour of a failed payment. Status is also never
carried by colour alone — always pair it with a label or an icon.

---

## Type

Two families. **Archivo** 400–700: display, headline, title, label. **Instrument Sans**
400–600: body. Space Grotesk is retired — a third webfont for sizes no screen renders.

Fifteen M3 roles; sizes in `ds-v2-plan.md` and rendered in the reference page. Tracking is
~0 at display sizes and **positive** below 16px, replacing the old blanket −1.75px.
Display and headline shrink one step ≤768px through `--ds-*-size`, so no call site needs
a responsive variant.

---

## Shape & spacing

`xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 28 · `2xl` 32 · `3xl` 40 · `full` 100.

`sm` buttons and text fields · `md` compact cards · `lg` cards · `xl` dialogs and bottom-sheet
top corners (`rounded-t-xl`) · `full` pills, chips, FAB, nav destinations.

Buttons keep `sm` 8px. M3 draws them as pills; Oshap does not, so the shape scale is
unchanged from what ships today and no button markup moves. Icon buttons stay circular
and the FAB keeps its 16px container.

Spacing gains `6xl: 72px`, closing the gap where `p-6xl` silently resolved to nothing.

---

## Button sizes

| Size | Height | Label | Use |
|---|---|---|---|
| `sm` | 32px | 13px | Desktop, and actions inside a card |
| `md` | 40px | 14px | Default |
| `lg` | 48px | 16px | Mobile, and the primary CTA on any surface |

Every size fills with `primary-action` and takes a white label. There is no
size-dependent fill rule, because the action color was derived to clear 4.5:1.

## Brand vs interface color

**Brand colors define identity; accessible variants handle the interface.**

| Token | Value | Job |
|---|---|---|
| `brand-primary` | #F56500 | Identity only — venue mark, splash, marketing. Never a text background. |
| `primary-action` | #C24E00 | Every interactive component: filled buttons, FAB, active indicators, focus rings. |
| `primary-action-hover` | #9B3D00 | Hover. |
| `primary-action-pressed` | #762D00 | Pressed. |

`primary-action` is `primary-50` on the derived ramp — an actual step, not an off-ramp
value. Hover and pressed are `primary-40` and `primary-30`, so states walk down the same
ramp and contrast only improves.

White on #F56500 is 3.11:1; on #C24E00 it is 4.79:1.

This replaces an earlier attempt to solve the same problem with type size. Inflating a
button label until the contrast bar is technically met is the tail wagging the dog: label
size should follow from the density of the screen, not from the fill behind it. States
darken further, so contrast only improves as the user interacts.

3:1 still applies to `brand-primary`, but as WCAG's **non-text** bar — it covers the mark
and other graphical objects, and is size-independent. It is never a licence for small
white text on the brand fill.

Paired actions sit at 44px — above the default because the surface is mobile, below `lg`
because neither action is the page's primary CTA. Pair **tonal + filled**, equal width,
filled on the right; two outlined buttons side by side read as one control split in half.

`sm` never appears on a mobile surface on its own: 32px fails the 48px touch minimum
unless it sits inside a row that provides the target.

## States

M3 state layers — the on-color at a fixed opacity over the container, one rule for every
variant.

| State | Layer |
|---|---|
| Hover | on-color @ 8% |
| Focus | on-color @ 12% + `outline: 3px solid` primary, offset 2px, via `:focus-visible` |
| Press | on-color @ 12% + `scale: 0.97` over 110ms |
| Disabled | container @ 12%, label @ 38% |

Press uses the `scale` property, not `transform`, so a component-level utility overrides
it instead of compounding. Under `prefers-reduced-motion` the scale drops and the state
layer carries the feedback; it never disappears entirely.

---

## Touch & accessibility

- 48×48 minimum for anything tappable in `apps/customer`; 40px is acceptable for
  desktop-only icon buttons in admin and platform.
- A glyph never sets its own hit area — it sits inside a 40 or 48px target.
- `:focus-visible` rings on every interactive element, never `outline: none`.
- `role="dialog"` + `aria-modal`, focus trapped, Esc closes, focus returns to the trigger.
- `aria-selected` on tabs, `aria-pressed` on toggle icon buttons, `aria-invalid` +
  `aria-describedby` on fields in error.

---

## Icons — MingCute

**A glyph takes the on-color of what it sits on**, exactly like text. The pairing is
mechanical — there is never a judgement call:

| Glyph sits on | Glyph colour |
|---|---|
| `primary` / `secondary` / `tertiary` | `on-primary` / `on-secondary` / `on-tertiary` |
| `error` / `success` / `warning` | `on-error` / `on-success` / `on-warning` |
| any `*-container` | that container's `on-*-container` |
| any surface step | `on-surface-variant`, or `on-surface` when it carries equal weight to the text beside it |
| `inverse-surface` (snackbar) | `inverse-on-surface` — **not** a status colour |

Icons inherit `currentColor`, so set the colour on the container and let the glyph take
it. Never give a glyph its own hex: a per-glyph colour is how a snackbar icon ends up
wearing the dark-theme error tone on a light-theme inverse surface.

A glyph is a UI component, so its bar is 3:1 rather than 4.5:1 — which is why an icon on
the brand fill needs no size adjustment where a text label does.

Icon buttons follow the four M3 variants, and each one names its pair: standard
(transparent + `on-surface-variant`), filled (`primary` + `on-primary`), tonal
(`secondary-container` + `on-secondary-container`), outlined (`outline` border +
`on-surface-variant`, or `error` for a destructive action).

Loaded from CDN in each app's `index.html`, used as `<i class="mgc_search_line" />`.
3,240 glyphs ship; the curated working set is in the reference page. Pick from that set —
free picking is how two screens end up with two different "delete".

`_line` at rest, `_fill` for active or selected. 24px default, 20px dense, 18px inline,
32px empty states. Never mix a filled glyph into a row of line glyphs for emphasis alone.

---

## Checklist for any new element

1. Page or top app bar → `surface`.
2. Card, sheet, drawer, rail → `surface-container-low`.
3. Nested inside a card → `surface-container`.
4. Dialog, menu, tooltip → `surface-container-high`.
5. Hover → one step up.
6. Text → `on-surface` / `on-surface-variant`; borders → `outline-variant`.
7. Text on `primary` → white `on-primary`, at 18px semibold or larger. Smaller than that
   → fill with `primary-30` `#993f00`.
8. Status → container + matching on-color, plus a label or icon.
9. Icon → the on-color of its container, via `currentColor`.
10. Interactive → 48px on mobile, `:focus-visible` ring, 8/12% state layers.
11. No raw hex, no raw ramp step.
