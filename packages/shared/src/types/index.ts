/**
 * Oshap domain types — mirrors the FastAPI / Pydantic schemas defined in
 * docs/openapi.yaml. Keep this file in sync with that spec.
 *
 * MONEY: every money field below is an **integer number of kobo**
 * (1 naira = 100 kobo). `price: 250000` is ₦2,500. The backend computes VAT and
 * totals in integer kobo so they reconcile exactly, and we match it — values
 * stay in kobo through state and arithmetic, converting only to render
 * (`formatCurrency`) or to read a number a human typed (`nairaToKobo`).
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "CREATED"
  | "PREPARING"
  | "READY"
  /** Food reached the table. Says nothing about the money. */
  | "SERVED"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  /** Was paid, then refunded. Distinct from CANCELLED, which was never paid. */
  | "REFUNDED";

/** FAILED = staff rejected a claimed payment; the order returns to unpaid. */
export type PaymentStatus =
  | "NOT_PAID"
  | "CLAIMED"
  | "CONFIRMED"
  | "VERIFIED"
  /** Staff rejected a claimed payment; the order returns to unpaid. */
  | "FAILED"
  /** A refund. The payment row carries a negative amount. */
  | "REFUNDED";

export type TableStatus = "OPEN" | "CLOSED";

export type SessionStatus = "ACTIVE" | "CLOSED";

export type CloseReason = "paid" | "abandoned";

/** How the money actually arrived. Stored server-side, not inferred. */
export type PaymentMethod = "CASH" | "MANUAL_TRANSFER" | "POS";

export type Role = "OWNER" | "MANAGER" | "CASHIER" | "WAITER" | "KITCHEN" | "BARTENDER";

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/**
 * A restaurant payout account.
 *
 * Restaurants hold several because Nigerian bank transfers fail often enough
 * that a single account is a single point of failure. The backend ranks the
 * active ones — default first, then by observed success rate — and the customer
 * pay screen offers the top-ranked with the rest as fallbacks.
 *
 * `is_default` is the exclusive flag (setting it unsets the others).
 * `is_active` is independent: an inactive account is simply not offered.
 */
export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_active: boolean;
  is_default: boolean;
  /** Verified payments into this account. Feeds the ranking. */
  success_count?: number;
  /** Rejected payments claimed against this account. Feeds the ranking. */
  failure_count?: number;
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  /** Street address, shown to guests as "You're sitting at …". */
  address?: string | null;
  operating_hours?: string | null;
  whatsapp_number?: string | null;
  /**
   * The restaurant's brand colour, as a hex string.
   *
   * Free text on the API rather than a validated hex, so it is parsed at the
   * boundary and anything unusable falls back to the default theme — see
   * `deriveBrandPalette`. Applies to the customer app only; the admin stays
   * Oshap orange, because a group owner switching branches should not have the
   * tool they work in change colour mid-shift.
   */
  primary_color?: string | null;
  /** Hero image above the menu. Optional; absent means no hero, not a grey box. */
  cover_image_url?: string | null;
  /**
   * Tax and service charge in **integer basis points**, not percentages:
   * `750` = 7.5%, `1000` = 10%. Kept as integers for the same reason money is —
   * a percentage float would reintroduce drift into VAT.
   */
  vat_rate?: number;
  service_charge_rate?: number;
}

export interface StaffMember {
  id: string;
  name: string;
  /**
   * Canonical E.164, and the account's unique identity. Required because not
   * every waiter has an email address — asking a restaurant for nine work
   * inboxes is not a thing that happens.
   */
  phone: string;
  email?: string | null;
  role: Role;
  created_at: string;
}

/**
 * One choice within a modifier group — "Large", "Extra shito", "No pepper".
 *
 * `price_delta` is in kobo and may be zero or negative: a smaller portion that
 * costs less is as legitimate as an extra that costs more.
 */
export interface ModifierOption {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  sort_order: number;
  available: boolean;
}

/**
 * A reusable set of choices, owned by the restaurant rather than by a dish —
 * one "Protein" group can be attached to every rice dish on the menu, so
 * renaming an option fixes it everywhere at once.
 *
 * `min`/`max` bound how many options a guest picks; `required` decides whether
 * zero is allowed at all. A single-choice group is `min: 1, max: 1`.
 */
export interface ModifierGroup {
  id: string;
  restaurant_id: string;
  name: string;
  required: boolean;
  min: number;
  max: number;
  sort_order: number;
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  category: string;
  description?: string | null;
  image_url?: string | null;
  available: boolean;
  sort_order: number;
  /** null = inventory tracking disabled for this item */
  stock_count: number | null;
  low_stock_threshold: number;
  /** Groups attached to this dish, sent inline by `GET /menu`. */
  modifier_groups?: ModifierGroup[];
}

