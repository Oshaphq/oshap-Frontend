# Design Review Audit: DS v3 foundation — surfaces, nesting, spacing

Date: 2026-11-16 · Scope: `apps/customer`, `apps/admin`, `apps/platform`, `packages/shared/src/ui`, `tokens.css`, `docs/color-usage.md`

## Status: PASS WITH FLAGS

### Executive summary

Text contrast is sound: every text/on-colour pair clears AA, and the `outline`-as-text sweep held. The weak point is **surface separation**. Each rung of the light ladder is 1.06:1 from the next, so a card on the page, a block in a card, and a neutral button in a card all read as one flat sheet. Dialogs make it worse by placing *lighter* fills inside a darker panel. Spacing is on-token almost everywhere; the gaps are a missing 2px step, three card paddings with no rule, and a handful of numeric utilities.

### Measured surface separation (WCAG luminance ratio)

| Pair | Light | Dark |
|---|---|---|
| page `surface` → card `container-low` | **1.06** | **1.08** |
| card → nested `container` | **1.06** | **1.08** |
| nested → `container-high` | **1.06** | 1.13 |
| card → `container-high` (neutral badge, table header) | 1.12 | 1.22 |
| card → `outline-variant` (dividers) | 1.32 | 1.41 |
| card → tonal button `primary-container` | 1.18 (hue helps) | 1.91 |
| card → `outline` (field and outlined-button borders) | 4.29 | 4.14 |

No WCAG rule requires a card boundary to reach 3:1 (a card is not a control), so most of these are not failures. They are why the UI feels flat. For comparison, iOS grouped lists sit at about 1.11 page-to-card, and the products in the research below use 1.10–1.20 or a hairline.

### Detailed findings

#### Blockers (must fix)

- **[ACCESSIBILITY ISSUE]** Five raw form fields skip `TextField` and draw their boundary in `outline-variant`, about 1.3:1 against their surface, below the 3:1 that WCAG 1.4.11 asks of an input boundary. `TextField` fixed this for 45 fields; these were missed.
  - `apps/admin/src/components/CashPaymentDialog.tsx:175`, `apps/admin/src/components/BrandColourField.tsx:58`, `apps/admin/src/routes/order-detail.tsx:317`, `apps/customer/src/routes/orders.tsx:224` and `:243`, plus one in `apps/admin/src/routes/menu.tsx`.
  - *Recommendation:* Move them to `TextField` (border `outline`, 4.29:1).
- **[ACCESSIBILITY ISSUE]** Customer quantity steppers and the header control are 32px (`w-8 h-8`), against the 48px customer minimum in `color-usage.md`. They pass WCAG 2.2's 24px floor, but they are the controls a guest taps most, on a phone, at a table.
  - `apps/customer/src/components/MenuCard.tsx:149,166`, `CartDrawer.tsx:92,105`, `CustomerHeader.tsx:67`, `routes/landing.tsx:286`.
  - *Recommendation:* Keep the 32px visible circle and give it a 48px hit area through padding, or use `IconButton` `touch`.

#### Warnings and flags

