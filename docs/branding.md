# Brand identity

Spec for per-restaurant branding in the customer app. Not built — this is what to build.

## The state of it today

**Every field already exists and already reaches the guest's phone.**

`GET /table/{id}` returns `restaurant` as a `RestaurantResponse`, which carries
`logo_url`, `primary_color` and `cover_image_url`. `AdminUpdateSettingsRequest` accepts
`primary_color`, so a merchant's own settings PATCH can already set it.

What is missing is entirely on our side:

| Field | Backend | Our `Restaurant` type | Any screen reads it |
|---|---|---|---|
| `logo_url` | ✅ | ✅ | ✅ customer header, receipts, QR sheets |
| `primary_color` | ✅ | ❌ not declared | ❌ |
| `cover_image_url` | ✅ | ❌ not declared | ❌ |

So the data is being delivered to the guest and thrown away. **This phase needs no backend
work at all** — one exception, noted at the end.

## Scope: the guest's app, and nothing else

Branding applies to `apps/customer` only. The admin and platform apps stay Oshap orange.

Three reasons, and the second is the one that decides it:

- Staff are in the admin app all day. A tool that changes colour between venues is slower
  to use, not friendlier.
- **A group owner switches branches from the top nav.** If branding followed the active
  branch, the entire admin UI would change colour mid-shift, which is disorienting rather
  than personal.
- Error, warning and success stay semantic everywhere. A restaurant's brand colour must
  never become the colour of a failed payment.

Within the customer app, only the **primary** role is branded: the header, primary CTAs
(add to cart, place order, confirm payment), active states and accent badges. Surfaces stay
neutral, because a tinted background is where readability quietly dies.

## How the tokens work, and where to intervene

[`tokens.css`](../packages/shared/src/tokens/tokens.css) is three tiers:

```css
@theme inline {
  --color-primary: var(--ds-primary);          /* Tailwind utility  */
  --color-on-primary: var(--ds-on-primary);
  --color-primary-container: var(--ds-primary-container);
}
:root                { --ds-primary: #f56500; … }   /* light */
[data-theme="dark"]  { --ds-primary: #f56500; … }   /* dark  */
```

So `bg-primary` resolves through `--color-primary` to `--ds-primary`. **Overriding the
`--ds-primary*` group on a wrapper element rebrands every utility at once**, with no
rebuild, no `style={}` on components, and no change to any existing markup.

That is the whole mechanism. One element, a handful of custom properties.

## The part that is actually hard

Oshap's own tokens hardcode `--ds-on-primary: #ffffff` in both modes. That works because
Oshap orange is mid-dark. **It breaks the moment a restaurant picks a light hue** — white
on a brand yellow is unreadable, and the merchant will not discover it. Their guests will,
at a table, in daylight.

So `on-primary` must be **derived, never assumed**.

### Derive a tonal ramp, don't pick one colour

The existing ramp is already a tonal palette — `--color-primary-10` through `-95`, where
the number is lightness. Generate the same ladder from the merchant's hex and assign roles
by tone, exactly as the current tokens do:

| Token | Light | Dark | Why |
|---|---|---|---|
| `--ds-primary` | T50 | T50 | Oshap keeps the brand colour identical in both modes, and a restaurant's should behave the same way |
| `--ds-on-primary` | **computed** | **computed** | White or T10, whichever clears 4.5:1 against the resolved primary |
| `--ds-primary-container` | T90 | T10 | Matches the existing light/dark swap |
| `--ds-on-primary-container` | T30 | T90 | Same |
| `--ds-primary-10a` | primary @ 10% | primary @ 10% | Alpha wash for hovers |

Contrast then holds **by construction** rather than by warning — the only computed value is
`on-primary`, and it has two candidates to choose between.

Work in **OKLCH**, which is perceptually uniform, so T50 of a blue and T50 of a yellow feel
equally heavy. Compute in JS and inject resolved hex values; do not rely on CSS relative
colour syntax (`oklch(from …)`), whose support is still uneven on the mid-range Android
phones this app is actually used on.

Also clamp chroma. A fully saturated seed produces containers that vibrate against text at
small sizes, and a menu is small text.

### Never trust the input

`primary_color` is a nullable free-text string on the API — not a validated hex. So:

- Anything that does not parse as a colour falls back to Oshap orange, silently. A guest
  seeing the default is a non-event; a guest seeing an unstyled page is not.
- Do the parse once, at the boundary, and treat the result as a resolved palette or
  nothing. No component should ever ask "is this a valid colour".

## What the guest sees

- **Header** — logo (already built, via `BrandMark`) on the brand colour.
- **Cover image** — `cover_image_url` as a hero above the menu, with the restaurant's name
  over it. Falls back to no hero, not a grey box.
- **Primary actions** — add to cart, place order, confirm payment.

Nothing else. The temptation is to brand the whole surface; resist it, because the guest is
there to read a menu.

### The flash

The brand arrives with the table fetch, so the first paint is Oshap orange and it changes a
beat later. Cache the resolved palette in `sessionStorage` keyed by table, and apply it
synchronously on load — a returning guest, which after the first scan is every guest, never
sees the swap. First scan still flashes, and that is acceptable.

## Where the merchant sets it

Admin → Settings → General, beside the logo upload. A colour input, a hex field for anyone
who knows their brand code, and a **live preview of the guest's header and primary button**
rendered with the derived palette.

The preview is the whole point. A hex field alone asks a restaurant owner to imagine a
colour they have never seen applied, and the answer arrives on a customer's phone.

No contrast warning is needed, because the derivation cannot produce an unreadable pair —
but show the preview in both light and dark, since guests will be in both.

## Per-branch branding

`RestaurantBranch` carries its own `logo_url` and `primary_color`, so a group *can* brand
venues separately. Support it by doing nothing special: the customer app renders whatever
`GET /table/{id}` returns for that table, which is already the right venue. No branch
switcher, no resolution logic, no decision.

## Build order

1. Declare `primary_color` and `cover_image_url` on `Restaurant` in
   [`types/index.ts`](../packages/shared/src/types/index.ts) and in
   [`openapi.yaml`](openapi.yaml) — they are returned today and undocumented on our side.
2. Palette derivation as a pure function in `packages/shared/src/utils/`, with tests. This
   is the piece worth getting right; everything after it is wiring.
3. Apply on a wrapper in the customer app, plus the `sessionStorage` cache.
4. Settings field and live preview.
5. Cover image hero.

Steps 1–3 deliver the visible change. Step 5 is **blocked on the image upload URL** — until
uploads return a URL that resolves, a restaurant cannot get a cover image in.

## The one backend ask

`primary_color` is `string | null` with no validation. Constraining it to a hex pattern
server-side would stop a malformed value ever reaching a guest's phone, and would make the
field self-documenting. Not blocking — the client falls back safely — but the validation
belongs where the write happens.
