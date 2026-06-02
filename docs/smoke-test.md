# Oshap — Smoke Test Checklist

Run this **before every release** and **after any backend integration milestone**.

It's intentionally hand-driven, not automated. Each path here is a JTBD ([`docs/jtbd.md`](jtbd.md)); if any of them break, ship is blocked.

Each test is **pass / fail** in the box. Mark a failure with `[F]` and a one-line note.

**Browsers to run on:**
- One mobile (real device or Chrome dev-tools mobile emulation): customer flows
- One desktop (Chrome and Safari/Firefox): admin flows + customer regression

**Mode:** Set `VITE_API_BASE_URL` to the staging backend for a real run; leave unset for the mock-mode regression pass (a separate run with the same checklist).

---

## Customer app

### Path 1 — First-time scan to order (J-C1)
- [ ] Open `/menu?table=T1` cold (cleared `sessionStorage` and `localStorage`)
- [ ] Restaurant name, table badge, and Call Waiter / Search / Theme Toggle render in the header
- [ ] Menu items load within 2s, all images render (no broken thumbnails)
- [ ] Category tabs render at least "All" + the actual categories
- [ ] Search opens and filters live
- [ ] Tap "Add" on an item → CartBar updates, totals correct
- [ ] Open Cart drawer → drag-to-dismiss works (handle → swipe down)
- [ ] Tap Checkout → summary correct → confirm → redirected to `/orders`
- [ ] Order appears in My Orders with status `CREATED`

### Path 2 — Group ordering (J-C4)
- [ ] On `/orders`, enter a name → Start Session → 4-digit PIN renders in PinChip
- [ ] Refresh the page → session persists, PIN still visible
- [ ] In a second tab in the same browser, open the same `/menu?table=...&...`, navigate to `/orders`, enter a different name → Join with PIN → both tabs see each other's items
- [ ] **Known limitation:** cross-browser/cross-device join fails in mock mode (browser-local storage). Error message reads cleanly, not "Invalid PIN."

### Path 3 — Pay by bank transfer (J-C3, J-C7)
- [ ] On `/pay`, bank details render with copy-to-clipboard working
- [ ] Tap "I've Sent the Money" → page flips to "Payment Claimed" state
- [ ] Polling refresh: if admin verifies, page eventually transitions out of pending state without manual refresh

### Path 4 — Request a POS (J-C7)
- [ ] On `/pay`, tap "Request a POS"
- [ ] Page flips to "POS On The Way" copy with the card-pay icon (not the bank-transfer "Payment Claimed" copy)
- [ ] Admin dashboard shows the table in `PAYMENT_PENDING`
- [ ] Admin verifies → page transitions out

### Path 5 — Call a waiter (J-C6)
- [ ] Tap the service bell in any customer header
- [ ] Toast appears: "A waiter is on the way"
- [ ] Repeated taps: each fires (no client cooldown); admin sees one push within the dedupe window

### Path 6 — Dark mode (any time)
- [ ] Tap the theme toggle (moon icon) → entire UI flips to dark immediately
- [ ] Hard refresh the page → still dark, no light flash on load
- [ ] Tap toggle again (sun icon) → back to light, persists across refresh
- [ ] Clear `localStorage` + `oshap-theme` → reload — defaults follow OS preference

### Path 7 — Error states
- [ ] Disconnect the network and try to place an order → user sees a clear toast error, not a silent failure
- [ ] Wrong session PIN → shows server's actual error message ("Invalid PIN or no active session"), not just "Invalid PIN"

---

## Admin app

### Path 1 — PIN login + restaurant resolution
- [ ] Cold open admin app → PIN screen renders
- [ ] Enter the configured PIN → dashboard loads, restaurant name visible in nav
- [ ] Refresh the page → still authenticated (PIN cached in `sessionStorage`)
- [ ] Click Logout → returns to PIN screen, `sessionStorage` cleared

