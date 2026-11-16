# Landing page

Plan for Oshap's public marketing page. Not built. This is what to build.

## Who it is for

**Restaurant and bar owners and managers in Nigeria.** They are the buyers. Diners never
see this page; they arrive at `/menu?table=…` from a QR code.

The owner's main job ([`jtbd.md`](jtbd.md#owner-jobs)) is to *trust that every plate that
left the kitchen was paid for*. Speed for guests is what makes them notice us. Trust is what
makes them pay. The page tells both stories, in that order.

Most owners will open the page on a phone, from a link someone sent them on WhatsApp or
Instagram. **Design for a 360px screen on mobile data first.**

## What the page must not say

We are pre-pilot ([PRD §16](../PRD.md#16-remaining-work--roadmap)). That rules out:

- **Customer logos, testimonials, "trusted by N restaurants".** We have none. The slot is
  planned below, empty until pilot venues agree to be named.
- **Outcome numbers** ("30% faster table turns"). We have not measured anything yet.
- **"Pay by card in the app."** Guests pay by bank transfer or ask for a POS. Card payments
  through a gateway are a future item.
- **"Start free trial" or "Sign up".** There is no self-serve signup. Platform operators
  onboard each restaurant. The call to action is a conversation.
- **Any feature as a plan perk.** Every plan gets the whole product ([`plans.md`](plans.md)).

## Decisions

> **First version, Nov 2026:** built as [`apps/site`](../apps/site/src/LandingPage.tsx), a
> fourth app in this repo, approved for this. It has no screenshots yet and is not
> prerendered. "Book a demo" opens WhatsApp at `VITE_SALES_WHATSAPP` and hides when that is
> unset.

1. **Where it lives. Decided: `apps/site`.** It keeps marketing weight out of the guest
   bundle, gets its own domain, and reads prices from the same shared tier data as the
   platform app. The `/` route in `apps/customer` was tried as a stopgap and dropped. A
   separate repo was considered too; it would have meant copying prices and tokens by hand.
2. **Where "Book a demo" goes. Decided: WhatsApp**, with a prefilled message. No backend,
   and it is the channel owners already use. A form would need a lead endpoint in
   [`openapi.yaml`](openapi.yaml) first.
3. **The domain. Open.** `oshap.useshappay.com` is the guest app and is printed on laminated QR
   codes. It must not change. The site needs its own host.

## Research summary

Mobbin, web, 6 searches across restaurant software and B2B SaaS. Full links at the end.

- **Restaurant software heroes split two ways.** Square, Mews and 7shifts lead with the
  product (a device, a screen). OpenTable leads with photos of staff. We have no photo
  shoot and a real product, so **show the product**.
- **Feature sections alternate text and screenshot**, one job per row (OpenTable, Square,
  Mews). It works because each row answers one question. We copy the structure, not the
  checkmark lists.
- **Pricing almost always ladders features** (Teachable, HoneyBook, Framer). Ours cannot:
  every plan has every feature. That is our clearest difference from everyone else, so the
  pricing section should *say* it rather than hide it in identical lists.
- **The annual toggle sits above the cards** and states the saving next to it
  (Homerun, Spline, Mobbin). HoneyBook's "Yearly (2 months free)" is the clearest
  wording, and it happens to be our exact rule: annual is 10 months.
- **"How it works" in three numbered steps, no containers** reads fastest (Beside,
  Grammarly). Clay's carded version adds four boxes for no gain.
- **FAQ is a single-column accordion** (HubSpot, Tines). Square's two-column version is
  harder to scan on a phone.
- **The moodboard** ([greenclover](https://greenclover.framer.website/)) is a stock SaaS
  template: caps eyebrows, three feature sections that repeat each other, a comparison
  table, "Get Started" eight times. We keep its order (hero, process, pricing, FAQ, CTA)
  and drop the repetition.

## Page structure

Six sections plus the top bar and footer. Every section answers one question an owner has.

| # | Section | The owner's question |
|---|---|---|
| — | Top bar | Who is this, and how do I talk to them? |
| 1 | Hero | What is it? |
| 2 | How it works | What actually happens at the table? |
| 3 | Three jobs | What does it do for my guests, my staff and me? |
| 4 | Everything included | What else do I get? |
| 5 | Pricing | What does it cost? |
| 6 | FAQ | What's the catch? |
| — | Closing CTA + footer | OK, what now? |

The testimonial slot sits between 4 and 5 once pilot venues give us a quote. Until then it
is absent, not a placeholder.

### Top bar

`bg-surface`, as on the customer and platform apps. The raised `surface-container-low` bar
is admin-only.

- Desktop: `BrandMark` · How it works · Pricing · FAQ · *(right)* Log in (tertiary) ·
  **Book a demo** (filled)
- Mobile: `BrandMark` · **Book a demo** · menu icon. The menu opens a `Sheet` with the three
  anchors and Log in.

Log in goes to the admin app. Staff log in every day; they need to find it, but it must
not compete with the demo button.

### 1. Hero

Mobile: text stacked above the product image. Desktop: two columns, text left.

```
Order shap shap.                                  [display-large]

Guests scan the QR code on their table and order  [body-large, on-surface-variant]
from their phone, then pay by transfer or card.
Your kitchen sees every order straight away, and
every order is matched to a payment.

[ Book a demo ]   See pricing                     [filled · tertiary]
We'll reply on WhatsApp.                          [body-small, on-surface-variant]
```

**Image:** a phone showing the customer menu, overlapping a tablet showing the admin
tables dashboard. Real screenshots from the apps in mock mode, with plausible Nigerian dishes
and naira prices. The overlap tells the story: the guest's phone, your screen.

The tagline earns the headline because the subhead explains it at once. If the tagline
tests poorly with owners who don't know the phrase, the fallback H1 is *"Your guests order
from the table. You see every naira."*

### 2. How it works

Three numbered steps in a row (stacked on mobile). No cards: the numbers and spacing group
them.

| Step | Title | Body |
|---|---|---|
| 1 | Guests scan and order | No app, no account. The camera opens your menu. |
| 2 | Your kitchen gets it instantly | Staff phones chime. The kitchen screen shows what to cook, in order. |
| 3 | You confirm the payment | Guests pay by transfer or ask for a POS. One tap verifies it and closes the table. |

### 3. Three jobs

Three rows, alternating image left and right. On mobile, image always below text. Each
row: `headline-medium` title, one short paragraph, three plain bullets, one screenshot.

| Row | Title | Bullets | Screenshot |
|---|---|---|---|
| Guests | No more waving for a waiter | Order and add a round any time · See when food is being prepared and when it's ready · Call a waiter with one tap | Customer *My Orders* with live status |
| Staff | Every order reaches the right person | Phone alerts for new orders, waiter calls and POS requests · Kitchen moves orders with Start and Ready · Every alert names the table | Admin kitchen board |
| Owner | Every order matched to a payment | Each bill has its own reference, so a transfer is easy to find · Unpaid tables stay open until someone accounts for them · End-of-day totals by transfer, POS and abandoned | Admin history with day summary |

The owner row is the one that sells. Give it the most care.

### 4. Everything included

Heading: **Everything is included on every plan.**

A two-column list (one column on mobile) with a Central Icon, a short name and one line per
item: menu and add-ons · stock tracking · QR codes for every table · receipts · staff roles
and permissions · group ordering at one table · sales reports.

Locations stay off this list. Lite and Standard are capped at one, so listing them under
"every plan" would contradict the pricing directly below.

No containers. This list is the proof behind the pricing claim that follows, so it sits
directly above pricing.

### 5. Pricing

```
One product. Pay for the size of your restaurant.   [headline-large]
Every plan includes everything. Staff and tables
are unlimited on all of them.

        ( Monthly )  ( Annual · 2 months free )      [Chip pair]

┌ Lite ─────────┐ ┌ Standard ─────┐ ┌ Pro ──────────┐
│ ₦8,000 /month │ │ ₦18,000/month │ │ ₦35,000/month │
│ For a small   │ │ For a busy    │ │ For more than │
│ spot          │ │ restaurant    │ │ one location  │
│               │ │               │ │               │
│ 10,000 orders │ │ Unlimited     │ │ Unlimited     │
│ a month       │ │ orders        │ │ orders        │
│ 1 location    │ │ 1 location    │ │ Unlimited     │
│               │ │               │ │ locations     │
│ [Book a demo] │ │ [Book a demo] │ │ [Book a demo] │
└───────────────┘ └───────────────┘ └───────────────┘
```

- The price is `text-headline-large`; "/month" and the description are `text-body-medium`,
  `text-on-surface-variant`.
- Under the cards, one line: *Book a demo opens a WhatsApp chat.* Every demo button opens
  WhatsApp, and the label alone doesn't say so.
- Cards are `Card` (`bg-surface-container-low`, `rounded-lg`). Buttons are
  `SecondaryButton`: three filled buttons in a row would be three primaries.
- **No "Most popular" badge.** We have no data to back it.
- The toggle uses two `Chip`s: outlined at rest, `bg-primary` when selected, as the DS
  defines the selected state. Annual shows ₦80,000 / ₦180,000 / ₦350,000 *per year*.
- **Prices come from [`tiers.ts`](../packages/shared/src/utils/tiers.ts)**, rendered with
  `formatCurrency()` from kobo. Never retype them.
- Show only `PHASE_1_TIERS`. Enterprise is not on sale.

### 6. FAQ

Full width, every answer shown, no accordion. Six short answers read faster open than
behind six taps, and a closed one hides the catch an owner came to check. Six questions:

| Question | Answer |
|---|---|
| Do guests need to download an app? | No. They point their phone camera at the QR code and your menu opens in the browser. No account, no download. |
| How do guests pay? | By bank transfer to your account, or by asking for your POS. Staff confirm the payment in Oshap with one tap. |
| Does Oshap hold our money? | No. Transfers go straight into your own bank account, and card payments go through your own POS. |
| What happens if we pass 10,000 orders on Lite? | Your guests can still order. We never stop orders in the middle of service. We'll get in touch to talk about your plan. |
| What do we need to get started? | A phone or tablet for staff, and printed QR codes for your tables. Oshap makes the codes for you. |
| Can we change the menu ourselves? | Yes. Add dishes, change prices or mark something sold out from your phone, and guests see it straight away. |

The 10,000 answer must stay in step with [`plans.md`](plans.md#enforcement-status). What
happens past the cap is still undecided. The answer above promises only the part that is
decided: a cap never stops a guest from ordering.

### Closing CTA

A `Card` band (`bg-surface-container-low`), centred:

> **See Oshap in your restaurant.**
> We'll show you the whole thing on a call, then set up your menu and tables with you.
> [ Book a demo ]

Not an orange band. The seed colour may not carry a paragraph (white on `#F56500` is
3.11:1), and one full-bleed orange block would outshout the rest of the page.

### Footer

`BrandMark` and *Order shap shap.* · Pricing · FAQ · Log in · WhatsApp · email · Privacy ·
Terms. One row on desktop, stacked on mobile.

## Design system

Everything comes from DS v3. Nothing new goes into `tokens.css`.

| Concern | Rule |
|---|---|
| Page | `bg-surface`. Cards (pricing, closing CTA) `bg-surface-container-low`. Nothing else gets a container. |
| Type | H1 `text-display-large`. Section titles `text-headline-large`. Row titles `text-headline-medium`. Body `text-body-large`. Display and headline already shrink at ≤768px. |
| Brand colour | Filled buttons and the selected chip only. Any body-size brand text uses `text-primary-label`. |
| Spacing | Side gutter `md` (16) on mobile, `l` (24) on tablet. Between sections `5xl` (64) on mobile, `9xl` (96) on desktop. Content max width 1200px. |
| Radius | Buttons `sm`, cards `lg`, chips `full`, screenshots `lg`. |
| Icons | Central Icons, Lucide as fallback. Used only in *Everything included*, where they help scanning. No icons on buttons. |
| Elevation | Only the screenshots, and only enough to separate the phone from the tablet behind it. |
| Dark mode | Follows the system setting. Tokens swap on their own. Screenshots need a dark set, or they glare. |

**Reuse:** `BrandMark`, `PrimaryButton`, `SecondaryButton`, `TertiaryButton`, `Chip`, `Card`,
`Sheet`, `IconButton`.

**New, local to the site:** `DeviceFrame` (screenshot in a phone or tablet outline), once
there are screenshots.

## Motion

One place only. Build it with the `animate` skill.

- **Price change on the Monthly/Annual toggle.** A short crossfade on the figures, so it
  is clear they changed.

Smooth scroll for the anchor links is off under `prefers-reduced-motion`.

**No** scroll-triggered fade-ins, parallax or animated hero. They slow the page on a mid-range
Android phone and explain nothing. An animated "order travels from phone to kitchen" hero
would explain something. It belongs in a later product video, not on the first build.

## Performance and access

- Prerender to static HTML. Budget: under 100KB of JS, LCP under 2.5s on a throttled 4G
  mid-range Android.
- Screenshots as AVIF with WebP fallback, sized by `srcset`. Lazy-load everything below the hero.
- Preload the two webfonts already in use. No third.
- One `h1`. Every section is a `section` with a heading. A skip link to main content.
- The FAQ is a `<dl>`: questions in `<dt>`, answers in `<dd>`. The
  plan toggle is a radio group, and the new price is announced.
- Every "Book a demo" link gets the accessible name "Book a demo on WhatsApp" and opens in
  a new tab.
- Alt text describes what the screenshot shows ("Kitchen screen with three orders, oldest
  first").
- Title: *Oshap — QR ordering and payments for restaurants and bars*. Write an Open
  Graph image as well, because the page will mostly be shared on WhatsApp.

## Review notes

The draft went through design review. Fixed above:

- The hero said guests "pay from their phone". POS payments happen on the restaurant's
  terminal, so it now says "pay by transfer or card".
- The staff row promised alerts "with a sound, even when the phone is locked". The chime
  plays only in the open app, and locked-screen web push depends on the phone and browser.
- *Everything included* listed "several locations", which Lite and Standard don't get.
- The 10,000-order answer named Standard as the outcome. That outcome is still undecided.

Found, but outside this page: **the selected `Chip` still ships `bg-primary`**, a 14px
white label on `#F56500` (3.11:1). The DS already fixes this with a darker orange for the
selected state, but [`Chip.tsx`](../packages/shared/src/ui/Chip.tsx) hasn't adopted it yet.
The pricing toggle is built on `Chip`, so that change has to land first.

## Build order

1. ~~Settle where it lives and where the demo button goes.~~ Done.
2. ~~Move the tier data into `packages/shared`.~~ Done.
3. ~~Scaffold `apps/site`.~~ Done. Prerendering is still to do.
4. Choose the domain and create the Vercel project.
5. Capture screenshots from the apps in mock mode, light and dark.
6. ~~Build sections top to bottom.~~ Done, without screenshots.
7. Motion for the price change on the toggle.
8. Design review, then a test on a real low-end Android phone on mobile data.

## References

Mobbin, web sections:

- Heroes: [Square](https://mobbin.com/sites/sections/96b5a098-561c-4b69-8140-30718b9516fc),
  [Mews](https://mobbin.com/sites/sections/584d418b-64ce-4d4c-baa9-d9c936d54c64),
  [7shifts](https://mobbin.com/sites/sections/ee0b5121-8afa-4f9f-915f-3d5f3bbff5f7),
  [OpenTable](https://mobbin.com/sites/sections/c6624cee-bd9f-48e8-99cd-da1c979adf96)
- Feature rows: [OpenTable](https://mobbin.com/sites/sections/4cf94e38-d325-4c39-a90b-dbf3868e9b27),
  [Square](https://mobbin.com/sites/sections/2e6adf6c-c57f-4f8c-ad22-a344ef5a79fc),
  [Mews](https://mobbin.com/sites/sections/ff5edbe2-b2e6-44b8-99bc-5405d8405a46)
- Pricing: [HoneyBook](https://mobbin.com/sites/sections/e72ef239-29c4-45c5-b9b1-cd92db0a4173),
  [Homerun](https://mobbin.com/sites/sections/5892cb8f-ce21-4224-b141-f3221756686e),
  [Teachable](https://mobbin.com/sites/sections/46238516-3b83-4bad-812b-22f6ac7ab2be),
  [Mobbin](https://mobbin.com/sites/sections/26bf15e0-e87d-400d-9055-71b4d054d0c4)
- How it works: [Beside](https://mobbin.com/sites/sections/2cfd3169-f61f-4ca5-bd2a-67627febbc84),
  [Grammarly](https://mobbin.com/sites/sections/1db9aea8-a59f-4359-9e58-d46d4d73b84a),
  [Clay](https://mobbin.com/sites/sections/28c16d19-1b1c-4c38-b06e-660c77901cbc)
- FAQ: [HubSpot](https://mobbin.com/sites/sections/59b6bc2a-4b34-404a-8093-02a664857372),
  [Tines](https://mobbin.com/sites/sections/32ec1742-a691-4b5f-b694-d4fa4770e70f),
  [Square](https://mobbin.com/sites/sections/89c2cb81-bf4b-42ca-83d9-1d46d27ee7cd)
- Testimonials, for when we have them:
  [Square](https://mobbin.com/sites/sections/fa3e494b-374b-44de-99b4-4a63fb4d60b7),
  [7shifts](https://mobbin.com/sites/sections/f7d2d7b0-6321-43ad-96e8-ddecb780932a)
