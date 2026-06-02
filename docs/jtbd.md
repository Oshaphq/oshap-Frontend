# Oshap — Jobs To Be Done

**Version:** 1.0
**Companion to:** [`PRD.md`](../PRD.md)
**Last updated:** 2026-06-02

---

## Why this document

The PRD describes **what Oshap is** — features, lifecycles, contracts.
This document describes **what Oshap is hired to do** — the underlying jobs customers and staff are trying to make progress on when they reach for it.

Use this as the test for product decisions: *"does this proposal help the user complete the job we were hired for, or does it just add a feature?"* When the two disagree, the JTBD wins.

JTBD framing used throughout:

> **When** [situation], **I want to** [motivation], **so I can** [expected outcome].

---

## Personas

| Persona | Who they are |
|---|---|
| **Customer (Diner)** | Sitting at a table in a restaurant or bar. Wants food, drink, or to settle the bill. |
| **Waiter** | Working a section of the restaurant floor. Juggling multiple tables. |
| **Cashier / Manager** | Owns payment verification and end-of-shift reconciliation. |
| **Kitchen Staff** | Receives and prepares food orders. |
| **Owner** | Runs the business. Not always on-site. Watches margins, leakage, and pace. |

> RBAC isn't shipped in v1.1 — for MVP, *everyone with the admin PIN* operates as a single "restaurant staff" role. The persona-specific jobs below still map to real motivations on the floor; the *separation* of those jobs into distinct roles is a Phase 2 product job.

---

## Customer Jobs

### Main job

> **When** I sit down at a restaurant or bar, **I want to** get my food and drinks quickly without waiting for or chasing a waiter, **so I can** spend my time eating and enjoying my company instead of negotiating logistics.

### Job stories

#### J-C1 — Order food without flagging down a waiter
> **When** I'm hungry and the waiter is busy with another table, **I want to** place my order from my phone right now, **so I can** stop waiting and start eating sooner.