- **[DESIGN-SYSTEM VIOLATION] The ladder cannot separate nested surfaces.** At 1.06 per rung, "nested block in a card" (`container` on `container-low`) is effectively invisible, and the doc forbids skipping a rung to force contrast. The rule produces the problem the user sees. This is a foundation issue, not a call-site one. See *Foundation options* below.
- **[DESIGN-SYSTEM VIOLATION] Dialogs invert the ladder.** `Dialog` is `container-high` (#E8E8E8), but its close button (`Dialog.tsx:178`) and the blocks inside dialogs use `container` (#EEEEEE), which is *lighter* than the panel. The same happens in `CashPaymentDialog.tsx:126,152,183`, `ServeDialog`, `MenuImportDialog`, `ModifierGroupsDialog` and `inventory.tsx`. Elevation reads backwards: the inner block looks like a hole.
  - *Recommendation:* Content inside an overlay steps one rung *above* the overlay (or the overlay becomes the lightest surface; see Option A).
- **[DESIGN-SYSTEM VIOLATION] Neutral controls on cards vanish.** `IconButton` `surface` (`container` fill) on a card is 1.06:1, so the 48px circle disappears and only the glyph remains. `StatusBadge` `neutral` on a card is 1.12:1, so its pill shape is lost. `Chip.tsx` still rests on `container-high`, although the doc says chips are outlined at rest.
  - *Recommendation:* A rule for any control placed on a card: it is outlined (`outline`), carries chroma (primary or tonal), or uses a neutral fill at least two rungs from its parent. Never one rung.
- **[DESIGN-SYSTEM VIOLATION] `elevated` button is the card colour.** `Button` `elevated` fills with `container-low`, the same as `Card`, so on a card it is 1.00:1 and rests on `shadow-sm` alone. Nothing uses it yet (0 call sites); fix it before something does.
- **[DESIGN-SYSTEM VIOLATION] Table dividers are invisible.** `DataTable.tsx:105,123` divides rows with `container-highest` on a `container-low` card (1.12:1) and hovers with `container` (1.06:1).
  - *Recommendation:* Dividers in `outline-variant` (1.32:1), as the doc already says; hover two rungs up.
- **[DESIGN-SYSTEM VIOLATION] Customer pay page breaks the page rule.** `apps/customer/src/routes/pay.tsx:113,183,254,296` paints the page `container-low`, and sections are split by `border-b-[6px] border-surface-container` (1.06:1, plus an arbitrary width).
- **[DESIGN-SYSTEM VIOLATION] Card padding has no rule.** Cards ship at three paddings with nothing deciding which: `md` 16px (~35 sites), `l` 24px (~16), `xl` 32px (7). `Card.tsx` says this is "a design question … not settled". It needs settling now.
- **[DESIGN-SYSTEM VIOLATION] Spacing scale gaps.**
  - No 2px step, yet half-steps appear 52 times (`gap-0.5` ×33, `mt-0.5` ×12, `py-0.5` ×5, `ml-0.5` ×2).
  - Off-token numerics: `pb-10`, `py-10` (= `2xl`), `pr-10`/`pr-12` (field trailing clearance), `-mt-20`, `bottom-16`, `py-3`, `px-1`, `space-x-2`.
  - `Button` `lg` uses `px-7` (28px), off the scale.
  - `--spacing-button-py` / `--spacing-button-px` are defined and used nowhere.
  - No 12px step, and nothing asks for one (`gap-3`/`p-3`: 0 uses). The evidence does not support adding it.
- **[DESIGN-SYSTEM VIOLATION] Icon sizes use Tailwind's text scale.** `text-xl` ×27, `text-lg` ×24, `text-2xl` ×12 size glyphs. The doc names four icon sizes (24/20/18/32) with no tokens behind them.

#### Non-blocking suggestions

- **[TASTE PREFERENCE]** The designer's stated surface preference is "the higher a surface, the lighter it is, in light and dark mode", with cards needing no border. DS v3 light mode does the opposite (the M3 convention: page #FCFCFC, dialog #E8E8E8). Dark mode already follows the preference.
- **[TASTE PREFERENCE]** The designer's stated spacing preference is a golden-ratio scale (4 · 6 · 10 · 17 · 27 · 44 · 72 · 116). DS v3 is a 4pt grid. Established product decisions outrank taste, so this is flagged, not applied.

### Research (Mobbin)

Two patterns recur in shipped products. None stacks three near-identical greys.

1. **White card on a grey page, grey well inside the card.** Lighter = raised, darker = inset. [Square](https://mobbin.com/screens/69d0ecc8-d1a2-4f0a-8ea8-50c86ab5cffd), [Grok](https://mobbin.com/screens/8e841cd4-103b-4f79-8b4b-587454012884), [Mercury](https://mobbin.com/screens/f653a589-f789-41ad-a81a-23e2652e02f4), [Swiggy](https://mobbin.com/screens/e5d757f7-7832-4f16-a21a-f7a39baec4c0), [Taco Bell](https://mobbin.com/screens/3bf824e4-46c0-4195-8552-9bffa7626933).
2. **Hairline-bordered card on a white page.** [Etsy](https://mobbin.com/screens/e270a8e0-1d21-48f3-8e1f-61437c8bf9d9), [Deliveroo](https://mobbin.com/screens/8e6edaaa-9cf5-469b-a8b3-cf4f6431402d), [Wolt](https://mobbin.com/screens/6d4a1a5a-6964-4f61-afe0-0a1685d9f0ca).

Buttons and chips inside cards are outlined (Deliveroo, Wolt, foodpanda) or a clearly darker neutral fill on a white card (Snoonu, sweetgreen). The one filled brand button stays outside the card or alone in it.

### Foundation options (decision needed)

**Option A: lighter is higher (recommended).** It matches the research, the designer's taste, and dark mode as it already works.

| Role | Light | Dark |
|---|---|---|
| Page | `grey-96` #F2F2F2 | `grey-17` #0F0F0F |
| Card, sheet, rail | `grey-100` #FFFFFF (1.12 vs page) | `grey-26` #242424 (1.23) |
| Nested well in a card | `grey-96` #F2F2F2 (1.12, reads as inset) | `grey-21` #181818 |
| Neutral control on a card | `grey-93` #E8E8E8 (1.23) | `grey-32` #333333 |
| Dialog, menu | `grey-100` + shadow over scrim | `grey-30` #2E2E2E + shadow |

Cost: it reverses the documented "page is near-white #FCFCFC" rule in `CLAUDE.md`, `AGENTS.md` and `color-usage.md`, and the M3 role names stop meaning darker-is-higher in light mode. Tonal buttons on a white card drop to 1.00:1 luminance; they still separate by hue, and their labels stay at 12.97:1.

**Option B: keep the direction, widen the gaps.** Page and card unchanged. Nested blocks and neutral controls go two rungs up (`container-high`, 1.12 vs card), the doc drops "never skip a rung", and dialog content steps above the dialog. Less churn, but the card itself still sits at 1.06 on the page.

### Recommended action items

1. Choose Option A or B, then re-solve the ladder in `tokens.css` and rewrite the Surfaces section of `color-usage.md`.
2. Add the "control on a card" rule (outlined, chroma, or at least two rungs) and apply it to `IconButton` `surface`, `StatusBadge` `neutral`, `Chip`, `Button` `elevated`.
3. Fix the inverted fills inside `Dialog` and the six dialogs listed.
4. Move the five raw fields to `TextField`.
5. Give the customer steppers 48px hit areas.
6. Spacing: add `2xs` 2px; map off-token numerics to tokens; `Button` `lg` to `px-l`; delete the unused `--spacing-button-*` tokens.
7. Card padding rule: `md` for tiles and list items, `l` for section cards, `xl` only for empty and auth states.
8. Add icon-size tokens (18/20/24/32) and replace `text-lg`/`text-xl`/`text-2xl` on glyphs.

### Decisions (2026-11-16)

- **Surfaces: Option A, lighter is higher.** Applied in `tokens.css` and `docs/color-usage.md`. Added `surface-overlay` for dialogs, menus, sheets and the admin bulk-action bar. Neutral controls on cards moved to `surface-container-high`. Card hover is now `shadow-sm`, since a tone change would sink a white card into the page. Dark mode now uses grey-24 cards on a grey-17 page, grey-30 controls and a grey-26 overlay. `on-surface-variant` still clears 4.5:1 on every control state.
- **Spacing: golden ratio**, chosen over patching the 4pt grid because fewer steps leave fewer wrong choices. The scale is 4 · 6 · 10 · 17 · 27 · 44 · 72 · 116. Every call site was moved by `scripts/codemod-golden-spacing.mjs`, and `packages/shared/src/tokens/spacing.test.ts` rejects numeric padding, margin and gap.
- **Fixed in the same change:** the inverted fills inside dialogs, the table dividers, and the five low-contrast raw field borders (now `outline`, 4.67:1).
- **Still open:** moving the raw fields onto `TextField`; 48px hit areas for the customer steppers; icon-size tokens; radius on the golden scale (the taste notes ask for it, but this change does not touch it).

### Revision (2026-11-17): light mode follows the documented convention

Option A ("lighter is higher" in light mode) is reversed. The designer settled the rule against Material 3, Apple UIKit and Radix Colors: nesting steps away from the page. That means darker per level in light mode and lighter per level in dark mode. Their reference sites (Apple, Calendly, Kuda, Grey) all ship it.

The 1.06 failure was step size, not direction, so the steps are wider:
- Light: page white, card grey-96 (1.12), well and field grey-93 (1.09), control grey-90 (1.20 on a card).
- Dialogs, menus and sheets take the card tone, which is darker than the page as in M3.
- Placeholder text moves to grey-50 so it clears 4.5:1 in the darker field (4.90).
- Card hover becomes a tone step (`surface-container-high`) instead of a shadow.
- Dark mode is unchanged.