/**
 * A chosen modifier as it appears on an order, kitchen ticket or receipt.
 *
 * Denormalized on purpose: `name` is the group's name and `option` the chosen
 * option's, both captured at order time. Renaming a modifier next month must
 * not rewrite a ticket already printed.
 */
export interface OrderItemModifier {
  /**
   * The chosen option's id, which is what putting this line back in a cart
   * needs — a name is not enough to order against.
   *
   * Optional because orders placed before the API returned it have none. A
   * historical line missing this cannot be reordered exactly, and guessing
   * would put food on a bill the guest did not choose.
   */
  option_id?: string;
  /** The group's name, e.g. "Protein". */
  name: string;
  /** The chosen option's name, e.g. "Turkey". */
  option: string;
  price_delta: number;
}

export interface OrderItem {
  /** The line's own id — not the dish's. */
  id: string;
  /**
   * The dish this line was made from.
   *
   * Returned by the API all along and undeclared here, so reordering sent the
   * *line's* id as the menu item and the order failed. Optional because orders
   * placed before it was read back have none.
   */
  menu_item_id?: string | null;
  order_id?: string;
  name: string;
  quantity: number;
  /** Per-unit price **including** modifier deltas — the server resolves it. */
  price: number;
  notes?: string | null;
  modifiers?: OrderItemModifier[] | null;
}

export interface Order {
  id: string;
  table_id: string;
  restaurant_id: string;
  status: OrderStatus;
  /**
   * The money breakdown, computed server-side in integer kobo. The invariant,
   * exactly — no rounding slack:
   *
   *   total = subtotal - discount + service_charge + vat + tip
   *
   * Optional because orders placed before these fields existed only carry
   * `total`; treat a missing part as zero rather than recomputing it here.
   */
  subtotal?: number;
  discount?: number;
  service_charge?: number;
  vat?: number;
  tip?: number;
  total: number;
  reference: string;
  session_id?: string | null;
  customer_name?: string | null;
  device_token?: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  status: PaymentStatus;
  proof_url?: string | null;
  /** Which account the customer claimed to pay into — credited on verify, penalised on reject. */
  bank_account_id?: string | null;
  method?: PaymentMethod;
  created_at: string;
}