→ *Solved by* QR entry, Menu, Cart, Order Placement ([PRD §7.1–7.3](../PRD.md#7-customer-features))

#### J-C2 — Add a round of drinks without disrupting conversation
> **When** I'm mid-conversation at a bar and want another round, **I want to** order without breaking off to find staff, **so I can** stay in the moment with the people I'm with.

→ *Solved by* one-tap re-order from My Orders, no-login persistence per table ([PRD §7.7](../PRD.md#77-order-tracking))

#### J-C3 — Pay and leave on my own schedule
> **When** I've finished eating, **I want to** settle the bill in under a minute, **so I can** leave when I'm ready instead of waiting for a cheque, then waiting for a card machine, then waiting for a receipt.

→ *Solved by* Bank Transfer + Request a POS ([PRD §7.5](../PRD.md#75-payment))

#### J-C4 — Order together at one table without one person doing all the ordering
> **When** my friends and I are sharing a table, **I want to** add to a shared tab so each of us can order what we want, **so I can** avoid being the "designated orderer" or arguing over the bill later.

→ *Solved by* Group / Shared Table Ordering ([PRD §7.4](../PRD.md#74-group--shared-table-ordering-order-together))

#### J-C5 — Know what's happening with my order without asking
> **When** I've placed an order, **I want to** see whether it's been received, is being prepared, or is ready, **so I can** plan when to expect it instead of asking the waiter.

→ *Solved by* My Orders status tracking + 5s polling ([PRD §7.7](../PRD.md#77-order-tracking))

#### J-C6 — Get a waiter when I actually need one
> **When** I genuinely need a person — allergy question, missing cutlery, complaint — **I want to** summon a waiter in one tap, **so I can** stop waving my arm and get the help I came here for.

→ *Solved by* Call a Waiter ([PRD §7.6](../PRD.md#76-call-a-waiter))

#### J-C7 — Pay the way I'm comfortable with
> **When** I'm ready to pay, **I want to** choose between bank transfer and in-person card on a POS, **so I can** use whichever method I trust today.

→ *Solved by* Bank Transfer (`I've Sent the Money`) + Request a POS ([PRD §7.5](../PRD.md#75-payment))

### Anti-jobs (explicitly NOT what Oshap solves for customers)

- **Picking the restaurant** — they're already at the table.
- **Reservations** — separate problem, separate product.
- **Loyalty / rewards** — Phase 3.
- **Nutritional info / dietary recommendations** — not in scope.
- **Splitting bills by individual item across guests** — current group flow lets each person pay their own subtotal, not itemized splitting.

---

## Waiter Jobs

### Main job

> **When** I'm working my shift, **I want to** see what's happening at every table I'm responsible for at a glance and act on each one in one tap, **so I can** serve smoothly without missing requests or running back to the bar for instructions.

### Job stories

#### J-W1 — See live table state without walking the floor
> **When** I'm carrying plates or stuck at the bar, **I want to** glance at my phone and see which tables have unpaid bills, pending payment claims, or open requests, **so I can** prioritize correctly without backtracking.

→ *Solved by* Waiter Dashboard with 5s polling ([PRD §8.2](../PRD.md#82-modules))

#### J-W2 — Know the instant a customer needs me
> **When** a customer hits "Call a Waiter" or "Request a POS", **I want to** get a push notification with the table number and a distinct chime, **so I can** respond without the customer having to wave or yell.

→ *Solved by* FCM web push + foreground AlertCenter with audio chime ([PRD §8.3](../PRD.md#83-push-notifications-fcm))

#### J-W3 — Verify a payment in one tap and have the table close itself
> **When** a customer has transferred money or paid by card on the POS, **I want to** mark the table paid in one tap, **so I can** move on to the next table without manual reconciliation.

→ *Solved by* `Verify Payment` → auto-close ([PRD §8.2](../PRD.md#82-modules), [§9.2](../PRD.md#92-payment-lifecycle))

#### J-W4 — Bring the POS to the right table at the right time
> **When** a customer requests a POS, **I want to** know which table, with what amount, **so I can** bring the right device to the right table without confusion.

→ *Solved by* `pos_requested` FCM payload with `table_id` + amount ([`docs/fcm-notifications.md`](fcm-notifications.md))

#### J-W5 — Recover from an abandoned bill cleanly
> **When** a customer leaves without paying or claims a payment they didn't make, **I want to** force-close the table with a recorded reason, **so I can** stop showing it as active and reflect the loss correctly in history.

→ *Solved by* `Clear Table → abandoned` ([PRD §8.2](../PRD.md#82-modules))

---

## Cashier / Manager Jobs

### J-M1 — Reconcile end-of-shift in minutes, not hours
> **When** the shift ends, **I want to** see total revenue, what was paid by bank transfer, what was paid by POS, and what was abandoned — **so I can** close out the day without spreadsheet work.

→ *Solved by* History page with per-page summary ([PRD §8.2](../PRD.md#82-modules))

#### J-M2 — Catch payment leakage before it compounds
> **When** a customer claims a transfer that doesn't actually hit the bank account, **I want to** see the claim sitting unverified with its unique reference, **so I can** chase it specifically and not lose the money.

→ *Solved by* `PAYMENT_PENDING` state + unique `OSHAP-{tableId}-{rand}` reference ([PRD §9.2](../PRD.md#92-payment-lifecycle), [§9.4](../PRD.md#94-reference-format))

---

## Kitchen Jobs

### J-K1 — See only what's mine, in order
> **When** I'm working the kitchen, **I want to** see only food orders in the order they were placed, with no drink items, **so I can** cook without filtering noise.

→ *Partially solved by* Kitchen view ([PRD §8.2](../PRD.md#82-modules)). *Today* the Kitchen view shows all active orders — a Food/Drink split is a Phase 2 job (will pair with the Kitchen / Bartender role separation).

#### J-K2 — Move an order through states with one tap and no ambiguity
> **When** I start cooking a dish, **I want to** tap one button. **When** it's plated and ready, **I want to** tap one button. **So I can** keep my hands on the food, not on the screen.

→ *Solved by* `Start` (`CREATED → PREPARING`) and `Ready` (`PREPARING → READY`) on Kitchen ([PRD §9.1](../PRD.md#91-order-lifecycle))

---

## Owner Jobs

### Main job

> **When** I'm running my restaurant — especially when I'm not on-site — **I want to** trust that every drink and plate that left the kitchen was paid for and accounted for, **so I can** focus on growing the business instead of policing the staff.

### Job stories

#### J-O1 — Trust the books without watching every transaction
> **When** I review the day, **I want to** see that every kitchen-completed order has a corresponding verified payment or a recorded abandonment, **so I can** be confident that nothing slipped through.

→ *Solved by* Order ↔ Payment 1:1 link + lifecycle that requires explicit `CONFIRMED` or `CANCELLED` ([PRD §9.1](../PRD.md#91-order-lifecycle))

#### J-O2 — Run the menu without depending on a developer
> **When** I want to add a daily special, mark an item out of stock, or update a price, **I want to** do it from a phone in seconds, **so I can** keep the menu accurate without filing a ticket.

→ *Solved by* Admin Menu CRUD + image upload ([PRD §8.2](../PRD.md#82-modules))

#### J-O3 — Onboard a new staff member in under a minute
> **When** I hire someone new, **I want to** make them productive immediately — just the PIN, no account setup, no training session — **so I can** open more shifts without operational overhead.

→ *Solved by* single shared Admin PIN per restaurant ([PRD §8.1](../PRD.md#81-authentication)). *Trade-off:* PIN is shared across the whole restaurant. Per-user accounts arrive in Phase 2 with RBAC.

---

## JTBD → Feature Map

Quick lookup for "why does this feature exist?":

| Job | Feature | PRD section |
|---|---|---|
| J-C1 Order without flagging waiter | QR + Menu + Cart + Order | [§7.1–7.3](../PRD.md#7-customer-features) |
| J-C2 Add a round without disrupting | Re-order from My Orders | [§7.7](../PRD.md#77-order-tracking) |
| J-C3 Pay and leave on my schedule | Bank Transfer + Request POS | [§7.5](../PRD.md#75-payment) |
| J-C4 Order together at one table | Group session with PIN | [§7.4](../PRD.md#74-group--shared-table-ordering-order-together) |
| J-C5 Know what's happening with my order | My Orders + 5s polling | [§7.7](../PRD.md#77-order-tracking) |
| J-C6 Get a waiter when I need one | Call a Waiter | [§7.6](../PRD.md#76-call-a-waiter) |
| J-C7 Pay the way I'm comfortable | Two payment paths | [§7.5](../PRD.md#75-payment) |
| J-W1 See live table state | Waiter Dashboard | [§8.2](../PRD.md#82-modules) |
| J-W2 Know instant a customer needs me | FCM push + audio chime | [§8.3](../PRD.md#83-push-notifications-fcm) |
| J-W3 Verify payment in one tap | Verify Payment + auto-close | [§8.2](../PRD.md#82-modules) |
| J-W4 Bring POS to right table | `pos_requested` push payload | [`fcm-notifications.md`](fcm-notifications.md) |
| J-W5 Recover abandoned bill | Clear Table → abandoned | [§8.2](../PRD.md#82-modules) |
| J-M1 Reconcile end-of-shift fast | History + summary | [§8.2](../PRD.md#82-modules) |
| J-M2 Catch payment leakage | Reference + pending state | [§9.2](../PRD.md#92-payment-lifecycle) |
| J-K1 See only my kitchen orders | Kitchen view *(food/drink split: Phase 2)* | [§8.2](../PRD.md#82-modules) |
| J-K2 One-tap state transitions | Start / Ready buttons | [§9.1](../PRD.md#91-order-lifecycle) |
| J-O1 Trust the books | Order ↔ Payment 1:1 + explicit terminal states | [§9.1](../PRD.md#91-order-lifecycle), [§9.2](../PRD.md#92-payment-lifecycle) |
| J-O2 Run the menu without a dev | Admin Menu CRUD | [§8.2](../PRD.md#82-modules) |
| J-O3 Onboard staff in under a minute | Shared restaurant PIN | [§8.1](../PRD.md#81-authentication) |

---

## Success Outcomes

A job is "done well" when these are true. These become the KPIs for the pilot (Phase 3 in the PRD rollout plan).

### Customer
- **Time-to-first-order** (scan → order placed): **< 90s** median
- **Time-to-pay** (post-eating → payment claimed): **< 60s** median
- **Number of times a customer has to attract staff attention to order:** 0
- **Drop-off between scan and first order:** < 20%

### Waiter
- **Tables per waiter** without missing requests: **2× the pre-Oshap baseline**
- **Customer-need → waiter-aware** latency: **< 15s** (FCM + chime)
- **Manual end-of-shift reconciliation steps:** 0

### Owner
- **Payment leakage** (delivered orders without a matching verified payment or recorded abandonment): **0**
- **New staff onboarding time:** **< 5 min** (PIN handoff + 2 min menu walk-through)
- **Daily reconciliation:** built into the dashboard, not a separate task

---

## How to use this document

When proposing a new feature, before writing a spec:

1. **Find the job it's solving.** If you can't, the feature probably shouldn't ship.
2. **Check whether an existing feature already solves that job.** If so, improve the existing one before adding a new surface.
3. **Check whether the job is in the anti-job list.** If so, push back.
4. **If it's a genuinely new job**, add it here first, then write the PRD section.

This keeps the product surface narrow and the team aligned on *why*, not just *what*.
