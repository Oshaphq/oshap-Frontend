# Color Usage — Oshap DS v3

Canonical rules for `apps/customer`, `apps/admin`, `apps/platform`. Material Design 3,
solved rather than approximated.

Rendered reference: `Oshap Design System v3.dc.html`. Palette output: `m3-tokens.json`,
which is the source of every hex here. v2 and its rules are superseded by this file.

Never hardcode a hex. Never use a raw palette step as a surface. Tokens swap on
`[data-theme="dark"]`, so use the semantic utility, never a `dark:` prefix.

---

## Method

One accent palette, primary, comes out of the seed `#F56500` in HCT (H 43.54 · C 75.92 ·
T 60.53) through the M3 reference solver, plus fixed-hue error, success and warning run through
the same solver. A role names a palette and a tone. **Ratios are measured after the
fact, not searched for** — v2 walked a candidate list until something passed, which
produced right answers by a route nobody could re-derive.

**The neutrals are the exception, and it is deliberate.** They are not solved from the
seed at all — see [Surfaces](#surfaces).

Regenerating is a build step, not a runtime one:

```js
import { argbFromHex, themeFromSourceColor } from "@material/material-color-utilities";
const t = themeFromSourceColor(argbFromHex("#F56500"));
t.palettes.neutral.tone(98);
```

Then override the single role the solver would get differently — primary stays the seed.
Ship flat custom properties either way. The same generator runs on tenant save with the
seed swapped, so there is no second implementation.

**Step numbers mean HCT tone — for the accent palettes only.** They are not the v2
numbers, and there is no tone 99. The neutral steps keep their source names (`N0`…`N1000`,
`DN0`…`DN1100`) because they are positions in a fixed ramp rather than tones, and a tone
number there would be a lie.

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
| `error-container` | E90 `#FFDAD5` / E10 — 12.96:1 | E30 `#960004` / E90 — 7.07:1 |
| `success-container` | Su90 `#78FBB6` / Su10 — 13.06:1 | Su20 `#003A1E` / Su90 — 10.02:1 |
| `warning-container` | Wa90 `#FFDDAF` / Wa10 — 13.14:1 | Wa30 `#653E00` / Wa90 — 7.23:1 |
| `inverse-surface` | `grey-30` `#2E2E2E` / `grey-95` — 11.78:1 | `grey-88` `#D7D7D7` / `grey-21` |

**No secondary or tertiary.** M3 derives both from the seed. At Oshap's seed, secondary
was a muted brown whose tone 90 was byte-identical to primary's, and tertiary an olive.
Nothing in the product chose either on purpose — four platform plan tags and two chart
series — so both were removed (2026-11) rather than given jobs. Accents are primary only;
status has its own fixed hues; everything else is neutral.

**Status roles sit outside the scheme.** Error, success and warning are fixed hues, not
seed-derived and not tenant-derived. That is the only way a green "paid" chip stays green
in a restaurant whose brand is red. Status is never carried by colour alone — always pair
it with a label or an icon.

---

## Surfaces

**Neutrals are a true neutral — built from black and white in OKLCH at zero chroma.**
This is the one place v3 does not use HCT. Zero chroma means `a = b = 0`, and each
OKLab→linear-sRGB row sums to exactly 1, so **`R = G = B` for every step**. The greys are
colourless in the literal sense — not "cool grey", not "warm grey".

That is the whole point: **a colourless surface sits under any brand palette.** A warm
accent on a cool neutral fights it; on a true neutral it reads as the brand. Surfaces,
text and borders are fixed and shared by every tenant, so the seed only ever reaches
accents, and two tenants side by side have the same page under different brands.

Steps are named by OKLCH lightness, because that is what they are: `grey-64` is L=64%.
Regenerating is one line, `enc((L/100)³)`, with no palette solver involved:

```js
const enc = c => c <= 0.0031308 ? 12.92*c : 1.055*Math.pow(c, 1/2.4) - 0.055;
const grey = L => { const v = Math.round(enc((L/100)**3)*255); return [v,v,v]; };
```

**Light and dark are one family.** A uniform, symmetric ramp does not need a two-family
split — the roles simply pick different steps.

**Nesting steps away from the page.** In light mode the page is the lightest surface and
each container set inside it is a step darker. In dark mode the page is the darkest and
each container stacked on it is a step lighter. A well or field is sunken: a step darker
than its card in both modes.

This is the documented convention, not a house preference:

- **Material 3** surface containers — light: page tone 98, containers 96 → 94 → 92 → 90;
  dark: page tone 6, containers 10 → 12 → 17 → 22
  ([roles](https://m3.material.io/styles/color/roles); tones in
  [`color_spec_2021.ts`](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/dynamiccolor/color_spec_2021.ts)).
- **Apple** — `secondarySystemBackground` is "the color for content layered on top of the
  main background": white → `#F2F2F7` in light, `#000` → `#1C1C1E` in dark
  ([UI element colors](https://developer.apple.com/documentation/uikit/ui-element-colors)).
- **Radix Colors** — steps 1–2 for backgrounds, 3–5 for components; darker per step in
  light, lighter in dark ([scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)).

**Step size is what failed before, not direction.** v3 ran this direction one grey-step
apart (1.06:1), and a button on a card vanished. #148 flipped the direction to fix it;
this restores the convention with wider steps. The steps widen as they nest: a control
jumps further from its card (1.20) than a card does from the page (1.12).

**Tint: neutral or brand, one per product.** Surfaces are either true neutral or the brand
hue at very low chroma (M3's neutral palette is the seed's hue at low chroma; Kuda and
Grey ship this way). Oshap is true neutral, because every tenant brings its own brand and
surfaces are shared.

The role names keep their M3 spelling, and are assigned by **job**:

| Role | Job | Light | Dark |
|---|---|---|---|
| `surface` | page | `grey-100` `#FFFFFF` | `grey-17` `#0F0F0F` |
| `surface-container-low` | card, drawer, rail, admin top bar | `grey-96` `#F2F2F2` — 1.12 under the page | `grey-24` `#1F1F1F` — 1.16 over it |
| `surface-container` | well inside a card, filled field (sunken) | `grey-93` `#E8E8E8` — 1.09 under a card | `grey-17` `#0F0F0F` — the page tone |
| `surface-container-high` | neutral control: quiet button, round icon button, neutral badge, table header | `grey-90` `#DEDEDE` — 1.20 under a card | `grey-30` `#2E2E2E` — 1.21 over it |
| `surface-container-highest` | hover on a neutral control | `grey-88` `#D7D7D7` | `grey-33` `#353535` |
| `surface-overlay` *(not M3)* | dialog, menu, sheet, floating bar | `grey-96`, the card tone — darker than the page, as M3 | `grey-26` `#242424` |
| `surface-container-lowest` | pure white when something must be | `grey-100` | `grey-12` |
| `on-surface` | primary text | `grey-30` — 12.13:1 on a card | `grey-88` — 13.32:1 |
| `on-surface-variant` | secondary text | `grey-46` — 6.36:1 on a card, 4.94 on a hovered control | `grey-70` — 7.15:1, 4.58 |
| `on-surface-placeholder` | placeholder | `grey-50` — 4.90:1 in a field | `grey-62` — 5.26:1 |
| `outline` | interactive border | `grey-56` — 4.18 on a card | `grey-58` — 3.84 on a card |
| `outline-variant` | divider | `grey-88` — 1.29 on a card | `grey-32` |

A dialog takes the card tone so that everything inside it follows the card rules — wells a
step darker, controls two. It sits over a scrim, so it needs no step from the page.

No WCAG rule asks a card edge for 3:1; a card is not a control.

**The one rule for anything placed on a card:** it is outlined (`outline`), it carries
chroma (`primary`, tonal), or its neutral fill is `surface-container-high`. Never a fill
one step from its parent — that is the 1.06 that made v3 flat.

### Assignment

| Element | Token |
|---|---|
| Page background | `surface` |
| Top app bar — **admin only** | `surface-container-low` |
| Top app bar — customer, platform | `surface` |
| Card, drawer, rail, side panel | `surface-container-low` |
| Well or info block inside a card; filled text field | `surface-container` |
| Quiet button, round icon button, neutral badge on a card | `surface-container-high`, hover `-highest` |
| Dialog, modal, menu, sheet, floating toolbar | `surface-overlay` |
| Hover on a row inside a card | `surface-container` |
| Hover on a card itself | `surface-container-high` — a step further from the page in both modes |
| Snackbar | `inverse-surface` + `inverse-on-surface` |

**The admin bar is the exception, deliberately.** It sits at `surface-container-low`, white
over the grey page rather than level with it: it is fixed chrome carrying two rows of
navigation over a working screen, so it reads as a surface in its own right and needs no
bottom border to separate it — the tone change is the separation.

Customer and platform keep their bars on `surface`. Neither carries that weight of
navigation, and the customer app in particular wants the page to read as one continuous
sheet. This is a scoping decision, not drift: do not "fix" the other two to match admin.
Admin's bar also caps its contents at the shell measure (`SHELL_WIDTH`, exported from
`Page.tsx`) so the bar lines up with the page column beneath it rather than running edge
to edge over centred content.

Chips are outlined at rest and take `bg-primary` / `text-on-primary` when selected. A
border reads against any surface in the ladder, so whoever places a chip does not have to
know what it is sitting on. Selected is the system-wide selected state — the same fill the
selection controls and the selected list row use — so a selected chip reads the same
everywhere. (v3 moved this off the secondary container, which nothing used and which has since been
removed.)

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

Icon buttons are circular at 48px. The FAB is full-radius at 48px with a brand fill and a
label — it reads as the one floating action, not as another card. (An earlier revision
pinned it to the 16px card radius; that never shipped.)

---

## Type, shape, spacing

Type is unchanged from v2: the M3 fifteen-role scale in two families — Archivo for display,
headline, title and label; Instrument Sans for body. Prices and table figures use
Instrument Sans with tabular figures; monospace is for tokens and IDs only.

Shape: `xs` 4 · `sm` 8 (buttons and fields) · `md` 12 · `lg` 16 (cards) · `xl` 28
(dialogs, bottom-sheet tops) · `full` (pills, chips, FAB). Buttons stay at 8px rather than
M3's full-round: a pill next to a rectangular price field reads as a different generation
of UI, and the apps are full of rectangular price fields.

Spacing is the golden scale, 4 × 1.618ⁿ: `xs` 4 · `s` 6 · `md` 10 · `l` 17 · `xl` 27 ·
`2xl` 44 · `3xl` 72 · `4xl` 116. Eight steps, each 1.618× the last, so neighbours differ
enough that only one fits — the 4pt grid offered 16, 24 and 32 for a card and cards
shipped at all three. Space between things (gap, margin) leans small, space inside a box
(padding) leans large. `packages/shared/src/tokens/spacing.test.ts` rejects numeric
padding, margin and gap.

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

## Color role usage — do's and don'ts

M3 assigns every role a job. These rules are the M3 ones, with Oshap's two documented
departure (`primary` at 3:1) folded in where it changes the advice.

The pairing rule underneath all of them: **a role and its `on-` role are a pair.** Text
or an icon on `X` takes `on-X`. Never take an on-color from a different family, and never
put a base role on its own container.

### primary / on-primary

High-emphasis fills, and only those: the one filled button per view, the FAB, an active
indicator, the focus ring.

| ✅ Do | ❌ Don't |
|---|---|
| Use it for the single most important action on a screen | Use it as a large background or a page fill — it is a fill for components, not areas |
| Keep filled-button labels at **16px semibold** | Put body-size or 14px white text on it — 3.11:1 fails below large-text size |
| Let icons sit on it unadjusted — a glyph is held to 3:1 | Put a paragraph on it at any size |
| Reach for `primary-label` (P40) for brand-coloured text on a surface | Use `primary` as text on `surface` — it fails 4.5:1 |

### primary-container / on-primary-container

One step down in emphasis: the tonal button, the chef's-pick tag. Not the selected state —
that is `bg-primary`.

| ✅ Do | ❌ Don't |
|---|---|
| Use it where an action matters but is not *the* action | Place `primary` on `primary-container` — near-identical lightness, no separation |
| Pair it strictly with `on-primary-container` | Use `on-primary` on it |
| Use it for the tonal button (v3 moved tonal here from secondary) | Use it to signal status — status has its own families |

### Categorical labels (plan tiers, kinds of thing)

There is no categorical palette. Label *what a thing is* with neutral, outlined or
primary-container treatments and a word — the platform plan tags are neutral (Lite),
outlined (Standard), primary container (Pro) and brand-outlined (Enterprise).

| ✅ Do | ❌ Don't |
|---|---|
| Separate categories by treatment — fill, outline, brand — and always by word | Borrow a status hue for a category — it will read as a state |
| Keep to the roles that exist | Reintroduce a secondary or tertiary palette for one tag |

### error / success / warning

Fixed hues, not seed-derived and not tenant-derived. That is the only reason a green
"paid" chip stays green in a restaurant whose brand is red.

| ✅ Do | ❌ Don't |
|---|---|
| Always pair a status colour with a **label or icon** | Rely on colour alone — it is invisible to a colour-blind waiter closing a bill |
| Use the container roles for chips and quiet banners | Tint them toward the tenant's brand |
| Use `error` for destructive confirmation and failed payment | Use `error` for "unavailable" or "out of stock" — that is `warning` or a neutral |

### Surfaces

Elevation is a **tone change, not a shadow**. Shadows are for things that genuinely float.

| ✅ Do | ❌ Don't |
|---|---|
| Follow the jobs: page `surface` → card `surface-container-low` → well `surface-container` → control `surface-container-high` → dialog `surface-overlay` | Put a neutral fill one step from its parent — at 1.06:1 it disappears |
| Hover a row inside a card with `surface-container`; hover a card with `surface-container-high` | Add a shadow to fake depth on a static block |
| Use `surface-container-lowest` when something must be pure white | Use a raw palette step (`bg-grey-91`) as a surface |
| Keep every surface on the shared ramp — it is what makes tenants comparable | Tint a surface toward the tenant's brand, or mix in a grey from outside the ramp |

### on-surface / on-surface-variant

| ✅ Do | ❌ Don't |
|---|---|
| `on-surface` for primary text, `on-surface-variant` for secondary | Use `outline` as a text colour — it is a boundary tone, not a text tone |
| Use `on-surface-placeholder` for placeholder text | Use `outline` for placeholders — 4.29:1 on a card, which fails AA |
| Keep `outline-variant` for dividers and separators — nothing else | Use `outline-variant` as text or as an icon tint — **1.32:1**, effectively invisible |

**`on-surface-placeholder` exists so placeholders are not borrowed from the border
palette.** It sits at 5.04:1 light and 4.88:1 dark — quieter than
`on-surface-variant` so an empty field reads as empty, but comfortably clear of the
4.5:1 bar, which `outline` is not once a field sits on a card rather than the page.

### outline / outline-variant

| ✅ Do | ❌ Don't |
|---|---|
| `outline` for interactive boundaries — text field borders, outlined buttons | Use `outline-variant` on a control the user can focus |
| `outline-variant` for decorative dividers and separators | Use `outline` for every divider — it is heavier than a divider needs |
| `on-surface-variant` for a quiet glyph or a quiet line of text | **Use `outline` as text or as an icon tint** |

**`text-outline` is the recurring mistake, and it gets worse the higher the
surface.** It is specced against the page, where it just clears AA — but almost
nothing sits on the page:

| sits on | `outline` light | `outline` dark | `on-surface-variant` light | dark |
|---|---|---|---|---|
| `surface` — the page | 4.67:1 | 4.47:1 | 7.11:1 | 7.15:1 |
| `surface-container-low` — any card, any dialog | **4.18** | **3.84** | 6.36:1 | 6.15:1 |
| `surface-container` — every field | **3.81** | 4.47:1 | 5.81:1 | 7.15:1 |
| `surface-container-high` — every neutral control | **3.47** | **3.16** | 5.29:1 | 5.07:1 |

Bold is below 4.5:1. Twenty-five of these were found and replaced in one pass,
and the chips were the worst of them, because a neutral status pill is
`surface-container-high` by definition. `on-surface-variant`
is the role that exists for this and clears the bar on every rung of the ladder.

A glyph is held to 3:1 rather than 4.5:1, so an icon tinted `outline` is not
strictly a failure — but it is the same tone doing two jobs, and the moment
somebody puts a word next to it at the same colour it becomes one.

### inverse-surface

| ✅ Do | ❌ Don't |
|---|---|
| Snackbars, and nothing else | Use it as a "dark card" — it inverts against the theme and will look wrong in dark mode |
| Pair with `inverse-on-surface`, and use `inverse-primary` for its action | Give a snackbar icon a status colour — it will wear the dark-theme error tone on a light-theme inverse surface |

### Universal don'ts

- **No raw hex.** Ever, in any app.
- **No raw palette step as a surface.** Steps are the palette; roles are the system.
- **No `dark:` prefix.** Roles swap on `[data-theme="dark"]` already.
- **No `outline: none`.** It sits in a utility layer and beats the `:focus-visible` ring
  the token file defines in `@layer base`.
- **No colour-only state.** Always a label or an icon alongside.

### Contrast bars, so the exception stays legible

| Bar | Applies to | Oshap |
|---|---|---|
| **4.5:1** | Body text | Every text/on-color pair here clears it |
| **3:1** | Large text (≥18.66px bold / 24px regular), icons, UI boundaries | `primary` under white sits here at 3.11:1 — the one stated exception |

An icon is a UI component, so a glyph on the seed needs no size adjustment where a text
label does. That asymmetry is the whole reason the 16px rule exists.

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
the seed fill needs no size adjustment where a text label does. **3:1 is still a bar.** A
neutral glyph takes `on-surface-variant` (6.93:1), never `outline-variant`, which lands at
1.40:1 and disappears.

**Do not fade a glyph to make it quiet.** `opacity-40` on `on-surface-variant` composites
to 1.89:1 — below the bar the full-strength colour cleared comfortably. A quiet icon comes
from choosing a lighter token, not from thinning a dark one; opacity multiplies against the
surface and silently undoes the contrast the token was chosen for.

`_line` at rest, `_fill` for active or selected. 24px default, 20px dense, 18px inline,
32px empty states.

---

## Known gaps

- **Charts have no categorical scale.** Primary and warning sit within 30° of each other,
  so a multi-series chart cannot separate by hue alone. The palette in
  `apps/admin/src/routes/analytics.tsx` mixes orange, green, grey, amber and deep brick,
  separating by tone where hue runs out. A chart needing more
  series than that needs its own scale, not more design-system roles.
- **Tenant seeds near red.** A tenant seeded close to H 25 gets a primary near the fixed
  error hue, and a red "Place Order" beside a red "Void" is a genuine confusion. Nothing
  in the algorithm prevents it. Unresolved.

---

## Checklist for any new element

1. Page, and the customer and platform top bars → `surface`.
2. The admin top bar, card, drawer, rail → `surface-container-low`.
3. Well or field inside a card → `surface-container`.
4. Neutral control on a card → `surface-container-high`; hover `-highest`.
5. Dialog, menu, sheet → `surface-overlay`.
6. Text → `on-surface` / `on-surface-variant`; interactive borders → `outline`,
   dividers → `outline-variant`.
7. Filled button → `primary` with white, label 16px semibold. Brand text at body size →
   `primary-label`.
8. Status → container + matching on-color, plus a label or icon.
9. Icon → the on-color of its container, via `currentColor`.
10. Interactive → 48px on mobile, `:focus-visible` ring, 8/12% state layers.
11. No raw hex, no raw palette step.
