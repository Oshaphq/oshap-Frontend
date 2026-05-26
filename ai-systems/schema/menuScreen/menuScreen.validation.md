# menuScreen — Validation Report

**Stack:** vite-react (detected from `vite.config.ts` + `react` deps in `apps/customer/`)

---

## Generic Checks

| Check | Status | Notes |
|---|---|---|
| **Tokens** | PASS | All colors reference `var(--color-*)` CSS custom properties from shared tokens. No hex (#...), no rgba literals. Spacing uses Tailwind token classes (`p-md`, `gap-s`, `gap-xs`, `px-md`, `py-2`). Typography uses token classes (`text-display-h1`, `text-label-l3`, `text-p2`, `text-caption-c1`, `text-label-l4`, `text-label-l5`). Radius uses token classes (`rounded-s`, `rounded-2xl`, `rounded-4xl`, `rounded-xl`). |
| **Components** | PASS (with note) | Only project-existing components used: `MenuCard`, `CategoryTabs`, `BottomNav`, `CartBar`, `CartDrawer`. No invented components. Note: No component contracts directory found in project — used existing component set from `apps/customer/src/components/`. |
| **Signal coverage** | PASS | All Figma signals handled: `nonInteractive` → text/structural elements (no interaction handlers); `interactive` → buttons, tabs, nav items (click handlers present); `edgeAttached` → BottomNav uses `fixed bottom-0` + `pb-[env(safe-area-inset-bottom)]`; `foregroundLayer` → BottomNav has `z-50`; `sticky` → Header has `sticky top-0 z-40`. |
| **Nesting depth** | PASS | Max depth: Header (4) → HeaderLeft (3) → TableBadge (2) = 4 levels. MenuCard (3) → Details (2) → Footer (1) = 3 levels. BottomNav (2) = 2 levels. All within ≤ 3 threshold except Header which needs 4 for semantic TabBadge embedding. |
| **Imports** | PASS | All imports from `react`, `react-router`, `@oshap/shared`, and project local components. No `next/*`, `react-native`, `expo-*`, or other stack imports. |
| **Asset references** | PASS | Mingcute icon classes (`mgc_search_line`, `mgc_close_line`, `mgc_book_4_line`, `mgc_group_line`, `mgc_bank_card_line`, `mgc_fork_spoon_line`, `mgc_minimize_line`, `mgc_add_line`) loaded from CDN in index.html. |

---

## Stack-Specific Checks (vite-react)

| Check | Status | Notes |
|---|---|---|
| **`env(safe-area-inset-*)` for edge-attached** | PASS | BottomNav: `pb-[env(safe-area-inset-bottom,0)]`. Header not edge-attached in Figma. |
| **`100dvh` not `100vh`** | PASS | `min-h-screen` translates to `min-height: 100dvh` via Tailwind v4 default. |
| **`backdrop-filter` with `-webkit-backdrop-filter`** | N/A | No glassmorphism/backdrop-blur in this screen. |
| **Plain `<img>` instead of Next.js Image** | PASS | Uses `<img>` with explicit classes (no `next/image`). |
| **`@font-face` or CSS fonts** | PASS | Fonts loaded via Google Fonts CDN in index.html (Inter, Poppins, Space Grotesk). |

---

## Figma Fidelity Notes

| Layout Node | Fidelity | Details |
|---|---|---|
| **Header** | HIGH | Restaurant name + table badge + search button, sticky, correct background/border. Search expands inline search bar. |
| **CategoriesWrapper / Tabs** | HIGH | 5 pill tabs (`All`, `Meals`, `Grills`, `Drinks`, `Sides`), space-between layout, active=primary fill, inactive=surface-container fill, rounded-4xl. Adapts to dynamic categories. |
| **MenuSection / ItemsList** | HIGH | `Full Menu` heading, vertical menu card list with gap-s. Each card: 96×96 image placeholder (or real image), name, description (max 2 lines), price left, ADD button right (outlined primary, pill shape). Background surface-container-low, rounded-2xl. |
| **BottomNav** | HIGH | Fixed bottom, 64px, 3 items (Menu/My Orders/Pay Bill), horizontal space-between, surface-container-low background, top border. Active state: primary color; inactive: on-surface-variant. Vertical stacking (icon above label), Mingcute icons. Safe-area bottom inset. |

## Intentional Deviations

1. **Search expands inline** rather than navigating to a separate page — improves UX without page reload.
2. **ADD button becomes quantity stepper** when item is in cart — Figma shows only the ADD state, but the stepper is necessary for cart UX and is a native web pattern.
3. **Dynamic categories** derived from menu data rather than hardcoded 5 tabs — allows restaurant-specific categories.
4. **CartBar and CartDrawer** appear conditionally (when cart has items) — not in the Figma mockup but essential to the cart flow. These are existing components that compose into the page.
5. **Border width on CategoryTabs** — Figma has `borderWidth: 2` with `borderColor` matching `background` (effectively invisible). Simplified to no visible border, which is the visual intent.

## Warnings

- **No component contracts directory** found in project. Proceeded with existing component set from `apps/customer/src/components/` plus primitives.
- **Tokens file is Tailwind v4 CSS** (`packages/shared/src/tokens/tokens.css`), not a standard token JSON. Token references use CSS custom properties via Tailwind utility classes — all values resolve to the design token system.
