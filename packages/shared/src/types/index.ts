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
  name: string;
  option: string;
  price_delta: number;
}

export interface OrderItem {
  id: string;
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
  purchase: "PURCHASE",
  wastage: "WASTAGE",
  stockTake: "STOCK_TAKE",
  correction: "CORRECTION",
  sale: "SALE",
} as const;

export type StockReason = (typeof STOCK_REASONS)[keyof typeof STOCK_REASONS];

export interface AdjustStockRequest {
  /** Signed: negative removes. */
  delta: number;
  reason: string;
  note?: string;
}

export interface StockMovement {
  id: string;
  ingredient_id: string;
  delta: number;
  reason: string;
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
  reason?: string;
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
  id: string;
  status: TableStatus;
  unpaidTotal: number;
  pendingTotal: number;
  hasPending: boolean;
  hasUnpaid: boolean;
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
  /** Cash tendered, in kobo. Recorded for the drawer, not used to settle. */
  amount?: number;
}

export interface RecordCashResponse {
  success: true;
  /** Orders settled. */
  paid: number;
  /** Total settled, in kobo. */
  amount: number;
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

/**
 * A receipt is composed server-side rather than assembled from the live order,
 * because it has to reflect the restaurant and prices *at the time of sale* —
 * a name or VAT-rate change afterwards must not rewrite history.
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

export interface AdminVerifyRequest {
  table_id: string;
}

/** Rejects a claimed payment: orders return to unpaid, the account is penalised. */
export interface AdminRejectRequest {
  table_id: string;
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

export type SubscriptionTier = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

export interface PlatformRestaurant extends Restaurant {
  subscription_tier: SubscriptionTier;
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
  is_active?: boolean;
}
