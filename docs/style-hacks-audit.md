# Style hacks audit

A scan of `apps/admin` and `apps/customer` for layout/style workarounds that fight the design system instead of using it. Grouped by category. Each entry: location → why it's a hack → proposed fix.

The project rule (from [`CLAUDE.md`](../CLAUDE.md)):

> All styling is Tailwind utilities. Do not write CSS Modules or `style={...}` unless there's no utility for it.

Most hacks below violate that rule directly or work around a token that already exists.

---

## A. Margin-pusher hacks instead of layout primitives

The `ml-auto` / `mt-auto` pattern shoves an element to one side of a flex container. It works but breaks the moment another element appears. `justify-between` + grouped containers is the right primitive.

### A.1 — Kitchen order reference uses `ml-auto`
[`apps/admin/src/routes/kitchen.tsx:181`](../apps/admin/src/routes/kitchen.tsx#L181)

```tsx
<div className="flex items-center gap-s">
  <span className="font-bold text-primary-text">{order.table_id}</span>
  <span className="text-caption-sm text-secondary-text">{timeAgo(order.created_at)}</span>
  <span className="text-caption-sm text-outline ml-auto font-mono">#{stripRef(order.reference)}</span>
</div>
```

**Fix:** Wrap `table_id` + `timeAgo` in a left group, keep `reference` as a right element, use `justify-between` on the row. Identical pattern to the PinGate fix we just did.

### A.2 — Dashboard card CTAs use `mt-auto`
[`apps/admin/src/routes/dashboard.tsx:163`](../apps/admin/src/routes/dashboard.tsx#L163), [`:179`](../apps/admin/src/routes/dashboard.tsx#L179)

```tsx
<PrimaryButton onClick={...} className="mt-auto">Verify Payment</PrimaryButton>
...
<SecondaryButton onClick={...} className="w-full mt-auto">Clear Table</SecondaryButton>
```

**Why it's a hack:** the card uses `flex flex-col gap-s` and these CTAs jam to the bottom via `mt-auto`. Brittle when adding more content.

**Fix:** Split card into two flex groups — `flex-1` content area + footer area. The footer naturally sits at the bottom without margin hacks:

```tsx
<div className="flex flex-col h-full">
  <div className="flex flex-col gap-s flex-1">{/* header + body */}</div>
  <div className="flex flex-col gap-s">{/* CTAs */}</div>
</div>
```

---

## B. Inline `style={}` with raw colors when semantic tokens already exist

The biggest category, and the most fixable. Tokens for `warning`, `success`, `error` (and their `*-container` / `on-*-container` pairs) live in [`tokens.css`](../packages/shared/src/tokens/tokens.css). The code repeatedly hardcodes the underlying hex/rgba instead.

### B.1 — Warning/amber: `#cc7a00`, `#e68a00`, `rgba(230,138,0,…)`, `rgba(255,153,0,…)`

10+ occurrences across:
- [`apps/admin/src/routes/dashboard.tsx:77,81,86,109,120,146`](../apps/admin/src/routes/dashboard.tsx#L77)
- [`apps/admin/src/routes/kitchen.tsx:65,148,154`](../apps/admin/src/routes/kitchen.tsx#L65)
- [`apps/customer/src/routes/orders.tsx:476,484`](../apps/customer/src/routes/orders.tsx#L476) (inside `OrderStatusBadge`)

**Why it's a hack:** the design system has `--color-warning`, `--color-warning-container`, `--color-on-warning-container` exposed as Tailwind utilities (`bg-warning-container`, `text-on-warning-container`, `text-warning`). The raw rgbas are an older snapshot of these values.

**Fix:** Swap inline style for utilities. Example for the kitchen "cooking" chip:

```tsx
// Before
<span className="px-s py-xs rounded-4xl font-bold text-caption-sm"
  style={{ background: "rgba(230,138,0,0.12)", color: "#cc7a00" }}>
  {inProgress.length} cooking
</span>

// After
<span className="px-s py-xs rounded-4xl font-bold text-caption-sm bg-warning-container text-on-warning-container">
  {inProgress.length} cooking
</span>
```

### B.2 — Success: `rgba(27,176,90,…)` paired with `var(--color-success)`

5+ occurrences across:
- [`apps/admin/src/routes/kitchen.tsx:68`](../apps/admin/src/routes/kitchen.tsx#L68)
- [`apps/admin/src/routes/history.tsx:150,189`](../apps/admin/src/routes/history.tsx#L150)
- [`apps/customer/src/routes/orders.tsx:480,488`](../apps/customer/src/routes/orders.tsx#L480)

**Fix:** `bg-success-container text-on-success-container` for the pill background, or `text-success` for plain text usage.

### B.3 — Error: `rgba(204,12,0,…)` paired with `var(--color-error)`

- [`apps/admin/src/routes/dashboard.tsx:124`](../apps/admin/src/routes/dashboard.tsx#L124)
- [`apps/admin/src/routes/history.tsx:151`](../apps/admin/src/routes/history.tsx#L151)
- [`apps/customer/src/routes/orders.tsx:493`](../apps/customer/src/routes/orders.tsx#L493)

**Fix:** `bg-error-container text-on-error-container`.

---

## C. CSS-variable injection through `style={}` when a Tailwind utility exists

The CSS variables are exposed as Tailwind utilities by tokens.css. Reaching past the utility into the raw variable is unnecessary indirection.

- [`apps/admin/src/routes/dashboard.tsx:81,86`](../apps/admin/src/routes/dashboard.tsx#L81): `var(--color-primary)`, `var(--color-secondary-text)` → `text-primary`, `text-secondary-text`
- [`apps/admin/src/routes/history.tsx:245`](../apps/admin/src/routes/history.tsx#L245): `var(--color-primary)` → `text-primary` (the `SummaryCard.valueStyle` default)
- [`apps/admin/src/routes/kitchen.tsx:159`](../apps/admin/src/routes/kitchen.tsx#L159): `var(--color-primary-text)` → `text-primary-text`

**Fix:** Replace inline `style` with the matching utility class. The `SummaryCard` case wants a `variant: "neutral" | "success" | "error"` prop instead of `valueStyle` — see D.2.

---

## D. Conditional inline-style ternaries that should be className swaps

Same idea as B/C, but where the style flips based on state. Wrapping in `style={{}}` here is what made the raw colors necessary in the first place.

### D.1 — Dashboard table cards
[`apps/admin/src/routes/dashboard.tsx:75-87,106-110`](../apps/admin/src/routes/dashboard.tsx#L75)

Pattern repeats: pending → warning bg/border, normal → surface, empty → surface/transparent. Currently done via three-way `style={{ background, borderColor }}` ternary.

**Fix:** Compute a `variant` and pick a class string:

```tsx
const variantClass =
  isPending
    ? "bg-warning-container/40 border-warning"
    : !isEmpty
      ? "bg-surface-container border-outline-variant"
      : "bg-surface-container border-transparent";
```

(Or extract to a small `TableCard` component — same logic appears twice in the file.)

### D.2 — Kitchen column header color
[`apps/admin/src/routes/kitchen.tsx:143-156`](../apps/admin/src/routes/kitchen.tsx#L143)

```tsx
const borderColor =
  accent === "error" ? "var(--color-error)"
  : accent === "amber" ? "#cc7a00"
  : "var(--color-success)";
const qtyColor =
  accent === "error" ? "text-primary"   // bug: see Section F
  : accent === "amber" ? "#cc7a00"
  : "var(--color-success)";
```

Then used as `style={{ borderBottomColor: borderColor, color: ... }}` and `style={{ borderLeft: \`4px solid ${borderColor}\` }}`.

**Fix:** Map `accent` to Tailwind classes, drop the variables entirely:

```tsx
const headerCls = { error: "border-error",   amber: "border-warning",   success: "border-success"   }[accent];
const leftCls   = { error: "border-l-error", amber: "border-l-warning", success: "border-l-success" }[accent];
const qtyCls    = { error: "text-error",     amber: "text-warning",     success: "text-success"     }[accent];
```

Then `className={\`border-b-2 ${headerCls}\`}`, `className={\`border-l-4 ${leftCls}\`}`, `<span className={\`font-bold min-w-6 ${qtyCls}\`}>`. No `style={}` anywhere.

### D.3 — Customer `OrderStatusBadge` (I wrote this — flagging my own hack)
[`apps/customer/src/routes/orders.tsx:464-505`](../apps/customer/src/routes/orders.tsx#L464)

The `meta` map uses inline `style` per status. Same fix as D.2: map to className strings:

```tsx
const META: Record<OrderStatus, { label: string; cls: string }> = {
  CREATED:         { label: "Sent",              cls: "bg-surface-container-high text-on-surface-variant" },
  PREPARING:       { label: "Preparing",         cls: "bg-warning-container text-on-warning-container" },
  READY:           { label: "Ready",             cls: "bg-success-container text-on-success-container" },
  PAYMENT_PENDING: { label: "Awaiting payment",  cls: "bg-warning-container text-on-warning-container" },
  CONFIRMED:       { label: "Paid",              cls: "bg-success-container text-on-success-container" },
  CANCELLED:       { label: "Cancelled",         cls: "bg-error-container text-on-error-container" },
};
```

---

## E. Opacity as `style={}` instead of a utility

- [`apps/admin/src/routes/history.tsx:128`](../apps/admin/src/routes/history.tsx#L128): `style={order.status === "CANCELLED" ? { opacity: 0.55 } : undefined}`
- [`apps/admin/src/routes/menu.tsx:221`](../apps/admin/src/routes/menu.tsx#L221): `style={!item.available ? { opacity: 0.55 } : undefined}`

**Fix:** Tailwind ships `opacity-55` natively. `className={order.status === "CANCELLED" ? "opacity-55" : ""}`.

---

## F. Pre-existing bug (worth flagging while you're in there)

[`apps/admin/src/routes/kitchen.tsx:148`](../apps/admin/src/routes/kitchen.tsx#L148)

```tsx
const qtyColor = accent === "error" ? "text-primary" : ...
...
<span className="font-bold min-w-[24px]" style={{ color: qtyColor }}>
```

`"text-primary"` is a Tailwind **class name**, but it's being passed as the value of CSS `color`. Browsers reject `color: text-primary;` as invalid → the quantity number inherits the parent's color instead of the intended primary tint. The "amber" and "success" branches don't have this bug because they pass actual CSS values.

**Fix:** Falls out of D.2 — once `qtyColor` is a className string applied via `className`, the bug is fixed.

---

## G. Arbitrary Tailwind values that have token equivalents

Lower-priority cleanup, but they pile up.

### G.1 — `border-[1.5px]` (10+ uses)

[`dashboard.tsx`](../apps/admin/src/routes/dashboard.tsx), [`menu.tsx`](../apps/admin/src/routes/menu.tsx), [`history.tsx`](../apps/admin/src/routes/history.tsx), [`PinGate.tsx`](../apps/admin/src/components/PinGate.tsx).

**Fix:** Either add a `--border-emphasis: 1.5px` token + `border-emphasis` utility, or accept `border-[1.5px]` as the project convention (the design system clearly wants slightly heavier-than-default borders). Pick one and apply globally.

### G.2 — `min-w-[24px]`
[`history.tsx:167`](../apps/admin/src/routes/history.tsx#L167), [`kitchen.tsx:188`](../apps/admin/src/routes/kitchen.tsx#L188)

**Fix:** `min-w-6` — Tailwind's `6` step is `1.5rem = 24px`. Pure swap.

### G.3 — `min-h-[60vh]`, `min-h-[40vh]`, `h-[calc(100vh-56px)]`, `max-w-[80vw]`, etc.

Layout-specific arbitrary values. **No fix recommended** — these are reasonable uses of Tailwind's arbitrary-value escape hatch.

---

## Suggested order of attack

If we do this in passes, low-risk → high-value:

1. **Section B** — search-and-replace the raw rgba/hex literals for `bg-*-container` / `text-on-*-container` utilities. Drops ~15 inline-style attributes. Visual diff should be zero (the rgbas were the token values).
2. **Section F** — fixes a real bug, falls out of D.2.
3. **Section D.2 + D.3** — the className-map refactor. Removes all remaining `style={}` from kitchen + the customer badge.
4. **Section E** — trivial `opacity-55` swap.
5. **Section A.1** — kitchen reference pusher. Same pattern as PinGate; small.
6. **Section D.1 + A.2** — dashboard restructure. Biggest, do last. May benefit from extracting a `<TableCard>` component while we're in there.
7. **Section G** — token-level cleanup. Discuss whether `border-[1.5px]` graduates into a token before applying.

After 1–6 the only remaining inline `style={}` in either app should be load-bearing dynamic ones (e.g. the cart drawer's `shadow-[0_-4px_24px_var(--ds-shadow)]` which is using a token, just via arbitrary value).
