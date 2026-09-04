# Color Usage — Oshap DS v3

Canonical rules for `apps/customer`, `apps/admin`, `apps/platform`. Material Design 3,
solved rather than approximated.

Rendered reference: `Oshap Design System v3.dc.html`. Palette output: `m3-tokens.json`,
which is the source of every hex here. v2 and its rules are superseded by this file.

Never hardcode a hex. Never use a raw palette step as a surface. Tokens swap on
`[data-theme="dark"]`, so use the semantic utility, never a `dark:` prefix.

---

## Method

Three accent palettes come out of the seed `#F56500` in HCT (H 43.54 · C 75.92 · T 60.53)
through the M3 reference solver, plus fixed-hue error, success and warning run through
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
| `secondary` / `on-secondary` | S40 `#76574A` / S100 — 6.50:1 | S80 `#E6BEAD` / S20 — 10.05:1 |
| `secondary-container` **· departure** | S80 `#E6BEAD` / S10 — 10.05:1 | S30 `#5C4033` / S90 — 7.27:1 |
| `tertiary-container` | T90 `#EEE4A9` / T10 — 13.28:1 | T30 `#4D471B` / T90 — 7.30:1 |
| `error-container` | E90 `#FFDAD5` / E10 — 12.96:1 | E30 `#960004` / E90 — 7.07:1 |
| `success-container` | Su90 `#78FBB6` / Su10 — 13.06:1 | Su20 `#003A1E` / Su90 — 10.02:1 |
| `warning-container` | Wa90 `#FFDDAF` / Wa10 — 13.14:1 | Wa30 `#653E00` / Wa90 — 7.23:1 |
| `inverse-surface` | `grey-30` `#2E2E2E` / `grey-95` — 11.78:1 | `grey-88` `#D7D7D7` / `grey-21` |

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

| Level | Light | Dark |
|---|---|---|
| `surface-container-lowest` | `grey-100` `#FFFFFF` | `grey-12` `#060606` |
| `surface` | `grey-99` `#FCFCFC` | `grey-17` `#0F0F0F` |
| `surface-container-low` | `grey-97` `#F5F5F5` | `grey-21` `#181818` |
| `surface-container` | `grey-95` `#EEEEEE` | `grey-24` `#1F1F1F` |
| `surface-container-high` | `grey-93` `#E8E8E8` | `grey-28` `#292929` |
| `surface-container-highest` | `grey-91` `#E1E1E1` | `grey-32` `#333333` |
| `surface-dim` | `grey-88` `#D7D7D7` | `grey-12` `#060606` |
| `surface-bright` | `grey-99` `#FCFCFC` | `grey-37` `#404040` |
| `on-surface` | `grey-30` `#2E2E2E` — 13.25:1 | `grey-88` `#D7D7D7` — 13.32:1 |
| `on-surface-variant` | `grey-46` `#585858` — 6.92:1 | `grey-70` `#9E9E9E` — 7.16:1 |
| `on-surface-placeholder` | `grey-52` `#696969` — 5.04:1 | `grey-62` `#868686` — 4.88:1 |
| `outline` | `grey-56` `#747474` — 4.52:1 | `grey-58` `#7A7A7A` — 4.46:1 |
| `outline-variant` | `grey-88` `#D7D7D7` | `grey-32` `#333333` |

**Elevation is a tone change, not a shadow.** Shadows are reserved for things that
actually float above the page. The light ladder steps in small increments because the eye
cannot separate them at a glance — that is the point: it reads as one sheet with
structure in it.

`outline` clears **4.5:1 in both modes**, so an interactive boundary has real headroom
rather than sitting exactly on the 3:1 bar. It is still a border tone — `on-surface-variant`
is the one to reach for when text needs to be quiet.

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

## Color role usage — do's and don'ts

M3 assigns every role a job. These rules are the M3 ones, with Oshap's two documented
departures (`primary` at 3:1, `secondary-container` at S80) folded in where they change
the advice.

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

One step down in emphasis: the tonal button, a selected state, the chef's-pick tag.

| ✅ Do | ❌ Don't |
|---|---|
| Use it where an action matters but is not *the* action | Place `primary` on `primary-container` — near-identical lightness, no separation |
| Pair it strictly with `on-primary-container` | Use `on-primary` on it |
| Use it for the tonal button (v3 moved tonal here from secondary) | Use it to signal status — status has its own families |

### secondary / secondary-container

At Oshap's seed hue `secondary` is a muted brown. **Use it for weight, not emphasis** —
navigation that is present but not shouting, a filter chip at rest.

| ✅ Do | ❌ Don't |
|---|---|
| Use `secondary-container` for the selected nav destination and selected chips | Use it as a second primary — it is deliberately quiet |
| Remember it sits at **S80**, not M3's S90 | Change it back to S90 — S90 is byte-identical to P90 here, so the nav pill and the primary tag would collide |

### tertiary-container

Categorical only — menu sections, dietary marks.

| ✅ Do | ❌ Don't |
|---|---|
| Use it to label *what a thing is* | Use it for *what state a thing is in* — never a status |
| Keep it to one meaning per screen | Mix it into the payments column, where it reads as another status chip |

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
| Follow the ladder: page `surface` → card `surface-container-low` → nested `surface-container` → dialog `surface-container-high` | Skip levels to force contrast — the ladder steps in twos on purpose |
| Step **one level up** on hover | Add a shadow to fake depth on a static block |
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
| `surface` | 4.56:1 | 4.47:1 | 6.93:1 | 7.15:1 |
| `surface-container-low` — any card | **4.29** | **4.14** | 6.53:1 | 6.63:1 |
| `surface-container` | **4.03** | **3.84** | 6.13:1 | 6.15:1 |
| `surface-container-high` — every neutral chip | **3.81** | **3.39** | 5.81:1 | 5.43:1 |

Bold is below 4.5:1. Twenty-five of these were found and replaced in one pass,
and the chips were the worst of them, because a neutral status pill is
`surface-container-high` by definition — 3.39:1 in dark mode. `on-surface-variant`
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

- **Charts have no categorical scale.** primary, secondary, tertiary and warning all sit
  within 60° of the seed, so a multi-series chart cannot separate by hue. The palette in
  `apps/admin/src/routes/analytics.tsx` separates by tone instead. A chart needing more
  series than that needs its own scale, not more design-system roles.
- **Tenant seeds near red.** A tenant seeded close to H 25 gets a primary near the fixed
  error hue, and a red "Place Order" beside a red "Void" is a genuine confusion. Nothing
  in the algorithm prevents it. Unresolved.

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
