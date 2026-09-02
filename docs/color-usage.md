# Color Usage — Oshap DS v3

Canonical rules for `apps/customer`, `apps/admin`, `apps/platform`. Material Design 3,
solved rather than approximated.

Rendered reference: `Oshap Design System v3.dc.html`. Palette output: `m3-tokens.json`,
which is the source of every hex here. v2 and its rules are superseded by this file.

Never hardcode a hex. Never use a raw palette step as a surface. Tokens swap on
`[data-theme="dark"]`, so use the semantic utility, never a `dark:` prefix.

---

## Method

Five key palettes come out of the seed `#F56500` in HCT (H 43.54 · C 75.92 · T 60.53)
through the M3 reference solver, plus fixed-hue error, success and warning run through
the same solver. A role names a palette and a tone. **Ratios are measured after the
fact, not searched for** — v2 walked a candidate list until something passed, which
produced right answers by a route nobody could re-derive.

Regenerating is a build step, not a runtime one:

```js
import { argbFromHex, themeFromSourceColor } from "@material/material-color-utilities";
const t = themeFromSourceColor(argbFromHex("#F56500"));
t.palettes.neutral.tone(98);
```

Then override the single role the solver would get differently — primary stays the seed.
Ship flat custom properties either way. The same generator runs on tenant save with the
seed swapped, so there is no second implementation.

**Step numbers mean HCT tone.** They are not the v2 numbers. There is no tone 99, and
the neutral palette carries six extra tones (4, 6, 12, 17, 22, 24, 87, 92, 94, 96) that
exist only to give the surface ladder its steps.

---

## The one exception: primary at 3:1

`primary` is the seed in **both** modes with a white label. v2 derived a second, darker
token (`primary-action`) to reach 4.5:1; **v3 deletes it.** There is no derived interface
variant to keep in sync.

M3 would put P40 `#A63B00` on filled buttons — 6.47:1 with white, and a visibly browner
orange than the sign above the door.

The cost is real and bounded. White on `#F56500` is **3.11:1**: AA for large text and UI
components, not for body copy. Two rules follow, and both are load-bearing:

1. **Filled-button labels are 16px semibold minimum.** `Button.tsx` pins this at every
   height rather than trusting call sites, and `buttons.test.tsx` asserts it.
2. **The seed never carries a paragraph.** Body-size brand text on a light surface uses
   `primary-label` (P40), which clears **6.16:1**.

A focus ring is a UI component, so the 3:1 exception covers it without qualification.

---

## Color roles

| Role | Light | Dark |
|---|---|---|
| `primary` / `on-primary` | `#F56500` / `#FFFFFF` — 3.11:1 ≥3 | same |
| `primary-container` | P90 `#FFDBCC` / P10 — 12.97:1 | P30 `#832700` / P90 — 7.21:1 |
| `primary-label` | P40 `#A63B00` — 6.16:1 | P80 `#FFB593` |
| `secondary` / `on-secondary` | S40 `#76574A` / S100 — 6.50:1 | S80 `#E6BEAD` / S20 — 10.05:1 |
| `secondary-container` **· departure** | S80 `#E6BEAD` / S10 — 10.05:1 | S30 `#5C4033` / S90 — 7.27:1 |
| `tertiary-container` | T90 `#EEE4A9` / T10 — 13.28:1 | T30 `#4D471B` / T90 — 7.30:1 |
| `error-container` | E90 `#FFDAD5` / E10 — 12.96:1 | E30 `#960004` / E90 — 7.07:1 |
| `success-container` | Su90 `#78FBB6` / Su10 — 13.06:1 | Su20 `#003A1E` / Su90 — 10.02:1 |
| `warning-container` | Wa90 `#FFDDAF` / Wa10 — 13.14:1 | Wa30 `#653E00` / Wa90 — 7.23:1 |
| `inverse-surface` | N20 `#362F2C` / N95 — 11.57:1 | N90 `#EDE0DB` / N20 |

**The `secondary-container` departure.** M3 says S90, which at chroma 16 is
byte-identical to P90 `#FFDBCC` — the nav pill and the primary tag would be the same
fill. Dropped to S80. Revisit if the seed hue ever changes.

`secondary` is a muted brown at this hue: use it for weight, not for emphasis.
`tertiary` is categorical only — menu sections, dietary marks. Never a state.

**Status roles sit outside the scheme.** Error, success and warning are fixed hues, not
seed-derived and not tenant-derived. That is the only way a green "paid" chip stays green
in a restaurant whose brand is red. Status is never carried by colour alone — always pair
it with a label or an icon.

---

## Surfaces

**Neutrals are warm.** Oshap grey is gone; surfaces carry the seed hue at chroma 4. This
is the single most visible change in the apps, and every screenshot in every doc looks
different because of it.

