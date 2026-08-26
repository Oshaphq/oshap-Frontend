# AdminInventory — build verification

Applied to the live `apps/admin/src/routes/inventory.tsx`. The adjust dialog,
edit dialog, new-ingredient form and movements ledger are untouched.

Extract complete at 57 nodes — nothing truncated this time.

`typecheck`, `lint`, **593 tests** and `build` (3 apps) pass; **zero hex
literals** in the touched file.

## Token reconciliation (by value)

Nine of ten colours resolve to existing tokens. Nothing added to the theme.

| Extract | Value | Token |
|---|---|---|
| color-1 | `#050200` | `surface` |
| color-2 | `#4D4950` | `outline-variant` |
| color-3 | `#CDCBCD` | `secondary-text` |
| color-4 | `#F2F2F2` | `primary-text` |
| color-5 | `#1F1E1F` | `surface-container` |
| color-6 | `#F56500` | `primary` |
| color-7 | `#FFFFFF` | `on-primary` |
| color-8 | `#8E5D01` | `warning-container` |
| color-10 | `#1A191A` | `surface-container-low` |
| warningcolors-warning-container | `#FFEDCC` | *see interpretation 1* |

## What changed

1. **The header stacks.** Title and strapline above the two actions, not
   beside them.
2. **The strapline breaks where it was written to break** — "What your dishes
   are made of." / "Plate counts live on the menu screen." Two separate things
   to know; run together as one sentence, the second read as a qualification of
   the first.
3. **An ingredient is a card on a phone and a row in a table from `sm` up.**
   This is the substance of the extract. Collapsed to two columns, the table
   cells wrapped in reading order with the headings hidden, so a bare "3 kg"
   sat under a name with nothing saying whether it was the count or the alert
   level — on the one screen where confusing those two means ordering the wrong
   thing. The phone card puts name and threshold left, quantity and unit cost
   right, actions beneath.
4. **Edit is a labelled button.** It was a bare pencil with an `aria-label`,
   which reads fine to a screen reader and tells a sighted manager nothing. Per
   the extract, Adjust is filled and Edit outlined — the everyday action and
   the occasional correction, in that order.
5. **The banner is one sentence**, tighter, with the icon on the line. At one
   or two ingredients, a heading with a list under it was a paragraph break for
   five words.

The desktop table keeps its shared subgrid. The tracks are shared with the
header row rather than merely matching it, which is what stopped the columns
drifting out of step; the phone card is `sm:hidden` and takes no track.

## Interpretations logged

1. **`#FFEDCC` on the low quantity → `text-warning`.** On the banner the value
   is correct and unchanged (`on-warning-container` over `warning-container`).
   On the ingredient row it is a quantity on a plain card, where the dark
   theme's text-on-surface warning role is `warning` (`#FEDC9A`) — using a
   container's *on-* colour on a surface that is not that container would be
   wrong. The extract's variable is also named `warning-container` while
   carrying the light-theme value, the same light-in-a-dark-frame artifact as
   the menu's Delete button. **Worth correcting in Figma.**
2. **Both phone sub-lines are labelled**, against the extract. It leaves "2
   bags" and "₦30,000" bare. "Alert at 2 bags" and "₦30,000 / bag" cost four
   characters each and remove a real ambiguity — the numbers are otherwise
   distinguishable only by position, and a manager reading the wrong one orders
   the wrong amount. Flagged rather than assumed.
3. **The rows are one card with dividers, per the extract** — not one card per
   ingredient. Already how the code worked; noted because it is the opposite of
   the menu screen, where each dish *is* its own card.
4. **Card padding 12 → `p-md` (16)**, body gap 14 → `gap-md` (16), row gap 2 →
   `gap-0.5` (2). The Figma spacing scale is offset from ours: their `lg` is 16
   = our `md`, their `sm` is 8 = our `s`, and their `md` of 12 has no
   equivalent.
5. **`⚠`, `☰`, `○`, `☀`, `→` are icons**, not literal glyphs — same as the
   menu extract. Rendered with the existing mingcute set.

## Flags

- **The ₦ figure is unit cost, not stock value.** Worth confirming: beans
  ₦30,000/bag, rice ₦50,000/bag, chicken ₦4,500/kg all read as real prices,
  whereas as totals they would imply ₦750/bag beans. Rendered as
  `cost_per_unit`, which is the field that exists.
- Toolbar buttons keep `SecondaryButton` / `PrimaryButton` at `size="md"`
  rather than the extract's 7/10 padding, per the design-system contract.
