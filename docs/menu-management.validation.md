# AdminMenuManagement — build verification

Applied to the live `apps/admin/src/routes/menu.tsx` and `LowStockBanner`, not
rebuilt as a mock. Create, edit, import, export, bulk delete, modifier groups,
recipes and the inline stock editor are untouched.

`typecheck`, `lint`, **582 tests** and `build` (3 apps) pass; **zero hex
literals** in either touched file.

## Token reconciliation (by value)

Thirteen of fourteen colours resolve to existing tokens. Nothing added to the
theme.

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
| color-9 | `#FFEDCC` | `on-warning-container` |
| color-10 | `#6B4601` | *see interpretation 1* |
| color-11 | `#1A191A` | `surface-container-low` |
| color-12 | `#009966` | `success-container` |
| color-13 | `#CCFFEE` | `on-success-container` |
| errorcolors-error-container | `#FBD0D3` | *see interpretation 2* |

Spacing reconciles by value, and the Figma scale is offset from ours: their
`spacing-lg` is 16 = our `md`; their `spacing-sm` is 8 = our `s`. Their
`spacing-md` is 12, which our scale does not have — card padding stays `p-md`
(16), a logged +4.

## What changed

1. **The title has its own line.** It was sharing a row with five actions and
   was the thing that gave way — squeezed on a phone, and pinned to the far
   left of a wide screen away from the buttons it belongs with.
2. **Availability is a pill**, matching the chips on the board and the bill
   rows. An 8px dot beside grey text was the quietest thing on the card, and it
   carried the one fact a guest can see from the menu. Unavailable reads
   neutral rather than red: it is a choice, not a fault, and the card dims
   already.
3. **The stock badge moved onto its own line.** Nested in the name column it
   sat beside a 64px thumbnail in whatever width was left, so on a phone the
   number a manager taps to restock was the narrowest thing on the card.
4. **Row actions are filled, not outlined**, and Delete is the only bordered
   one. Five outlined buttons is five sets of lines at the same weight, and the
   one action that cannot be undone looked no different from Recipe. Per the
   extract, Edit gives up its primary outline for the same neutral fill.
5. **The banner's icon moved onto the heading line.** Held to the left of
   everything it took width off the chip list beneath it — and the chips are
   the part naming the dishes about to run out. Chips are pills now, matching
   every other chip in the app.

## Interpretations logged

1. **`color-10` `#6B4601` on the low-stock chips → kept `bg-warning/20`.**
   The value is in no token and in no ramp step (`warning-10`/`-20` are
   `#654301`, `warning-30` is `#8E5D01`), so it is a colour picked freehand in
   Figma rather than a design-system decision. The code's existing chip is an
   alpha of `warning` over the container — entirely DS tokens, and it separates
   the chip from the banner in the other direction. Design-system supremacy:
   the code wins. **Worth correcting in the Figma file.**
2. **`errorcolors-error-container` `#FBD0D3` on Delete → kept `border-error` /
   `text-error`.** `#FBD0D3` is `error-container` in the *light* theme, so that
   node resolved light while everything around it resolved dark — a Figma
   artifact, not an intent. In dark, `error` is `#F8A0A6` and is the correct
   role for a border and a label. **Also worth correcting in Figma.**
3. **Thumbnails kept.** The extract's dish cards have no image node. It also
   has no checkbox, no description, no inline stock editor and no restock hint,
   all of which are live behaviour — so I read the omission as the mock being
   drawn from a text reading of the screen rather than a decision to drop
   photos from menu management. **Flagged for the user**: if the intent was to
   remove them, say so and it is a small change.
4. **The `⚠`, `☰`, `○`, `☀` and `→` glyphs are icons**, not literal text. They
   appear the same way in the TopNav, where they are plainly the menu, theme
   and sign-out controls. Rendered as the existing mingcute icons.
5. **Card padding 12 → `p-md` (16)** and body gap 14 → `gap-md` (16). Neither
   is on our spacing scale; both are inside 4px and match the dashboard cards.

## Flags

- The five toolbar buttons keep `SecondaryButton` / `PrimaryButton` at
  `size="md"` rather than the extract's 7/10 padding, per the design-system
  contract — a component keeps its own internal sizing rather than being forked
  per screen.