| Level | Light | Dark |
|---|---|---|
| `surface-container-lowest` | N100 `#FFFFFF` | N4 `#120D0B` |
| `surface` | N98 `#FFF8F5` | N6 `#181210` |
| `surface-container-low` | N96 `#FEF1EC` | N10 `#201A18` |
| `surface-container` | N94 `#F8EBE7` | N12 `#251E1C` |
| `surface-container-high` | N92 `#F2E6E1` | N17 `#2F2926` |
| `surface-container-highest` | N90 `#EDE0DB` | N22 `#3A3330` |
| `surface-dim` | N87 `#E4D7D3` | N6 `#181210` |
| `surface-bright` | N98 `#FFF8F5` | N24 `#3F3835` |
| `on-surface` | N10 `#201A18` — 16.36:1 | N90 `#EDE0DB` — 14.38:1 |
| `on-surface-variant` | NV30 `#52443D` — 8.88:1 | NV80 `#D7C2BA` — 10.87:1 |
| `outline` | NV50 `#85736C` — 4.29:1 | NV60 `#A08D85` — 5.86:1 |
| `outline-variant` | NV80 `#D7C2BA` | NV30 `#52443D` |

**Elevation is a tone change, not a shadow.** Shadows are reserved for things that
actually float above the page. The light ladder steps in twos because the eye cannot
separate 98 from 96 at a glance — that is the point: it reads as one warm sheet with
structure in it.

`outline` is for interactive borders; `outline-variant` for decorative dividers.

### Assignment

| Element | Token |
|---|---|
| Page background, top app bar | `surface` |
| Card, sheet, drawer, rail, side panel | `surface-container-low` |
| Nested block or quiet button inside a card | `surface-container` |
| Dialog, modal, menu, tooltip | `surface-container-high` |
| Hover on a nested element | one step up |
| Filled text field container | `surface-container` |
| Snackbar | `inverse-surface` + `inverse-on-surface` |

Chips are outlined at rest and take `secondary-container` when selected. A border reads
against any surface in the ladder, so whoever places a chip does not have to know what it
is sitting on.

---

## Buttons

Five variants in one emphasis ladder. Radius 8, height 48 comfortable and 40 compact.
**One filled button per view** — if a screen needs two, one of them is tonal.

| Variant | Light | Dark |
|---|---|---|
| filled | seed / white | seed / white |
| tonal | P90 / P10 | P30 / P90 |
| outlined | NV50 border / P40 label | NV60 / P80 |
| elevated | N100 + level 1 | N12 + level 1 |
| text | P40 | P80 |
| disabled | on-surface 12% fill / 38% label | same |

Label is **16px semibold on filled** and 14px elsewhere. Tonal is on the *primary*
container, not secondary — v2 had this on secondary, and v3 moves it.

Icon buttons are circular at 48px. The FAB keeps the 16px card radius so it belongs to
the same family as the cards it sits over.

---

## Type, shape, spacing

Unchanged from v2. The M3 fifteen-role scale in two families — Archivo for display,
headline, title and label; Instrument Sans for body. Prices and table figures use
Instrument Sans with tabular figures; monospace is for tokens and IDs only.

Shape: `xs` 4 · `sm` 8 (buttons and fields) · `md` 12 · `lg` 16 (cards, FAB) · `xl` 28
(dialogs, bottom-sheet tops) · `full` (pills, chips). Buttons stay at 8px rather than
M3's full-round: a pill next to a rectangular price field reads as a different generation
of UI, and the apps are full of rectangular price fields.

Spacing is the 4pt grid, `xs` 4 through `11xl` 128.

---

## States

M3 state layers — the on-color at a fixed opacity over the container.

| State | Layer |
|---|---|
| Hover | on-color @ 8% |
| Focus | 12% + `outline: 3px solid` primary, offset 2px, via `:focus-visible` |
| Press | 12% + `scale: 0.97` over 110ms |
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

A glyph takes the on-color of what it sits on, exactly like text. Icons inherit
`currentColor`, so set the colour on the container and let the glyph take it. Never give
a glyph its own hex.

A glyph is a UI component, so its bar is 3:1 rather than 4.5:1 — which is why an icon on
the seed fill needs no size adjustment where a text label does.

`_line` at rest, `_fill` for active or selected. 24px default, 20px dense, 18px inline,
32px empty states.

---

## Known gaps

- **Charts have no categorical scale.** primary, secondary, tertiary and warning all sit
  within 60° of the seed, so a multi-series chart cannot separate by hue. The palette in
  `apps/admin/src/routes/analytics.tsx` separates by tone instead. A chart needing more
  series than that needs its own scale, not more design-system roles.
- **Tenant seeds near red.** A tenant seeded close to H 25 gets a primary near the fixed
  error hue, and a red "Place Order" beside a red "Void" is a genuine confusion. Nothing
  in the algorithm prevents it. Unresolved in v3.

---

## Checklist for any new element

1. Page or top app bar → `surface`.
2. Card, sheet, drawer, rail → `surface-container-low`.
3. Nested inside a card → `surface-container`.
4. Dialog, menu, tooltip → `surface-container-high`.
5. Hover → one step up.
6. Text → `on-surface` / `on-surface-variant`; interactive borders → `outline`,
   dividers → `outline-variant`.
7. Filled button → `primary` with white, label 16px semibold. Brand text at body size →
   `primary-label`.
8. Status → container + matching on-color, plus a label or icon.
9. Icon → the on-color of its container, via `currentColor`.
10. Interactive → 48px on mobile, `:focus-visible` ring, 8/12% state layers.
11. No raw hex, no raw palette step.
