# AdminDashboard(tables) — build verification

**Status:** applied to the live screen. Structure 1:1 with the extract within
the two logged interpretations below. `typecheck`, `lint`, `vitest` (559) and
`build` (3 apps) all pass; **zero hex literals** in the touched file.

The target was the running `apps/admin/src/routes/dashboard.tsx`, not a new
screen, so route registration was already done and every existing behaviour —
verify, reject, take payment, clear table — is untouched.

## Token reconciliation (by value, not by name)

Every colour in the extract resolves to an existing theme token. **Nothing was
added to the theme and nothing was hardcoded.**

| Extract | Value | Token used |
|---|---|---|
| color-1 | `#050200` | `surface` |
| color-2 | `#4D4950` | `outline-variant` |
| color-3 | `#CDCBCD` | `secondary-text` |
| color-4 | `#F2F2F2` | `primary-text` |
| color-5 | `#1F1E1F` | `surface-container` |
| color-6 | `#1A191A` | `surface-container-low` |
| color-7 | `#F56500` | `primary` |
| color-8 | `#8E0B14` | `error-container` |
| color-9 | `#F8A0A6` | `error` |
| color-10 | `#FBD0D3` | `on-error-container` |
| color-11 | `#FEDC9A` | `warning` |
| color-12 | `#331500` | *see interpretation 1* |
| color-13 | `#393739` | `surface-container-highest` |
| color-14 | `#9A949E` | `outline` |

Three values map to two token names each. Resolved by role per
`docs/color-usage.md`: `#4D4950` is a border so `outline-variant` (not
`surface-variant`); `#1A191A` is a card surface so `surface-container-low`
(not `surface-dim`).

## What changed

The extract specifies three things the code was not doing, all on the stat
cards — the text-alignment note:

1. **The label break is designed, not incidental.** `"ACTIVE\nTABLES"`,
   `"PAYMENTS TO\nVERIFY"`, `"LOW STOCK\nITEMS"`. The code let them wrap
   wherever the width landed, which is why "PAYMENTS TO VERIFY" looked broken
   on a phone. Implemented as one string per line rather than an escaped
   newline — it survives formatting and reads as the intent.
2. **Labels are centred.** `textAlign: center` in every stat label node.
3. **Labels take the card's own foreground**, not a flat grey: `primary` on a
   plain card, `on-error-container` on the lit one. A lit card now reads as one
   block of colour instead of a bright number over dim text.

Also from the extract: value type is 22px (`text-display-h1`, was
`text-display-h2` at 20px), label weight semibold (was medium), and card
padding is `px-s py-md` — 8 horizontal, 12 vertical (was a flat 8 on mobile).

## Interpretations logged

1. **`color-12` `#331500` on the "SAYS PAID" chip → kept `text-on-warning`.**
   The value matches `primary-container` / `on-primary-fixed`, neither of which
   is a text-on-warning role. The theme's actual `--ds-on-warning` is `#654301`
   and the code already used it. This is a Figma error of mine round-tripping
   back through the extract; the design system wins and the code is right.
   **Worth fixing in the Figma file** so the next extract is clean.
2. **Behaviour beyond the extract is retained.** The extract is one static
   state (0 / 0 / 2, one shared table, one empty). The live screen also renders
   claimed and part-paid bills, the verify and reject confirmations, the cash
   dialog and the clear-table prompt. These are not in the JSON and were not
   removed.

## Flags

- **The JSON arrived truncated at 50,000 characters**, cutting off inside
  `TableT1`'s "No active orders" node. The structure was complete enough to
  build from, but a larger screen will lose more — worth splitting the next
  extracts, or sending them as files.