### Path 2 — FCM device registration (J-W2)
- [ ] Browser prompts for notification permission on first login (or auto-grants if previously set)
- [ ] If granted: `POST /devices/register` succeeds, dev console shows `[FCM] Device token registered successfully.`
- [ ] If denied or env vars empty: console warning appears, but UI doesn't break

### Path 3 — Waiter Dashboard live state (J-W1)
- [ ] Tables list renders with unpaid + pending totals per table
- [ ] Customer places a new order in another tab → table updates within 5s without manual refresh
- [ ] Tap "Refresh" → spinner shows during refetch, button disabled, label "Refreshing…"

### Path 4 — Verify payment (J-W3)
- [ ] Table with pending payment → tap Verify → confirmation, table flips to no-pending state
- [ ] If no other unpaid/pending: auto-close fires, table is cleared from the active list

### Path 5 — Clear table (J-W5)
- [ ] Tap Clear → confirmation prompt with Paid / Abandoned options
- [ ] Choose Abandoned → table closes, orders are `CANCELLED`
- [ ] No active orders remain on the cleared table

### Path 6 — Kitchen workflow (J-K2)
- [ ] `/kitchen` shows active `CREATED`/`PREPARING`/`READY` orders
- [ ] Tap "Start" on a CREATED order → moves to PREPARING
- [ ] Tap "Ready" on a PREPARING order → moves to READY
- [ ] Customer app's My Orders reflects the new status within 5s

### Path 7 — Menu CRUD + image upload (J-O2)
- [ ] `/menu` admin route renders existing items
- [ ] Add new item — fill form, upload image — saves, appears in list, image renders
- [ ] Edit existing item — change price, save — list reflects new price
- [ ] Toggle availability — item is no longer visible in customer menu
- [ ] Delete item — confirmation, then removed from list

### Path 8 — History + summary (J-M1)
- [ ] `/history` renders paginated `CONFIRMED` + `CANCELLED` orders
- [ ] Summary at top shows confirmed count, cancelled count, page revenue
- [ ] Table filter input narrows the list
- [ ] Date filter narrows the list
- [ ] Refresh spinner behavior matches Path 3 above

### Path 9 — Foreground push alerts (J-W2)
- [ ] With admin app open: customer in another browser hits "Call Waiter"
- [ ] Audio chime plays (two-tone bell)
- [ ] Top-right toast renders with table number and service-bell icon
- [ ] Toast auto-dismisses after 5s
- [ ] Same flow for Request POS → distinct icon (`mgc_card_pay_line`)

### Path 10 — Background push (PWA / closed tab)
- [ ] Hide / minimize the admin tab
- [ ] Customer triggers Call Waiter
- [ ] OS notification fires with table and message
- [ ] Clicking it opens the admin app

### Path 11 — PWA install
- [ ] On Chrome desktop or Android: install prompt available
- [ ] After install: launches in standalone window without browser chrome
- [ ] Icon on home screen is the orange-O brand mark

---

## Cross-app regression

- [ ] Both apps load on slow 3G under 3 seconds (Lighthouse)
- [ ] No console errors in either app on any of the above paths
- [ ] Dark mode renders all routes legibly (no white-on-white or black-on-black text)
- [ ] No native `alert()` dialogs anywhere — only the new `<Toaster />` toasts
- [ ] Vercel deploy: refresh on `/menu?table=T1`, `/kitchen`, `/menu/foo` doesn't 404
- [ ] `npm run lint` passes with 0 errors and 0 warnings

---

## Known limitations (not blockers)

- Mock mode is browser-local: cross-device group-session join won't work until the real backend is wired
- No automated test suite — this checklist is the only smoke layer
- `RBAC`, `Analytics`, `Staff Management`, customer Notification Center are all Phase 2

If any **blocker** above fails: do not ship.
If any **known limitation** is hit during a paying-customer flow: open a bug, decide ship/no-ship.
