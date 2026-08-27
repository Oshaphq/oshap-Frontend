# AdminNotifications — build verification

Applied to the live page and to the shared `NotificationRow`, which the bell's
panel renders too, so both surfaces move together.

Extract complete at 47 nodes.

`typecheck`, `lint`, **599 tests** and `build` (3 apps) pass; **zero hex
literals** in either touched file.

## Token reconciliation (by value)

All ten colours resolve to existing tokens. Nothing added to the theme.

| Extract | Value | Token |
|---|---|---|
| color-1 | `#050200` | `surface` |
| color-2 | `#4D4950` | `outline-variant` |
| color-3 | `#CDCBCD` | `secondary-text` |
| color-4 | `#F2F2F2` | `primary-text` |
| color-5 | `#1F1E1F` | `surface-container` |
| color-6 | `#F56500` | `primary` |
| color-7 | `#FFFFFF` | `on-primary` |
| color-8 | `#1A191A` | `surface-container-low` |
| color-9 | `#FEDC9A` | `warning` |
| color-10 | `#99FFDD` | `success` |

**No conflicts this time** — the first extract of the four that maps clean.
The icon colours in particular already agreed with the code: a call and a card
request are `primary`, money is `warning`, food is `success`.

## What changed

**A claimed row is still a row.** This is the whole of it. A resolved
notification faded to 60% and swapped its type icon for a generic tick, so a
Saturday's history was a column of ghosts — and the fade threw away the one
thing that makes the page scannable, because the icon says what *kind* of thing
happened, not whether it is finished. The extract keeps every row at full
strength with its own icon, in its own colour, claimed or not. Whether it is
finished is what the line underneath is for: *"40m · Haye Binjo went"*.

Smaller, from the same extract:

- Rows are **centred**, not hung off the top of the icon.
- Bucket headings (`NOW`, `EARLIER TODAY`) sit **flush with the cards they
  label** instead of indented 8px into them, and take the extract's wider
  tracking.
- The **claim pill** gets 4px of vertical padding instead of 2. At 2 it read as
  a label rather than a button.
- The **filter row** is centred at the page's own gap, and the page rhythm
  drops from `gap-l` (24) to `gap-md` (16) to match the extract's 14.

## Interpretations logged

1. **Dropping the fade loses nothing that was load-bearing.** Claimed state is
   still explicit in the meta line, and the claim button's absence is itself a
   signal. This applies to the bell's panel as well as the page, since they
   share the row — and in the panel the trade is the same: an unresolved call
   stands out because it is the one carrying *I'll go*, not because everything
   around it is dimmed.
2. **Tracking `0.8px` at 9px → `tracking-widest`** (0.1em = 1px at our 10px
   caption). 0.2px off; the nearer alternative, `tracking-wider`, is 0.5px off
   in the other direction.
3. **Group-card radius 12 → `rounded-md` (16)**, row radius 8 → `rounded-s`.
   The Figma scale is offset from ours and 12 has no equivalent, as on the last
   three screens.
4. **`🔔`, `💳`, `🧾`, `🍽`, `☐`, `▾` are icons and controls**, not literal
   glyphs — rendered with the existing mingcute set and the real `Select` and
   checkbox.
5. **Header and toolbar stay one wrapping row.** Unlike the menu and inventory
   extracts, this one keeps the title beside its two actions with `wrap: true`,
   and the code already did exactly that.
