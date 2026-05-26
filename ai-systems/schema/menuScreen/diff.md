# Menu screen — Figma vs Code diff

Source of truth on the Figma side: `menuScreen.raw.json` (extracted 2026-05-25 from node `2009:2`).
Source of truth on the code side: [src/app/menu/page.tsx](../../../src/app/menu/page.tsx),
[src/app/menu/page.module.css](../../../src/app/menu/page.module.css),
[src/components/MenuCard.{tsx,module.css}](../../../src/components/MenuCard.tsx),
[src/components/CategoryTabs.{tsx,module.css}](../../../src/components/CategoryTabs.tsx),
[src/components/BottomNav.{tsx,module.css}](../../../src/components/BottomNav.tsx).

`✓ match` = code matches Figma. `⚠ drift` = different value; needs reconciliation. `+ extra in code` / `− missing from Figma` = only on one side.

---

## 1. Structural drift (entire sections that disagree)

| Section                       | Status         | Notes                                                                                     |
| ----------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| Header                        | ✓ match        | Same shape: `HeaderLeft` (restaurant name + table badge) + `SearchButton`                 |
| Search bar (expandable)       | + extra in code | `searchOpen` state + animated search input row at [page.tsx:239-251](../../../src/app/menu/page.tsx#L239-L251). No equivalent in Figma. |
| Order Together row            | + extra in code | Avatar group + "Order Together" + chevron at [page.tsx:254-264](../../../src/app/menu/page.tsx#L254-L264). Figma has it hidden/removed. |
| Categories wrapper            | ✓ match        | Same layout, same colors                                                                  |
| Menu Section + cards          | ✓ match        | Same outer shell; per-card drift below                                                    |
| Cart Bar (floating)           | + extra in code | Conditional on cart having items. Not in Figma's static screen.                           |
| Cart Drawer                   | + extra in code | Conditional overlay. Not in Figma.                                                        |
| Bottom Nav                    | ✓ match        | Same 3 items, same active-state mapping                                                   |

> **Recommendation.** Decide whether the Search bar + Order Together row stay
> in the product. If yes, add them back to the Figma file as named variants
> of the Menu screen. If no, delete them from the code.

---

## 2. Color tokens

All colors below are matched against the bound Figma variable name, not the
hex. Code uses the right semantic variable in every case audited.

| Element                         | Figma                          | Code                                         | Status |
| ------------------------------- | ------------------------------ | -------------------------------------------- | ------ |
| Page background                 | `surface`                      | `var(--color-surface)`                       | ✓      |
| Header background               | `surface-container-low`        | `var(--color-surface-container-low)`         | ✓      |
| Table Badge background          | `primary-container`            | `var(--color-primary-container)`             | ✓      |
| Table Badge text                | `on-primary-container`         | `var(--color-on-primary-container)`          | ✓      |
| Search button background        | `surface-container`            | `var(--color-surface-container)`             | ✓      |
| Categories wrapper background   | `surface-container-low`        | `var(--color-surface-container-low)`         | ✓      |
| Categories wrapper border-bottom| `outline-variant` 1px          | `1px solid var(--color-outline-variant)`     | ✓      |
| Tab/Active fill + border        | `primary` (2px border)         | `var(--color-primary)` (2px border)          | ✓      |
| Tab/Active text                 | `on-primary`                   | `var(--color-on-primary)`                    | ✓      |
| Tab/Inactive fill               | `surface-container`            | `var(--color-surface-container)`             | ✓      |
| Tab/Inactive border             | 2px `surface-container`        | `2px solid transparent`                      | ⚠ drift — same visual result but different tactic. Use one or the other consistently. |
| Tab/Inactive text               | `on-surface-variant`           | `var(--color-on-surface-variant)`            | ✓      |
| Section title color             | `primary-text`                 | `var(--color-primary-text)`                  | ✓      |
| Menu card background            | `surface-container-low`        | `var(--color-surface-container-low)`         | ✓      |
| Menu card image background      | `primary-container`            | `var(--color-primary-container)`             | ✓      |
| Item name color                 | `primary-text`                 | `var(--color-primary-text)`                  | ✓      |
| Item description color          | `secondary-text`               | `var(--color-secondary-text)`                | ✓      |
| Price color                     | `primary-text`                 | `var(--color-primary-text)`                  | ✓      |
| ADD button border               | `primary`                      | `var(--color-primary)`                       | ✓      |
| ADD button text                 | `primary`                      | `var(--color-primary)`                       | ✓      |
| Bottom nav background           | `surface-container-low`        | `var(--color-surface-container-low)`         | ✓      |
| Bottom nav top border           | `outline-variant` 1px          | `1px solid var(--color-outline-variant)`     | ✓      |
| Nav item active                 | `primary` (icon + text)        | `var(--color-primary)`                       | ✓      |
| Nav item inactive               | `on-surface-variant`           | `var(--color-on-surface-variant)`            | ✓      |

**Verdict:** color bindings are clean. Just the one minor "transparent
border vs same-color border" mismatch on inactive category tabs.

---

## 3. Typography

Code still uses the **old** `--{h1,h5,h6,p,caption-md,caption-sm}-*`
typography vars from `responsive.json`. The Figma file has migrated to
`Display/`, `Label/`, `Paragraph/`, `Caption/` styles backed by the new
`--text-*` vars. Sizes line up; **weights and font-families diverge in 4
places**.

| Element              | Figma style                              | Figma values            | Code values                                            | Status |
| -------------------- | ---------------------------------------- | ----------------------- | ------------------------------------------------------ | ------ |
| Restaurant name      | `display-h1-poppins-bold-700`            | Poppins **Bold** 24     | Poppins **Bold** 24 (`--h5-font-size`, `--fw-bold`)    | ✓ values match — but should use `--text-display-h1-bold-*` |
| Table Badge text     | `label-l5-inter-semi-bold-700`           | Inter Semi Bold 12      | Inter Semi Bold 12 (`--caption-sm-font-size`, `--fw-semibold`) | ✓ values match — but should use `--text-label-l5-semibold-*` |
| Section title        | `display-h2-poppins-semi-bold-600`       | Poppins **SemiBold** 20 | Poppins **Bold** 20 (`--h6-font-size`, `--fw-bold`)    | ⚠ **weight drift** (700 vs 600) |
| Menu item name       | `label-l3-inter-semi-bold-700`           | **Inter** Semi Bold 16  | **Poppins** Semi Bold 16                               | ⚠ **family drift** (Inter vs Poppins) |
| Menu item description| `paragraph-p2-inter-reg-400`             | Inter Regular 14        | Inter Regular 14 (`--caption-md-*`)                    | ✓ values match — should use `--text-paragraph-p2-reg-*` |
| Menu item price      | `label-l3-inter-semi-bold-700`           | **Inter** **SemiBold** 16 | **Poppins** **Bold** 16                               | ⚠ **family + weight drift** (Inter SemiBold vs Poppins Bold) |
| ADD button text      | `label-l4-poppins-semi-bold-600`         | Poppins **SemiBold** 14 | Inter (default) **Bold** 14 (`--fw-bold`)              | ⚠ **family + weight drift** (Poppins SemiBold vs Inter Bold) |
| Category tab text    | `label-l4-inter-med-500`                 | Inter Medium 14         | Inter Medium 14 (`--caption-md-*`, `--fw-medium`)      | ✓ values match — should use `--text-label-l4-med-*` |
| Bottom nav label     | `caption-c1-inter-reg-400`               | Inter **Regular** 12    | Inter **Medium** 12 (`--fw-medium`)                    | ⚠ **weight drift** (400 vs 500) |

> **Recommendation.** Migrate the menu screen's CSS modules to the new
> `--text-{slug}-*` vars in one pass — it'll automatically fix the
> family/weight drifts above because each `--text-*-font-family` and
> `--text-*-font-weight` carries the right value.

---

## 4. Spacing / radii / borders

| Element                       | Figma                                | Code                                                 | Status |
| ----------------------------- | ------------------------------------ | ---------------------------------------------------- | ------ |
| Header padding                | `m` (16) all sides                    | `var(--spacing-md)`                                  | ✓      |
| HeaderLeft gap                | `s` (8)                              | `var(--spacing-s)`                                   | ✓      |
| Table Badge padding           | `s` (8)                              | `var(--spacing-xs) var(--spacing-s)` (4 / 8)         | ⚠ **drift** — Figma uses 8 all around; code uses 4 vertical / 8 horizontal |
| Categories wrapper padding-x  | 16                                    | `0 var(--spacing-md)`                                | ✓      |
| Categories tabs layout        | `space-between` justify, padding-y 16 | `gap: var(--spacing-s)`, padding-y 16, `overflow-x: auto` | ⚠ **strategy drift** — Figma stretches 5 tabs across full width; code uses fixed gap + horizontal scroll. On mobile widths they look similar; on wider screens behaviour diverges. |
| Tab padding                   | 8 / 16                                | `var(--spacing-s) var(--spacing-md)`                 | ✓      |
| Tab border radius             | `radius-100` (100, full pill)         | `var(--radius-xl)` (32)                              | ⚠ **drift** — Figma is fully rounded; code uses 32px. Visually similar at small heights but not the same token. |
| Section title                 | -                                    | margin-bottom `var(--spacing-md)`                    | OK (Figma uses Menu Section gap instead — same outcome) |
| ItemsList gap                 | `s` (8)                              | `gap: var(--spacing-xs)` (4)                         | ⚠ **drift** (8 vs 4) |
| Menu card                     | padding `m`, gap `m`, radius `xl` (16) | padding `var(--spacing-md)`, gap `var(--spacing-md)`, radius `var(--radius-md)` (16) | ✓ (radius value matches even though Figma names it `radius-xl`) |
| Menu card border-bottom       | 1px                                  | `1px solid var(--color-outline-variant)`             | ✓      |
| Image dimensions              | 96 × 96                              | 96 × 96                                              | ✓      |
| Image border radius           | `s` (8)                              | `var(--radius-s)`                                    | ✓      |
| Details gap                   | `s` (8)                              | (vertical flex with `justify-content: space-between` — no gap token) | ⚠ **strategy drift** |
| Top stack gap                 | `xs` (4)                             | `margin-bottom: var(--spacing-xs)` between Name & Description | ✓ value matches via different mechanism |
| Footer (price + ADD)          | horizontal, `space-between`, center  | horizontal, `space-between`, center, gap `var(--spacing-s)` | ✓      |
| ADD button                    | padding 8/24/8/24, **1.5px** border, radius `s` (8) | height 32, padding `0 var(--spacing-l)` (0/24/0/24), **2px** border, radius `var(--radius-s)` | ⚠ **drift** — border `1.5px` (Figma) vs `2px` (code); vertical padding implicit-via-height in code vs explicit `8` in Figma |
| Bottom nav padding-x          | 24                                   | (computed; uses `justify-content: space-around`)     | ⚠ **drift** — Figma uses `space-between` + padding-x 24; code uses `space-around` and no explicit horizontal padding |
| Bottom nav item               | gap `spacing-2xs` (2), padding 4/16  | `gap: 2px`, padding `var(--spacing-xs) var(--spacing-md)` (4/16) | ✓      |

---

## 5. Icons

| Icon                                    | Figma                                 | Code                                  | Status |
| --------------------------------------- | ------------------------------------- | ------------------------------------- | ------ |
| Search button                            | `⌕` Unicode glyph (placeholder)       | `mgc_search_line` (MingCute)          | + code ahead |
| Menu card image placeholder              | `◧` Unicode glyph (placeholder)       | `mgc_fork_spoon_line` (MingCute)      | + code ahead |
| Order Together chevron                   | n/a (row removed)                     | `mgc_right_line`                      | + code only |
| Bottom nav — Menu (active)               | IconBook (Lucide-ish stroke vectors)  | `mgc_book_4_line`                     | ✓ both real icons |
| Bottom nav — My Orders                   | IconUsers                             | `mgc_group_line`                      | ✓      |
| Bottom nav — Pay Bill                    | IconCard                              | `mgc_bank_card_line`                  | ✓      |

> **Recommendation.** Replace Figma's two remaining Unicode placeholders
> (`⌕`, `◧`) with the matching stroke vectors so the design matches what
> ships.

---

## 6. State / interactivity differences

| Concern                                                                   | Code                                                                                            | Figma                                  |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------- |
| Restaurant name and table id are dynamic (`fetch /api/table/{tableId}`)   | Yes, fallback "Aji's Kitchen" / "T1"                                                            | Static strings                          |
| Menu data is fetched from `/api/menu`                                     | Yes, with `DEMO_MENU` fallback                                                                  | Static 4 cards                          |
| Loading state with spinner                                                | Yes                                                                                              | Not represented                        |
| Empty/filtered state ("No items found in this category.")                 | Yes                                                                                              | Not represented                        |
| Search filter logic                                                       | Yes — case-insensitive name match                                                               | Not represented                        |
| Cart Bar appears when cart has items                                      | Yes (`CartBar` returns null if `totalItems === 0`)                                              | Not represented                        |
| Cart Drawer slides up                                                     | Yes (`CartDrawer`)                                                                              | Not represented                        |
| Order Together row tap → `/orders?table=...`                              | Yes                                                                                              | Row hidden / removed                    |
| `Menu` is active in Bottom Nav on `/menu`                                 | Yes (via `usePathname()`)                                                                       | ✓ Figma variant `ActiveTab=menu`        |

---

## 7. Action items (prioritized)

1. **Decide on Order Together row** — keep in code & re-add to Figma, or
   delete the code block. Right now the design and product disagree.
2. **Decide on Search bar** — same question. Add as a Figma variant or
   remove from code.
3. **Migrate menu CSS modules to `--text-{slug}-*` vars.** This fixes the
   weight drift on section title (700 → 600), the family drift on item
   name + price (Poppins → Inter), and the family + weight drift on ADD
   button (Inter Bold → Poppins SemiBold).
4. **Fix bottom-nav label weight** from Medium 500 to Regular 400 (or push
   Figma the other direction — decide once).
5. **Reconcile ItemsList gap**: 8 in Figma, 4 in code. Pick one.
6. **Reconcile ADD button border**: 1.5 in Figma, 2 in code. Pick one.
7. **Reconcile Table Badge padding**: 8/8 in Figma, 4/8 in code. Pick one.
8. **Reconcile category tab corner radius**: `radius-100` in Figma vs
   `--radius-xl` (32) in code. Pick one. If we want the pill shape, code
   should use `var(--radius-4xl)`.
9. **Reconcile bottom-nav layout**: `space-between` + padding-x 24 in
   Figma vs `space-around` in code. Same goal, different math.
10. **Replace Figma's `⌕` and `◧` Unicode placeholders** with the matching
    MingCute (or Lucide) icons so design = code.