export interface TableSession {
  id: string;
  table_id: string;
  pin: string;
  status: SessionStatus;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Composite / response shapes
// ---------------------------------------------------------------------------

/** Aggregated active orders on a table, scoped to a device/session. */
export interface ActiveOrderBundle extends Order {
  /** IDs of all orders combined into this bundle (latest order is `id`). */
  combined_order_ids: string[];
}

/** GET /table/:id response. */
export interface TableInfo {
  table_id: string;
  status: TableStatus;
  restaurant: Restaurant;
  /**
   * Active accounts, already ranked by the backend — default first, then by
   * success rate. Render `[0]` as the primary and offer the rest as fallbacks.
   * Empty means the restaurant takes POS/cash only.
   */
  bank_accounts: BankAccount[];
  unpaid_order: ActiveOrderBundle | null;
  pending_payments: ActiveOrderBundle | null;
}

/** GET /orders/:id response (order + payment together). */
export interface OrderDetail {
  id: string;
  table: string;
  items: OrderItem[];
  /** Same breakdown as `Order` — a guest should be able to see the VAT they paid. */
  subtotal?: number;
  discount?: number;
  service_charge?: number;
  vat?: number;
  tip?: number;
  total: number;
  status: OrderStatus;
  reference: string;
  payment: Payment | null;
  created_at: string;
}

/** Order shape returned by /session/orders and /admin/kitchen. */
export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

/** Sent when ordering: the option only. The server resolves name and price. */
export interface OrderItemModifierRequest {
  option_id: string;
}

export interface CreateOrderItem {
  name: string;
  qty: number;
  /**
   * The dish's **base** price in kobo, WITHOUT modifier deltas.
   *
   * The server computes `line_price = price + sum(option.price_delta)`, so
   * sending an already-adjusted price double-counts every modifier. The order
   * that comes back carries the resolved figure — this is the one place in the
   * API where the same field name means different things in each direction.
   */
  price: number;
  menu_item_id?: string;
  notes?: string;
  modifiers?: OrderItemModifierRequest[];
}

export interface CreateOrderRequest {
  table: string;
  restaurant_id: string;
  items: CreateOrderItem[];
  session_id?: string;
  customer_name?: string;
  device_token?: string;
}

export interface CreateOrderResponse {
  success: true;
  order_id: string;
  reference: string;
  total: number;
}

export interface ClaimPaymentRequest {
  order_id?: string;
  combined_order_ids?: string[];
  proof_url?: string;
  /**
   * The account the customer says they paid into. Verifying increments its
   * success count and rejecting increments its failure count, which is how the
   * ranking improves — omitting it means the ranking never learns.
   */
  bank_account_id?: string;
}

export interface ClaimPaymentResponse {
  success: true;
  processed: number;
}

export interface ConfirmOrdersRequest {
  order_ids: string[];
}

export interface ConfirmOrdersResponse {
  success: true;
  confirmed: number;
}

export interface SessionStartRequest {
  tableId: string;
  action: "START";
  customer_name?: string;
  unclaimed_order_ids?: string[];
}

export interface SessionJoinRequest {
  tableId: string;
  action: "JOIN";
  pin: string;
  customer_name?: string;
  unclaimed_order_ids?: string[];
}

export type SessionRequest = SessionStartRequest | SessionJoinRequest;

export interface SessionResponse {
  success: true;
  session: TableSession;
}

export interface SessionOrdersResponse {
  success: true;
  orders: OrderWithItems[];
}

export interface CallWaiterRequest {
  table_id: string;
  session_id?: string;
}

export interface CallWaiterResponse {
  success: true;
}

export interface RequestPosRequest {
  table_id: string;
  session_id?: string;
  device_token?: string;
}

export interface RequestPosResponse {
  success: true;
  processed: number;
}

// ---------------------------------------------------------------------------
// Admin payloads
// ---------------------------------------------------------------------------

export interface AdminMeResponse {
  restaurant: Restaurant;
  user: StaffMember;
}

/**
 * Staff authenticate with an identifier + password, or a PIN.
 *
 * `identifier` accepts a phone number or an email and the server resolves
 * which by shape. `email` remains accepted as a deprecated alias; new call
 * sites should send `identifier`.
 *
 * `restaurant_id` scopes a PIN lookup to one restaurant. Without it the PIN
 * is matched across every tenant, which is how a PIN belonging to another
 * merchant could return a working token.
 */
export interface AdminLoginRequest {
  identifier?: string;
  /** @deprecated Send `identifier` instead. */
  email?: string;
  password?: string;
  pin?: string;
  restaurant_id?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  /** Access-token lifetime in seconds (900 = 15 minutes). */
  expires_in: number;
}

export interface AdminLoginResponse extends AuthTokens {
  user: StaffMember;
  restaurant: Restaurant;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

/** Refresh returns a new access token only — the refresh token is unchanged. */
export interface RefreshTokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface CreateStaffRequest {
  name: string;
  /** Canonical E.164 — normalize with `normalizePhone` before sending. */
  phone: string;
  email?: string;
  role: Role;
  password?: string;
}

export interface UpdateStaffRequest {
  name?: string;
  phone?: string;
  email?: string;
  role?: Role;
  password?: string;
}

// --- Owner setup & password recovery ---------------------------------------
// A setup token stands in for the account until it is used, so it is treated
// as a credential: single-use, expiring, and never rendered anywhere but the
// link itself.

export interface SetupVerifyRequest {
  token: string;
}

/**
 * Enough for the owner to recognise which account they are claiming, without
 * exposing a full contact detail to whoever holds the link.
 */
export interface SetupVerifyResponse {
  restaurant_name: string;
  owner_name: string;
  phone_hint: string;
  email_hint?: string | null;
}

export interface SetupCompleteRequest {
  token: string;
  password: string;
}

/** Phone or email — the server resolves which by shape. */
export interface ForgotPasswordRequest {
  identifier: string;
}

export interface CreateMenuItemRequest {
  name: string;
  price: number;
  category: string;
  description?: string;
  image_url?: string;
}

export interface UpdateMenuItemRequest {
  name?: string;
  price?: number;
  category?: string;
  description?: string;
  image_url?: string;
  sort_order?: number;
}

// --- Modifiers -------------------------------------------------------------
// Groups belong to the restaurant, not to a dish. They're created once and
// attached to as many items as needed, so the create call takes its options
// inline while later edits address options individually.

export interface ModifierOptionRequest {
  name: string;
  price_delta?: number;
}

export interface CreateModifierGroupRequest {
  name: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: ModifierOptionRequest[];
}

export interface UpdateModifierGroupRequest {
  name?: string;
  required?: boolean;
  min?: number;
  max?: number;
  sort_order?: number;
}

export interface CreateModifierOptionRequest {
  name: string;
  price_delta?: number;
}

export interface UpdateModifierOptionRequest {
  name?: string;
  price_delta?: number;
  available?: boolean;
  sort_order?: number;
}

/** Replaces the whole attachment set for an item — send every id to keep. */
export interface SetMenuItemModifierGroupsRequest {
  group_ids: string[];
}

/** The item's groups after the write, so the cache can be updated in place. */
export interface MenuItemGroupsResponse {
  modifier_groups: ModifierGroup[];
}

// --- Ingredients & recipes -------------------------------------------------
// Dish-level `stock_count` counts plates; this counts what plates are made of.
// Quantities are fractional (2.5 kg of rice), unlike the integer plate counts,
// so every qty here is a float and must not be rounded on the way through.

export interface Ingredient {
  id: string;
  restaurant_id: string;
  name: string;
  /** Free text — "kg", "L", "bottle". The merchant's own vocabulary. */
  unit: string;
  /** Fractional on purpose: 2.5 kg is a real stock level. */
  stock_qty: number;
  low_stock_threshold?: number | null;
  /** Cost of one unit in kobo, for margin once recipes are attached. */
  cost_per_unit?: number | null;
  supplier_id?: string | null;
  /** Target level to reorder back up to. */
  par_level?: number | null;
}

export interface CreateIngredientRequest {
  name: string;
  unit?: string;
  stock_qty?: number;
  low_stock_threshold?: number | null;
  cost_per_unit?: number | null;
  par_level?: number | null;
}

export interface UpdateIngredientRequest {
  name?: string;
  unit?: string;
  low_stock_threshold?: number | null;
  cost_per_unit?: number | null;
  par_level?: number | null;
}

/**
 * Stock is never set to a figure — it's moved by a delta with a reason, so the
 * ledger explains every change. `SALE` movements are written by the server when
 * an order depletes a recipe; the rest come from staff.
 */
export const STOCK_REASONS = {
  restock: "RESTOCK",
  wastage: "WASTAGE",
  countCorrection: "COUNT_CORRECTION",
  transfer: "TRANSFER",
  sale: "SALE",
} as const;

/**
 * The server's vocabulary, exactly.
 *
 * We previously used our own — `PURCHASE`, `STOCK_TAKE`, `CORRECTION` — and
 * only `WASTAGE` overlapped, so three of the four reasons a staff member could
 * pick were rejected with a raw enum dump. Nothing caught it because `reason`
 * was typed `string` and the mock accepted any non-empty value; both are fixed
 * here, which is what stops it recurring.
 */
export type StockReason = (typeof STOCK_REASONS)[keyof typeof STOCK_REASONS];

export interface AdjustStockRequest {
  /** Signed: negative removes. */
  delta: number;
  /** Typed, not `string` — the drift above is exactly what that allowed. */
  reason: StockReason;
  note?: string;
}

export interface StockMovement {
  id: string;
  ingredient_id: string;
  delta: number;
  reason: StockReason;
  actor_id?: string | null;
  note?: string | null;
  /** Present when the movement came from an order rather than a person. */
  order_id?: string | null;
  created_at: string;
}

export interface StockMovementsResponse {
  movements: StockMovement[];
  total: number;
  page: number;
  per_page: number;
}

export interface StockMovementQuery {
  reason?: StockReason;
  page?: number;
  per_page?: number;
}

/** One ingredient consumed by one serving of a dish. */
export interface RecipeLine {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  qty_per_serving: number;
}

export interface RecipeResponse {
  menu_item_id: string;
  lines: RecipeLine[];
}

export interface SetRecipeRequest {
  lines: Array<{ ingredient_id: string; qty_per_serving: number }>;
}

/**
 * Removing several dishes at once.
 *
 * The endpoint has been live since the backend shipped it and nothing had ever
 * called it, because the menu screen offered no way to select more than one
 * item. Clearing out a seasonal section one dish at a time is the kind of chore
 * that quietly stops people tidying their menu at all.
 */
export interface BulkDeleteRequest {
  /** At least one. The server rejects an empty list. */
  item_ids: string[];
}

/** A dish the server would not remove, and why. */
export interface BulkDeleteError {
  item_id: string;
  message: string;
}

/**
 * Deliberately tolerant.
 *
 * The API types this response as an untyped object, so we cannot rely on any
 * particular key being present — the caller treats a missing `deleted` as
 * "however many we asked for" rather than reporting zero at a merchant who
 * just watched several dishes disappear.
 *
 * `errors` matters more than the count. A dish that appears on a past order
 * may be refused by a foreign key, and "3 of 5 removed" without naming the two
 * survivors sends someone hunting through the list to work out which.
 */
export interface BulkDeleteResponse {
  deleted?: number;
  errors?: BulkDeleteError[];
}

/** One rejected row from a bulk import, addressed so a merchant can find it. */
export interface MenuImportError {
  row: number;
  field?: string;
  message: string;
}

/**
 * Bulk import is partial-success by design: a typo in row 17 shouldn't reject
 * the other 79 rows. `dry_run` returns this same shape without writing, so the
 * merchant sees the outcome before committing.
 */
export interface MenuImportResponse {
  created: number;
  updated: number;
  skipped: number;
  errors: MenuImportError[];
}

export interface AdminTableStatus {
  /**
   * The table's globally unique id. This is what `GET /table/{id}` takes and
   * what a QR code encodes — table *names* repeat across restaurants, so a
   * name alone identifies nothing.
   */
  id: string;
  /** The name staff read: "T1", "VIP 2". Unique only within a restaurant. */
  table_id: string;
  status: TableStatus;
  unpaidTotal: number;
  pendingTotal: number;
  hasPending: boolean;
  hasUnpaid: boolean;
  /**
   * The open bills on this table, as bare ids. Superseded by `live_orders`,
   * which carries the same orders with the guest and payment state attached —
   * kept because it is still what the cash dialog posts.
   */
  unpaid_order_ids: string[];
  /**
   * Every open bill on the table, with who it belongs to and where its money
   * has got to.
   *
   * This is what makes a shared table workable. Two guests ordering separately
   * is the ordinary case, and until this arrived the board could only show one
   * total and one set of buttons for the whole table — so verifying one guest's
   * transfer settled a bill and left the table lit for the other's, which read
   * as a broken button rather than as the correct answer it was.
   *
   * Optional because a deployment may predate it; the card falls back to the
   * table-level totals when it is missing.
   */
  live_orders?: AdminTableLiveOrder[] | null;
  /**
   * Still owing across the table, in kobo. Distinct from `unpaidTotal`, which
   * counts bills not yet paid at all — this nets off part payments.
   */
  outstanding_total?: number;
}

/**
 * One open bill on a table.
 *
 * `session_id` groups a party who ordered together — one guest starts a session
 * and reads out a PIN, others join. It is optional, so when it is null the
 * `device_token` is the party: one phone, one bill. `combined_order_ids` is
 * stronger than either, and means these orders were deliberately bundled to
 * pay as one.
 */
export interface AdminTableLiveOrder {
  order_id: string;
  session_id?: string | null;
  device_token?: string | null;
  customer_name?: string | null;
  total: number;
  /**
   * Where the kitchen has got to. Typed as a string by the API rather than as
   * `OrderStatus`, so treat an unrecognised value as data we do not understand
   * rather than assuming.
   */
  status: string;
  /** Where the money has got to. Same caveat as `status`. */
  payment_state: string;
  combined_order_ids?: string[] | null;
  /**
   * How this bill is being paid, once anyone has said. The difference matters
   * on the floor: a card request means carry the machine over, a transfer
   * means check the account and verify.
   */
  payment_method?: PaymentMethod | string | null;
  /** Taken so far, in kobo. */
  amount_paid?: number;
  /** Still owing, in kobo. Zero once settled. */
  balance_due?: number;
  created_at?: string;
}

export interface AdminTablesResponse {
  tables: AdminTableStatus[];
}

export interface KitchenUpdateRequest {
  order_id: string;
  status: "PREPARING" | "READY";
}

export interface AdminHistoryQuery {
  page?: number;
  per_page?: number;
  table?: string;
  date?: string;
}

export interface AdminHistoryOrder
  extends Omit<Order, "order_items"> {
  customer_name?: string | null;
  order_items: OrderItem[];
  payments: Payment[];
}

export interface AdminHistoryResponse {
  orders: AdminHistoryOrder[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  summary: {
    confirmed_count: number;
    cancelled_count: number;
    page_revenue: number;
  };
}

/**
 * Records cash taken at the table. Settles the orders outright — there is no
 * claim to verify, because a staff member is standing there with the money.
 */
export interface RecordCashRequest {
  order_ids: string[];
  /**
   * How the money arrived. Defaults to cash server-side, but a waiter who
   * carried the machine over or watched a transfer land should say so — a
   * method recorded wrongly is a reconciliation that cannot be done.
   */
  method?: PaymentMethod;
  /**
   * What was handed over, in kobo.
   *
   * Below the total this now leaves a balance owing rather than settling the
   * order, which is the whole reason the dialog used to refuse a short tender:
   * ₦40,000 against a ₦41,086.50 bill booked the full amount and the
   * ₦1,086.50 left no trace.
   */
  amount?: number;
}

/**
 * Marking food as delivered, and saying how it was paid for in the same tap.
 *
 * `method` omitted means **not yet** — the food is out, the bill is still open,
 * and the guest's pay screen stays live so they can settle after eating. That
 * is a state worth recording rather than an omission: before serving, an unpaid
 * bill means you can hold the food; after serving, the only leverage left is
 * the guest still being in the building.
 *
 * Nothing is ever assumed paid. The waiter says how the money arrived at the
 * moment it arrives, which is why there is no assumed-payment state anywhere in
 * this flow.
 *
 * `POS` is missing from what the endpoint accepts, though the cash endpoint
 * takes it — so a waiter who carried the machine over cannot say so here yet.
 * Raised with the backend.
 */
export interface ServeOrderRequest {
  /**
   * **Required, for now.**
   *
   * The contract allows omitting it to mean "served, not yet paid" — the whole
   * point of the flow. In service that cancelled the order and cleared the
   * table, taking a ₦26,638.50 bill with it. Until the server keeps the bill
   * open, the type refuses to let anything call this without a method, so no
   * screen can reach that path by accident.
   *
   * Make it optional again when the backend is fixed; the dialog has the
   * matching branch waiting behind one comment.
   */
  method: Extract<PaymentMethod, "CASH" | "MANUAL_TRANSFER">;
}

export interface ServeOrderResponse {
  success: true;
  order_id: string;
  status: OrderStatus | string;
  /** False when it was served without payment — the ordinary "not yet" case. */
  settled: boolean;
  /** Still owing, in kobo. */
  balance_due: number;
}

/** What one order's share of a payment did. */
export interface SettlementResult {
  order_id: string;
  settled: boolean;
  amount_applied: number;
  /** Still owing on that order, in kobo. Zero when settled. */
  balance_due: number;
}

export interface RecordCashResponse {
  success: true;
  /** Orders **fully** settled. A part payment does not count here. */
  paid: number;
  /** Total applied, in kobo. */
  amount: number;
  /**
   * Per order, so a short payment can be reported as what it is. Optional
   * because it arrived after the endpoint did.
   */
  results?: SettlementResult[];
}

/**
 * End-of-day close.
 *
 * Reported as flat figures rather than a computed breakdown. There is no
 * separate "sales before adjustments" — `total_sales` is the headline, and the
 * rest describe what made it up. The three per-method totals are what gets
 * checked against the drawer.
 */
export interface ZReportResponse {
  date: string;
  order_count: number;
  total_sales: number;
  cash_total: number;
  transfer_total: number;
  pos_total: number;
  vat_collected: number;
  service_charge_collected: number;
  discount_total: number;
  tip_total: number;
  refund_total: number;
}

// ---------------------------------------------------------------------------
// Bill adjustments
//
// Every one of these is audited server-side. They exist because a real service
// goes wrong in small ways — a dish sent back, a regular given something off,
// a card charged twice — and the alternative to correcting the bill in Oshap is
// correcting it on paper, which is how a restaurant ends up running two systems.
// ---------------------------------------------------------------------------

/** Either a flat `amount` in kobo or a `percent` of subtotal (0–100). */
export interface DiscountRequest {
  amount?: number;
  percent?: number;
}

export interface TipRequest {
  amount: number;
}

/**
 * Omitting `amount` refunds the whole order. Only a `CONFIRMED` order can be
 * refunded, and the amount cannot exceed its total.
 */
export interface RefundRequest {
  amount?: number;
  reason?: string;
}

export interface RefundResponse {
  success: true;
  /** Amount refunded, in kobo. */
  refunded: number;
}

export interface UpdateOrderItemRequest {
  quantity?: number;
  price?: number;
  name?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Paper trail
// ---------------------------------------------------------------------------

/** A receipt line. Note there is no id — key on position when rendering. */
export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string | null;
  modifiers?: Array<{ name: string; option: string; price_delta: number }> | null;
}

/**
 * Composed server-side rather than assembled from the live order, so it
 * reflects the sale as it happened — a later rename or rate change must not
 * rewrite a receipt already handed over.
 */
export interface ReceiptResponse {
  restaurant: Restaurant;
  order_id: string;
  reference: string;
  table_id: string;
  customer_name?: string | null;
  status: OrderStatus;
  payment_method?: PaymentMethod | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  service_charge: number;
  vat: number;
  tip: number;
  total: number;
  created_at: string;
  /** Null until the bill is settled. */
  paid_at?: string | null;
}

/**
 * What a staff member did to a bill. Written server-side, never by the client.
 *
 * `details` is free-form per action rather than a prepared sentence, so the
 * wording is ours to compose. `target_id` is the order id when `target_type`
 * is `"order"`.
 */
export interface AuditLogEntry {
  id: string;
  created_at: string;
  action: string;
  actor_name?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  details?: Record<string, unknown> | null;
}

export interface AuditLogQuery {
  page?: number;
  per_page?: number;
  action?: string;
}

/** Note the flat pagination — no page count is returned, so derive it. */
export interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * The action vocabulary, read off the backend's `log_audit` calls. Exact
 * strings matter — the filter compares them, so a wrong one silently shows
 * nothing rather than erroring.
 */
export const AUDIT_ACTIONS = {
  discount: "order.discount",
  tip: "order.tip",
  refund: "order.refund",
  cashPaid: "order.cash_paid",
  itemUpdate: "item.update",
  itemVoid: "item.void",
  itemComp: "item.comp",
} as const;

/**
 * Settles a claimed payment.
 *
 * `order_id` settles one guest's bill and is what the board sends now that it
 * can show them separately. Without it the server settled every claim on the
 * table, which on a shared table meant one guest's transfer closing another
 * guest's bill.
 *
 * `table_id` is the **name**, not the uuid — body fields take names throughout
 * this API. It stays as the "settle every claim here" form.
 */
export interface AdminVerifyRequest {
  table_id: string;
  order_id?: string;
}

/**
 * Rejects a claimed payment: the order returns to unpaid and the bank account
 * is penalised in the ranking.
 *
 * Keyed by **order**, not table, and that is deliberate on the server's side:
 * two guests at one table pay separately, so "reject the payment on table 4"
 * does not identify anything. We were sending `table_id` and every rejection
 * failed with `order_id: Field required`.
 */
export interface AdminRejectRequest {
  order_id: string;
  reason?: string;
}

export interface AdminRejectResponse {
  success: true;
  rejected: number;
}

export interface AdminVerifyResponse {
  success: true;
  verified_count: number;
  auto_closed: boolean;
}

export interface AdminCloseRequest {
  table_id: string;
  reason: CloseReason;
}

export interface AdminCloseResponse {
  success: true;
  table_id: string;
  reason: CloseReason;
}

export interface AdminCreateTableRequest {
  id: string;
}

export interface AdminCreateTableResponse {
  success: true;
  table_id: string;
}

export interface AdminDeleteTableResponse {
  success: true;
  table_id: string;
}

export interface UploadResponse {
  url: string;
}

export interface CreateBankAccountRequest {
  bank_name: string;
  account_number: string;
  account_name: string;
  /** Setting this true unsets the default on every other account. */
  is_default?: boolean;
}

export type UpdateBankAccountRequest = Partial<CreateBankAccountRequest> & {
  is_active?: boolean;
};

export interface AdminUpdateSettingsRequest {
  name?: string;
  description?: string | null;
  logo_url?: string | null;
  /** Brand colour as a hex string; the customer app derives its palette from it. */
  primary_color?: string | null;
  /** Hero photo above the guest's menu. */
  cover_image_url?: string | null;
  address?: string | null;
  operating_hours?: string | null;
  whatsapp_number?: string | null;
  /**
   * Integer basis points, not percent: `750` = 7.5%. Convert what a merchant
   * types with `percentToBasisPoints`. Omit to leave a rate unchanged.
   */
  vat_rate?: number;
  service_charge_rate?: number;
}

// ---------------------------------------------------------------------------
// FCM (Phase 6)
// ---------------------------------------------------------------------------

export interface RegisterDeviceRequest {
  fcm_token: string;
  restaurant_id: string;
  device_label?: string;
}

export interface RegisterDeviceResponse {
  success: true;
}

export interface AnalyticsRevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface AnalyticsPopularItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface AnalyticsPeakHour {
  hour: string;
  order_count: number;
}

export interface AnalyticsTablePerformance {
  table_id: string;
  order_count: number;
  revenue: number;
}

export interface AnalyticsStaffActivity {
  staff_name: string;
  role: string;
  actions_taken: number;
}

export interface AdminAnalyticsResponse {
  summary: {
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
  };
  revenue_over_time: AnalyticsRevenuePoint[];
  popular_items: AnalyticsPopularItem[];
  peak_hours: AnalyticsPeakHour[];
  table_performance: AnalyticsTablePerformance[];
  staff_activity: AnalyticsStaffActivity[];
}

// ---------------------------------------------------------------------------
// Inventory (Phase 12)
// ---------------------------------------------------------------------------

export interface LowStockAlert {
  item_id: string;
  name: string;
  category: string;
  stock_count: number;
  threshold: number;
}

export interface InventoryUpdateRequest {
  stock_count: number | null;
  low_stock_threshold?: number;
}

export interface InventoryUpdateResponse {
  success: true;
  item: MenuItem;
}

export interface AdminInventoryAlertsResponse {
  alerts: LowStockAlert[];
}

// ---------------------------------------------------------------------------
// Multi-Branch (Phase 12)
// ---------------------------------------------------------------------------

export interface RestaurantBranch extends Restaurant {
  is_active: boolean;
  table_count: number;
  staff_count: number;
}

export interface RestaurantGroup {
  id: string;
  name: string;
  branches: RestaurantBranch[];
}

/**
 * A new venue. Only `name` is required — an address and hours can follow once
 * someone has actually been there.
 *
 * `table_count` pre-creates that many tables, the same way onboarding a
 * restaurant does, so a branch is not born needing every table typed in by
 * hand before it can print a single QR code.
 */
export interface BranchCreateRequest {
  name: string;
  description?: string | null;
  address?: string | null;
  operating_hours?: string | null;
  whatsapp_number?: string | null;
  table_count?: number;
}

/**
 * Every field optional — this is a PATCH.
 *
 * There is no delete. A branch that closes is deactivated, because its orders,
 * takings and audit trail have to outlive it.
 */
export interface BranchUpdateRequest {
  name?: string;
  description?: string | null;
  address?: string | null;
  operating_hours?: string | null;
  whatsapp_number?: string | null;
  is_active?: boolean;
}

export interface GroupBranchAnalytics {
  branch_id: string;
  branch_name: string;
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
}

export interface GroupAnalyticsResponse {
  group_name: string;
  total_revenue: number;
  total_orders: number;
  branches: GroupBranchAnalytics[];
}

// ---------------------------------------------------------------------------
// Platform Admin (Phase 12)
// ---------------------------------------------------------------------------

export type SubscriptionTier = "LITE" | "STANDARD" | "PRO" | "ENTERPRISE";

/**
 * How a restaurant pays. Annual is ten months' worth — see `docs/plans.md`.
 *
 * The backend has stored this since the tier rename and the frontend never
 * sent it, so every restaurant onboarded so far defaults to MONTHLY, including
 * any that agreed annual terms. That is a wrong revenue record today, not a
 * missing feature.
 */
export type BillingPeriod = "MONTHLY" | "ANNUAL";

export interface PlatformRestaurant extends Restaurant {
  subscription_tier: SubscriptionTier;
  billing_period: BillingPeriod;
  is_active: boolean;
  created_at: string;
  owner_phone?: string | null;
  /** Nullable now that phone is the identity and email is optional. */
  owner_email?: string | null;
  table_count: number;
  monthly_orders: number;
  /**
   * One-time setup link for the owner, returned only by the create call.
   * The operator relays it — over WhatsApp in practice, since a merchant may
   * have no inbox. Never shown again after onboarding.
   */
  owner_setup_url?: string | null;
  owner_setup_expires_at?: string | null;
}

export interface PlatformRestaurantsResponse {
  restaurants: PlatformRestaurant[];
}

export interface PlatformSystemHealth {
  api_uptime_pct: number;
  avg_response_ms: number;
  error_rate_pct: number;
  active_sessions: number;
  total_restaurants: number;
  total_orders_today: number;
}

export interface PlatformCreateRestaurantRequest {
  name: string;
  owner_name: string;
  /** Required: the owner is reached here, and may have no email at all. */
  owner_phone: string;
  owner_email?: string;
  subscription_tier: SubscriptionTier;
  /** Defaults to MONTHLY server-side; send it anyway, so the record is a choice. */
  billing_period?: BillingPeriod;
  table_count: number;
  /**
   * Onboarding convenience: the backend converts these into the tenant's first
   * BankAccount row. They are not fields on `Restaurant` — everything after
   * onboarding goes through `/admin/settings/bank-accounts`.
   */
  bank_name?: string;
  account_number?: string;
  account_name?: string;
}

export interface PlatformUpdateRestaurantRequest {
  name?: string;
  subscription_tier?: SubscriptionTier;
  billing_period?: BillingPeriod;
  is_active?: boolean;
}

// ---------- Notifications ----------

/**
 * The six things staff are told about, per `docs/notifications.md`.
 *
 * Same vocabulary as the realtime event stream, deliberately: a stored row and
 * the toast that fired when it happened are the same fact, and the client
 * composes the wording for both from one place.
 */
export type NotificationType =
  | "waiter_called"
  | "pos_requested"
  | "new_order"
  | "order_ready"
  | "payment_claimed"
  | "low_stock";

/**
 * A stored notification, as the API actually returns it.
 *
 * This differs from `docs/notifications.md` in ways worth knowing, because the
 * bell was built against the document and quietly did nothing until it was
 * mapped onto the real shape:
 *
 * - **`is_unread`, not `read`.** Inverted, so reading the wrong one leaves
 *   every row looking unread forever.
 * - **No `resolved_by_name`.** We can say a call was claimed but not by whom,
 *   which was half the point of claiming it. Asked for.
 * - **`title` and `message` come from the server**, though the agreed design
 *   was that the server sends facts and the client writes sentences. We still
 *   compose our own from `type`, and fall back to `message` only for a type we
 *   do not recognise — so a new event still says something rather than nothing.
 * - **The facts live in `payload`**, freeform, rather than as named fields.
 */
export interface Notification {
  id: string;
  type: NotificationType | string;
  /** Server-composed. Preferred only when we cannot compose our own. */
  title?: string;
  message?: string;
  /** Freeform. Where `amount`, `menu_item_name` and the rest ended up. */
  payload?: Record<string, unknown> | null;
  table_id?: string | null;
  table_name?: string | null;
  /** Which roles this was routed to, and whether the caller is one of them. */
  audience_roles?: string[];
  for_my_role?: boolean;
  is_unread: boolean;
  is_unresolved: boolean;
  read_at?: string | null;
  resolved_at?: string | null;
  created_at?: string | null;
}

export interface NotificationQuery {
  page?: number;
  per_page?: number;
  unread_only?: boolean;
  unresolved_only?: boolean;
  type?: NotificationType;
}

/**
 * `unread_total` and `unresolved_total` count the caller's whole scope, not the
 * page — a badge that changed when you turned a page would be lying.
 */
export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread_total: number;
  unresolved_total: number;
  page: number;
  per_page: number;
}

/** Mark specific rows read, or the lot. */
export interface NotificationsMarkReadRequest {
  ids?: string[];
  all?: boolean;
}

export interface NotificationsMarkReadResponse {
  unread_total: number;
}
