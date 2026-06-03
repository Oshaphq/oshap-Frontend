# Color Usage Rule

**Canonical surface/elevation rule for all Oshap apps** (customer, admin, platform).
Derived from the customer app. **Every new UI or element must conform.** All colors
come from the semantic tokens in [`packages/shared/src/tokens/tokens.css`](../packages/shared/src/tokens/tokens.css) —
never hardcode hex, and never use a raw ramp step (`bg-neutral-90`) for a surface.

Tokens auto-swap for dark mode via `[data-theme="dark"]`, so use the semantic
utility (`bg-surface`, not `dark:` variants).

---

## Surface elevation ladder

| Role | Utility |
|---|---|
| **App / page background** | `bg-surface` |
| **Top nav / header bar** | `bg-surface` *(blends into the page)* |
| **Card · bottom-sheet · drawer · side panel** (primary raised surface) | `bg-surface-container-low` |
| **Input / textarea / select field** | `bg-surface-container-low` |
| **Modal / dialog** (floats above a scrim) | `bg-surface-container-high` |
| **Nested block / quiet (secondary) button _inside a card_** | `bg-surface-container` |
| **Icon-button bg · inactive pill/tab · chip _sitting on a `surface` bg_** (page/nav) | `bg-surface-container-high` |
| **Hover of a nested / interactive element** | `bg-surface-container-high` |
| **Hover on an already-high element / topmost** | `bg-surface-container-highest` |

### The context rule for nested elements

The token for a nested element depends on **what it sits on**:

- On a **`surface`** background (the page or the nav): icon-button fills, inactive
  pills/tabs, and chips use **`bg-surface-container-high`**.
- Inside a **card** (`surface-container-low`): nested blocks and quiet buttons use
  **`bg-surface-container`**.

> Mental model (Material tonal elevation): `surface` is the floor; each
> `surface-container-*` step is "more raised." A card (`-low`) sits just above the
> floor; a modal (`-high`) floats well above it; hovers nudge one step up.

---

## Text & on-color

| Role | Utility |
|---|---|
| Primary text | `text-primary-text` |
| Secondary / muted text | `text-secondary-text` |
| Muted text / icon glyph | `text-on-surface-variant` |
| Text on `primary` | `text-on-primary` |
| Text on a status container | `text-on-{success,error,warning}-container` |
| Disabled text | `text-on-surface-disabled` |

## Borders & dividers

- Default border / divider: `border-outline-variant`
- Stronger outline: `border-outline`

## Primary & status (unchanged across apps)

- Primary action: `bg-primary` + `text-on-primary`
- Success / error / warning surfaces: `bg-{success,error,warning}-container` +
  `text-on-{success,error,warning}-container`

---

## Quick checklist for any new element

1. Is it the page or the top nav? → `bg-surface`.
2. Is it a card / sheet / drawer / input? → `bg-surface-container-low`.
3. Is it a modal/dialog? → `bg-surface-container-high`.
4. Is it a small fill (icon bg, pill, chip) **on the page/nav**? → `bg-surface-container-high`.
5. Is it nested **inside a card**? → `bg-surface-container`.
6. Hover? → one step up (`-high`, then `-highest`).
7. Text → `text-primary-text` / `text-secondary-text`; borders → `border-outline-variant`.
8. Never hardcode a hex or use a raw ramp step for a surface.
