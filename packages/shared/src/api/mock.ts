/**
 * Oshap Mock API — in-memory backend simulator.
 *
 * Enabled when VITE_MOCK_API=true or VITE_API_BASE_URL is not set.
 * Provides realistic data for all customer + admin endpoints so the
 * frontend works fully without a running backend.
 *
 * Stateful: orders, sessions, and payments created during the session
 * are stored in memory and reflected in subsequent queries.
 */

import type {
  AdminCloseRequest,
  BranchCreateRequest,
  BranchUpdateRequest,
  RestaurantBranch,
  AdminCloseResponse,
  AdminHistoryResponse,
  AdminMeResponse,
  AdminTablesResponse,
  AdminVerifyRequest,
  AdminVerifyResponse,
  AdminRejectRequest,
  AdminRejectResponse,
  RecordCashRequest,
  RecordCashResponse,
  PaymentMethod,
  ZReportResponse,
  DiscountRequest,
  TipRequest,
  RefundRequest,
  RefundResponse,
  UpdateOrderItemRequest,
  AuditLogEntry,
  AuditLogResponse,
  ServeOrderRequest,
  ServeOrderResponse,
  SettlementResult,
  BulkDeleteRequest,
  BulkDeleteError,
  BulkDeleteResponse,
  // Aliased: `Notification` is a DOM global, and the unaliased import
  // resolves to that one without erroring.
  Notification as StoredNotification,
  NotificationType,
  NotificationsResponse,
  NotificationsMarkReadRequest,
  NotificationsMarkReadResponse,
  ReceiptResponse,
  BankAccount,
  ClaimPaymentRequest,
  ClaimPaymentResponse,
  ConfirmOrdersRequest,
  ConfirmOrdersResponse,
  CreateMenuItemRequest,
  CreateOrderRequest,
  ModifierGroup,
  ModifierOption,
  SetupCompleteRequest,
  SetupVerifyRequest,
  SetupVerifyResponse,
  ForgotPasswordRequest,
  Ingredient,
  StockMovement,
  StockReason,
  RecipeLine,
  CreateIngredientRequest,
  UpdateIngredientRequest,
  AdjustStockRequest,
  SetRecipeRequest,
  CreateModifierGroupRequest,
  UpdateModifierGroupRequest,
  CreateModifierOptionRequest,
  UpdateModifierOptionRequest,
  SetMenuItemModifierGroupsRequest,
  OrderItemModifier,
  CreateOrderResponse,
  KitchenUpdateRequest,
  MenuImportError,
  MenuImportResponse,
  MenuItem,
  Order,
  OrderDetail,
  OrderWithItems,
  Payment,
  SessionOrdersResponse,
  SessionRequest,
  SessionResponse,
  TableInfo,
  TableSession,
  UpdateMenuItemRequest,
  UploadResponse,
  Restaurant,
  StaffMember,
  AdminLoginRequest,
  AdminLoginResponse,
  RefreshTokenResponse,
  CreateStaffRequest,
  UpdateStaffRequest,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
} from "../types/index";
import { AUDIT_ACTIONS, STOCK_REASONS } from "../types/index";
import { normalizePhone, tryNormalizePhone } from "../utils/phone";

// ---------------------------------------------------------------------------
// Mock EventSource for SSE
// ---------------------------------------------------------------------------

type SSEListener = (event: MessageEvent) => void;

class MockEventSource {
  url: string;
  onmessage: SSEListener | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  constructor(url: string) {
    this.url = url;
    const global: any = typeof window !== "undefined" ? window : globalThis;
    global.__MOCK_SSE_INSTANCES__ = global.__MOCK_SSE_INSTANCES__ || [];
    global.__MOCK_SSE_INSTANCES__.push(this);
  }
  
  close() {
    const global: any = typeof window !== "undefined" ? window : globalThis;
    if (global.__MOCK_SSE_INSTANCES__) {
      global.__MOCK_SSE_INSTANCES__ = global.__MOCK_SSE_INSTANCES__.filter((es: any) => es !== this);
    }
  }
}

const globalAny: any = typeof window !== "undefined" ? window : globalThis;
globalAny.__MOCK_EVENT_SOURCE__ = MockEventSource;

export function dispatchMockEvent(type: string, payload: any = {}) {
  const global: any = typeof window !== "undefined" ? window : globalThis;
  
  // Dispatch locally
  if (global.__MOCK_SSE_INSTANCES__) {
    for (const es of global.__MOCK_SSE_INSTANCES__) {
      if (es.onmessage) {
        es.onmessage({
          data: JSON.stringify({ type, ...payload })
        } as MessageEvent);
      }
    }
  }

  // Notify other tabs locally
  if (typeof window !== "undefined" && window.localStorage) {
    const sseEvent = JSON.stringify({ type, payload, ts: Date.now() });
    window.localStorage.setItem("oshap-mock-sse", sseEvent);
  }

  // Notify via WS relay if connected
  const globalAny: any = window;
  if (globalAny.__MOCK_WS__ && globalAny.__MOCK_WS__.readyState === 1) {
    globalAny.__MOCK_WS__.send(JSON.stringify({ type, payload }));
  }
}

// ---------------------------------------------------------------------------
// WebSocket Relay for cross-origin syncing.
//
// The relay (ws-relay.js) bridges mock state between the customer (:5173) and
// admin (:5174) apps, which are different origins and don't share localStorage.
// URL comes from VITE_MOCK_RELAY_URL (e.g. a hosted `wss://…` relay for a Vercel
// mock demo), falling back to the local dev relay. It's frequently not running,
// so we guard the connection: failures must not throw or surface as uncaught
// errors. localStorage events still provide same-origin cross-tab sync without it.
// ---------------------------------------------------------------------------
const MOCK_RELAY_URL =
  (import.meta.env.VITE_MOCK_RELAY_URL as string | undefined) ||
  "ws://localhost:5175";

if (typeof window !== "undefined") {
  let ws: WebSocket | null = null;
  try {
    ws = new WebSocket(MOCK_RELAY_URL);
    // Swallow connection errors — the relay is optional.
    ws.onerror = () => {};
    (window as any).__MOCK_WS__ = ws;
  } catch {
    ws = null;
  }

  if (ws) ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === "SYNC_STATE" || data.type === "UPDATE_STATE") {
        window.localStorage.setItem("oshap-mock-state", JSON.stringify(data.payload));
        syncFromStorage();
      } else {
        // It's an SSE event
        syncFromStorage();
        const global: any = window;
        if (global.__MOCK_SSE_INSTANCES__) {
          for (const es of global.__MOCK_SSE_INSTANCES__) {
            if (es.onmessage) {
              es.onmessage({ data: JSON.stringify(data) } as MessageEvent);
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  };
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

/**
 * Frozen defaults. Persisted state is merged *over* this rather than replacing
 * it — see syncFromStorage — so a field added to the seed still appears for
 * anyone carrying mock state written before that field existed.
 */
const SEED_RESTAURANT: Restaurant = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Aji's Kitchen",
  description: "Authentic African cuisine",
  address: "12 Adeola Odeku Street, Victoria Island, Lagos",
  // Seeded so logo-consuming surfaces — the QR print sheet, admin settings,
  // platform tenant detail — are demoable without a backend.
  logo_url:
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&q=80",
  operating_hours: "09:00 - 22:00",
  // Basis points: 750 = 7.5% VAT, 500 = 5% service charge.
  vat_rate: 750,
  service_charge_rate: 500,
  whatsapp_number: "+2348012345678",
};

let _restaurant: Restaurant = { ...SEED_RESTAURANT };

/**
 * Mirrors the backend's `bank_accounts` table. Two seeded accounts so the
 * customer pay screen's fallback path is demoable — a single account hides the
 * whole reason ranking exists.
 */
const SEED_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "bank-001",
    bank_name: "Access Bank",
    account_number: "0123456789",
    account_name: "Aji's Kitchen Ltd",
    is_active: true,
    is_default: true,
    success_count: 42,
    failure_count: 1,
  },
  {
    id: "bank-002",
    bank_name: "GTBank",
    account_number: "0987654321",
    account_name: "Aji's Kitchen Ltd",
    is_active: true,
    is_default: false,
    success_count: 12,
    failure_count: 6,
  },
];

let _bankAccounts: BankAccount[] = SEED_BANK_ACCOUNTS.map((a) => ({ ...a }));

/**
 * The backend's ordering: default first, then by success rate. A brand-new
 * account has no history, so it sorts as neutral rather than worst — otherwise
 * a freshly added account could never earn its way up.
 */
function rankedActiveAccounts(): BankAccount[] {
  const rate = (a: BankAccount) => {
    const ok = a.success_count ?? 0;
    const bad = a.failure_count ?? 0;
    return ok + bad === 0 ? 0.5 : ok / (ok + bad);
  };
  return _bankAccounts
    .filter((a) => a.is_active)
    .sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      return rate(b) - rate(a);
    });
}

/**
 * Mock figures are authored in naira for readability; the API contract is kobo.
 * Keeps the seed legible without letting a naira value reach a kobo field.
 */
const naira = (amount: number) => amount * 100;

const SEED_MENU: MenuItem[] = [
  { id: "m-001", restaurant_id: _restaurant.id, name: "Chicken Shawarma", price: naira(2500), category: "Meals", description: "Grilled chicken wrap with garlic sauce, pickles and fries", image_url: "https://www.simplyquinoa.com/wp-content/uploads/2023/05/chicken-shawarma-gyros-9.jpg", available: true, sort_order: 1, stock_count: 20, low_stock_threshold: 5 },
  { id: "m-002", restaurant_id: _restaurant.id, name: "Beef Shawarma", price: naira(3000), category: "Meals", description: "Tender beef strips with tahini sauce and fresh vegetables", image_url: "https://live.staticflickr.com/65535/51249894956_3d8a1b8b2b_h.jpg", available: true, sort_order: 2, stock_count: 15, low_stock_threshold: 5 },
  { id: "m-003", restaurant_id: _restaurant.id, name: "Jollof Rice & Chicken", price: naira(3500), category: "Meals", description: "Party-style jollof rice with a perfectly grilled chicken thigh", image_url: "https://cdn.guardian.ng/wp-content/uploads/2023/12/Photo-Credit-Jollof-Festival-.jpg", available: true, sort_order: 3, stock_count: 3, low_stock_threshold: 5 },
  { id: "m-004", restaurant_id: _restaurant.id, name: "Fried Rice & Turkey", price: naira(4000), category: "Meals", description: "Vegetable fried rice served with peppered turkey", image_url: "https://opensharaton.com/wp-content/uploads/2023/02/Fried_Rice_with_Turkey.jpeg", available: true, sort_order: 4, stock_count: null, low_stock_threshold: 5 },
  { id: "m-005", restaurant_id: _restaurant.id, name: "Peppered Chicken", price: naira(2000), category: "Meals", description: "Spicy fried chicken in a pepper sauce", image_url: "https://flavorquotient.com/wp-content/uploads/2025/04/Pepper-Chicken-Dry-FQ-8-2.webp", available: true, sort_order: 5, stock_count: 12, low_stock_threshold: 5 },
  { id: "m-006", restaurant_id: _restaurant.id, name: "Suya Platter", price: naira(3000), category: "Grills", description: "Grilled beef skewers with yaji spice, onions and tomatoes", image_url: "https://cheflolaskitchen.com/wp-content/uploads/2025/07/Suya-960x960.jpg.webp", available: true, sort_order: 1, stock_count: 8, low_stock_threshold: 5 },
  { id: "m-007", restaurant_id: _restaurant.id, name: "Grilled Fish", price: naira(5000), category: "Grills", description: "Whole catfish grilled with pepper sauce and plantain", image_url: "https://simshomekitchen.com/wp-content/uploads/2025/08/Two-whole-grilled-tilapia-in-a-tray-with-plantain-lettuce-and-pepper-sauce.jpg", available: true, sort_order: 2, stock_count: 2, low_stock_threshold: 3 },
  { id: "m-008", restaurant_id: _restaurant.id, name: "Asun", price: naira(3500), category: "Grills", description: "Spicy smoked goat meat with peppers and onions", image_url: "https://lowcarbafrica.com/wp-content/uploads/2019/09/Asun-recipe-IG-1.jpg", available: true, sort_order: 3, stock_count: null, low_stock_threshold: 5 },
  { id: "m-009", restaurant_id: _restaurant.id, name: "Chapman", price: naira(1500), category: "Drinks", description: "Classic Nigerian cocktail with Fanta, Sprite and bitters", image_url: "https://www.africanrecipes.com.ng/wp-content/uploads/2025/08/chapman-drink-featured.png.webp", available: true, sort_order: 1, stock_count: null, low_stock_threshold: 5 },
  { id: "m-010", restaurant_id: _restaurant.id, name: "Zobo", price: naira(800), category: "Drinks", description: "Refreshing hibiscus drink with ginger and pineapple", image_url: "https://lowcarbafrica.com/wp-content/uploads/2020/07/Sorrel-drink-sobolo-zobo-Drink-blog-1a.jpg", available: true, sort_order: 2, stock_count: null, low_stock_threshold: 5 },
  { id: "m-011", restaurant_id: _restaurant.id, name: "Fresh Orange Juice", price: naira(1200), category: "Drinks", description: "Freshly squeezed orange juice, no sugar added", image_url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80", available: true, sort_order: 3, stock_count: null, low_stock_threshold: 5 },
  { id: "m-012", restaurant_id: _restaurant.id, name: "Coca-Cola", price: naira(500), category: "Drinks", description: "Classic Coca-Cola 50cl bottle", image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80", available: true, sort_order: 4, stock_count: null, low_stock_threshold: 5 },
  { id: "m-013", restaurant_id: _restaurant.id, name: "Malt", price: naira(600), category: "Drinks", description: "Amstel Malt 50cl bottle", image_url: "https://m.media-amazon.com/images/I/71LH6-Oi6iL.jpg", available: true, sort_order: 5, stock_count: null, low_stock_threshold: 5 },
  { id: "m-014", restaurant_id: _restaurant.id, name: "Puff Puff", price: naira(500), category: "Sides", description: "6 pieces of fluffy Nigerian doughnuts", image_url: "https://allnigerianfoods.com/wp-content/uploads/puff_puff_recipe.jpg", available: true, sort_order: 1, stock_count: 30, low_stock_threshold: 10 },
  { id: "m-015", restaurant_id: _restaurant.id, name: "Plantain Chips", price: naira(800), category: "Sides", description: "Crunchy plantain chips with a spicy dip", image_url: "https://foreignfork.com/wp-content/uploads/2022/02/SweetPlantainChipsFEATURE-500x500.jpg", available: true, sort_order: 2, stock_count: null, low_stock_threshold: 5 },
  { id: "m-016", restaurant_id: _restaurant.id, name: "French Fries", price: naira(1000), category: "Sides", description: "Golden crispy fries with ketchup", image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80", available: true, sort_order: 3, stock_count: null, low_stock_threshold: 5 },
  { id: "m-017", restaurant_id: _restaurant.id, name: "Coleslaw", price: naira(500), category: "Sides", description: "Fresh coleslaw with creamy dressing", image_url: "https://www.inspiredtaste.net/wp-content/uploads/2015/01/Coleslaw-Recipe-1-1200.jpg", available: true, sort_order: 4, stock_count: null, low_stock_threshold: 5 },
];

/**
 * Modifier groups are restaurant-owned and shared between dishes, so they're
 * stored once here and attached to items by id (see `_menuItemGroups`) rather
 * than copied onto each one. Renaming an option then updates every dish that
 * uses it, which is the whole point of the group being reusable.
 */
const SEED_MODIFIER_GROUPS: ModifierGroup[] = [
  {
    id: "mg-protein",
    restaurant_id: _restaurant.id,
    name: "Protein",
    required: true,
    min: 1,
    max: 1,
    sort_order: 1,
    options: [
      { id: "mo-p-chicken", group_id: "mg-protein", name: "Chicken", price_delta: 0, sort_order: 1, available: true },
      { id: "mo-p-turkey", group_id: "mg-protein", name: "Turkey", price_delta: naira(500), sort_order: 2, available: true },
      { id: "mo-p-beef", group_id: "mg-protein", name: "Beef", price_delta: naira(800), sort_order: 3, available: true },
      { id: "mo-p-fish", group_id: "mg-protein", name: "Fish", price_delta: naira(1000), sort_order: 4, available: true },
    ],
  },
  {
    id: "mg-spice",
    restaurant_id: _restaurant.id,
    name: "Spice level",
    required: true,
    min: 1,
    max: 1,
    sort_order: 2,
    options: [
      { id: "mo-s-mild", group_id: "mg-spice", name: "Mild", price_delta: 0, sort_order: 1, available: true },
      { id: "mo-s-medium", group_id: "mg-spice", name: "Medium", price_delta: 0, sort_order: 2, available: true },
      { id: "mo-s-hot", group_id: "mg-spice", name: "Hot", price_delta: 0, sort_order: 3, available: true },
      { id: "mo-s-none", group_id: "mg-spice", name: "No pepper", price_delta: 0, sort_order: 4, available: true },
    ],
  },
  {
    id: "mg-extras",
    restaurant_id: _restaurant.id,
    name: "Extras",
    required: false,
    min: 0,
    max: 4,
    sort_order: 3,
    options: [
      { id: "mo-e-plantain", group_id: "mg-extras", name: "Extra plantain", price_delta: naira(500), sort_order: 1, available: true },
      { id: "mo-e-sauce", group_id: "mg-extras", name: "Extra pepper sauce", price_delta: naira(200), sort_order: 2, available: true },
      { id: "mo-e-coleslaw", group_id: "mg-extras", name: "Coleslaw", price_delta: naira(500), sort_order: 3, available: true },
      { id: "mo-e-egg", group_id: "mg-extras", name: "Boiled egg", price_delta: naira(300), sort_order: 4, available: true },
    ],
  },
  {
    id: "mg-size",
    restaurant_id: _restaurant.id,
    name: "Size",
    required: true,
    min: 1,
    max: 1,
    sort_order: 4,
    options: [
      { id: "mo-z-regular", group_id: "mg-size", name: "Regular", price_delta: 0, sort_order: 1, available: true },
      { id: "mo-z-large", group_id: "mg-size", name: "Large", price_delta: naira(300), sort_order: 2, available: true },
    ],
  },
];

let _modifierGroups: ModifierGroup[] = SEED_MODIFIER_GROUPS.map((g) => ({
  ...g,
  options: g.options.map((o) => ({ ...o })),
}));

/** menu item id → attached group ids, in the order they should be shown. */
const SEED_MENU_ITEM_GROUPS: Record<string, string[]> = {
  "m-001": ["mg-spice", "mg-extras"],
  "m-003": ["mg-protein", "mg-spice", "mg-extras"],
  "m-004": ["mg-protein", "mg-extras"],
  "m-006": ["mg-spice"],
  "m-009": ["mg-size"],
  "m-010": ["mg-size"],
};

let _menuItemGroups: Record<string, string[]> = { ...SEED_MENU_ITEM_GROUPS };

/** Attaches live group objects to an item as `GET /menu` does server-side. */
function withModifiers(item: MenuItem): MenuItem {
  const ids = _menuItemGroups[item.id];
  if (!ids?.length) return item;
  const groups = ids
    .map((id) => _modifierGroups.find((g) => g.id === id))
    .filter((g): g is ModifierGroup => Boolean(g));
  return { ...item, modifier_groups: groups };
}

function findOption(optionId: string) {
  for (const group of _modifierGroups) {
    const option = group.options.find((o) => o.id === optionId);
    if (option) return { group, option };
  }
  return null;
}

/**
 * Ingredient stock, one level below the plate counts on menu items. Quantities
 * are fractional — 12.5 kg of rice is a real level — so nothing here rounds.
 */
const SEED_INGREDIENTS: Ingredient[] = [
  { id: "ing-rice", restaurant_id: _restaurant.id, name: "Rice", unit: "kg", stock_qty: 24, low_stock_threshold: 5, cost_per_unit: naira(1800), par_level: 40 },
  { id: "ing-chicken", restaurant_id: _restaurant.id, name: "Chicken", unit: "kg", stock_qty: 11.5, low_stock_threshold: 4, cost_per_unit: naira(4500), par_level: 20 },
  { id: "ing-beef", restaurant_id: _restaurant.id, name: "Beef", unit: "kg", stock_qty: 3.2, low_stock_threshold: 4, cost_per_unit: naira(6200), par_level: 15 },
  { id: "ing-tomato", restaurant_id: _restaurant.id, name: "Tomato paste", unit: "tin", stock_qty: 40, low_stock_threshold: 10, cost_per_unit: naira(900), par_level: 60 },
  { id: "ing-oil", restaurant_id: _restaurant.id, name: "Vegetable oil", unit: "L", stock_qty: 8, low_stock_threshold: 3, cost_per_unit: naira(2400), par_level: 15 },
  { id: "ing-plantain", restaurant_id: _restaurant.id, name: "Plantain", unit: "piece", stock_qty: 60, low_stock_threshold: 15, cost_per_unit: naira(350), par_level: 100 },
];

let _ingredients: Ingredient[] = SEED_INGREDIENTS.map((i) => ({ ...i }));
let _movements: StockMovement[] = [];

/** menu item id → the ingredients one serving consumes. */
const SEED_RECIPES: Record<string, Array<{ ingredient_id: string; qty_per_serving: number }>> = {
  "m-003": [
    { ingredient_id: "ing-rice", qty_per_serving: 0.25 },
    { ingredient_id: "ing-chicken", qty_per_serving: 0.2 },
    { ingredient_id: "ing-tomato", qty_per_serving: 0.5 },
    { ingredient_id: "ing-oil", qty_per_serving: 0.05 },
  ],
  "m-004": [
    { ingredient_id: "ing-rice", qty_per_serving: 0.25 },
    { ingredient_id: "ing-oil", qty_per_serving: 0.05 },
  ],
};

let _recipes: Record<string, Array<{ ingredient_id: string; qty_per_serving: number }>> = {
  ...SEED_RECIPES,
};

function recipeLines(menuItemId: string): RecipeLine[] {
  return (_recipes[menuItemId] ?? []).flatMap((line) => {
    const ingredient = _ingredients.find((i) => i.id === line.ingredient_id);
    if (!ingredient) return [];
    return [{
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.name,
      unit: ingredient.unit,
      qty_per_serving: line.qty_per_serving,
    }];
  });
}

/** Records a signed movement and applies it. Never clamps below zero: going
 *  negative is how a merchant discovers the recipe or the count is wrong. */
function moveStock(
  ingredientId: string,
  delta: number,
  reason: StockReason,
  note?: string | null,
  orderId?: string | null,
): StockMovement | null {
  const ingredient = _ingredients.find((i) => i.id === ingredientId);
  if (!ingredient) return null;
  // Float arithmetic accumulates error over many small depletions, so round
  // to a sane precision rather than letting 11.5 - 0.2 become 11.299999999998.
  ingredient.stock_qty = Math.round((ingredient.stock_qty + delta) * 1000) / 1000;
  const movement: StockMovement = {
    id: uid(),
    ingredient_id: ingredientId,
    delta,
    reason,
    actor_id: null,
    note: note ?? null,
    order_id: orderId ?? null,
    created_at: now(),
  };
  _movements.unshift(movement);
  return movement;
}

const INITIAL_TABLES = [
  "T1", "T2", "T3", "T4", "T5", "T6",
  "T7", "T8", "T9", "T10", "T11", "T12", "T-G37",
];
/**
 * Tables carry a uuid as well as a name, mirroring the server. The name repeats
 * across restaurants; only the uuid identifies a table, and it is what a QR
 * encodes and what `GET /table/{id}` resolves.
 */
interface MockTable {
  uuid: string;
  name: string;
}

let _tables: MockTable[] = INITIAL_TABLES.map((name) => ({
  uuid: `tbl-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
}));

/**
 * The server takes different identifiers in different places, and the mock
 * mirrors that exactly rather than accepting whichever it is given.
 *
 *   GET  /table/{id}, call-waiter, request-pos   -> the uuid   (path param)
 *   POST /orders {table}, POST /session {tableId} -> the name  (body field)
 *
 * Verified against the deployed API: a name in the path returns 422, and a
 * uuid in the body returns 404. Accepting both here would let a wrong
 * identifier pass every local test and fail only in production, which is the
 * failure mode this whole change exists to remove.
 */
function findTableByUuid(uuid: string): MockTable | undefined {
  return _tables.find((t) => t.uuid === uuid);
}

function findTableByName(name: string): MockTable | undefined {
  return _tables.find((t) => t.name === name);
}

// ---------------------------------------------------------------------------
// State — persisted to localStorage so it survives page refresh AND so tabs
// in the same browser share orders/sessions (lets you JOIN a session created
// in another tab, simulating a real multi-customer table).
//
// To wipe the seed data and start fresh: run `localStorage.removeItem("oshap-mock-state")`
// in the browser devtools, or hard-clear site data.
// ---------------------------------------------------------------------------

/** `price` is per-unit and already includes modifier deltas, as the API returns. */
type StoredOrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string | null;
  modifiers?: OrderItemModifier[] | null;
};

type StoredOrder = Order & {
  order_items: StoredOrderItem[];
};

let _menu: MenuItem[] = [...SEED_MENU];
/**
 * An order still owed for. `SERVED` is here because delivering food settles
 * nothing — the guest may pay after eating, and a bill that vanished from the
 * board the moment the plate landed is a bill nobody collects.
 */
const UNPAID_STATUSES = ["CREATED", "PREPARING", "READY", "SERVED"];

/** Still on the table at all, claimed payments included. */
const OPEN_STATUSES = [...UNPAID_STATUSES, "PAYMENT_PENDING"];

const _orders: Map<string, StoredOrder> = new Map();
/**
 * How much has been taken against each order so far.
 *
 * The stored `Payment` is one row per order, so it cannot hold a running total
 * across two visits to the till. The real API tracks this on the order itself.
 */
const _amountPaid: Map<string, number> = new Map();
const _payments: Map<string, Payment> = new Map();
const _sessions: Map<string, TableSession> = new Map();
const _staff: Map<string, StaffMember> = new Map();
/** Set by the setup flow; absent means the seed default. */
const _staffPasswords: Map<string, string> = new Map();
let _orderCounter = 0;

const STORAGE_KEY = "oshap-mock-state";

/**
 * Bumped whenever the seed's shape or units change. Persisted collections from
 * an older version are discarded rather than merged, because an array can't be
 * merged field-by-field the way the restaurant object can.
 *
 * v2: money moved from naira to kobo. A menu persisted before that holds
 * prices 100x too small, and silently renders ₦25 for a ₦2,500 dish.
 */
const SEED_VERSION = 2;

interface PersistedState {
  seedVersion?: number;
  restaurant?: Restaurant;
  bankAccounts?: BankAccount[];
  menu?: MenuItem[];
  modifierGroups?: ModifierGroup[];
  menuItemGroups?: Record<string, string[]>;
  ingredients?: Ingredient[];
  movements?: StockMovement[];
  recipes?: Record<string, Array<{ ingredient_id: string; qty_per_serving: number }>>;
  tables?: Array<{ uuid: string; name: string }>;
  orders?: Array<[string, StoredOrder]>;
  payments?: Array<[string, Payment]>;
  sessions?: Array<[string, TableSession]>;
  staff?: Array<[string, StaffMember]>;
  orderCounter?: number;
}

export function syncFromStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as PersistedState;

    // Written by an older seed: its menu and orders are in the wrong units, so
    // starting fresh is the only correct option.
    if (saved.seedVersion !== SEED_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    // Merged, not replaced. JSON drops absent keys, so a wholesale restore
    // permanently hides any field added to the seed later — that has already
    // caught logo_url and address. Merchant edits still win, since anything
    // they changed is present in `saved`.
    if (saved.restaurant) {
      _restaurant = { ...SEED_RESTAURANT, ...saved.restaurant };
    }
    if (Array.isArray(saved.bankAccounts)) _bankAccounts = saved.bankAccounts;
    if (Array.isArray(saved.menu)) _menu = saved.menu;
    // Absent on state written before modifiers existed — keep the seed rather
    // than blanking every dish's options.
    if (Array.isArray(saved.modifierGroups)) _modifierGroups = saved.modifierGroups;
    if (saved.menuItemGroups) _menuItemGroups = saved.menuItemGroups;
    if (Array.isArray(saved.ingredients)) _ingredients = saved.ingredients;
    if (Array.isArray(saved.movements)) _movements = saved.movements;
    if (saved.recipes) _recipes = saved.recipes;
    if (Array.isArray(saved.tables)) _tables = saved.tables;

    _orders.clear();
    for (const [k, v] of saved.orders ?? []) _orders.set(k, v);

    _payments.clear();
    for (const [k, v] of saved.payments ?? []) _payments.set(k, v);

    _sessions.clear();
    for (const [k, v] of saved.sessions ?? []) _sessions.set(k, v);

    _staff.clear();
    for (const [k, v] of saved.staff ?? []) _staff.set(k, v);

    if (typeof saved.orderCounter === "number") {
      _orderCounter = saved.orderCounter;
    }
  } catch {
    // Corrupt JSON — fall back to in-memory defaults.
  }

  // Ensure there's an owner account
  if (_staff.size === 0) {
    const ownerId = uid();
    _staff.set(ownerId, {
      id: ownerId,
      name: "Owner",
      phone: "+2348030000001",
      email: "owner@oshap.com",
      role: "OWNER",
      created_at: now(),
    });
  }
}

function syncToStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const payload: PersistedState = {
      seedVersion: SEED_VERSION,
      restaurant: _restaurant,
      bankAccounts: _bankAccounts,
      menu: _menu,
      modifierGroups: _modifierGroups,
      menuItemGroups: _menuItemGroups,
      ingredients: _ingredients,
      movements: _movements,
      recipes: _recipes,
      tables: _tables,
      orders: Array.from(_orders.entries()),
      payments: Array.from(_payments.entries()),
      sessions: Array.from(_sessions.entries()),
      staff: Array.from(_staff.entries()),
      orderCounter: _orderCounter,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    // Broadcast state update to WS relay
    const globalAny: any = window;
    if (globalAny.__MOCK_WS__ && globalAny.__MOCK_WS__.readyState === 1) {
      globalAny.__MOCK_WS__.send(JSON.stringify({ type: "UPDATE_STATE", payload }));
    }
  } catch {
    // Quota / disabled storage — fall through, state stays in memory only.
  }
}

// Restore on module load (per-tab, runs once when the chunk first imports).
syncFromStorage();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return "mock-" + Math.random().toString(36).slice(2, 10);
}

function now(): string {
  return new Date().toISOString();
}

function delay(ms = 200): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function ref(tableId: string): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `OSHAP-${tableId}-${rand}`;
}

function findOrder(id: string) {
  const o = _orders.get(id);
  if (!o) throw json(404, { error: "Order not found" });
  return o;
}

function findPayment(orderId: string): Payment | null {
  return _payments.get(orderId) ?? null;
}

function json(status: number, body: unknown) {
  return { status, body };
}

// Multi-branch: the seed data all belongs to the home branch (_restaurant.id).
// When the admin app scopes a request to a different branch via `branch_id`,
// the mock has no data for it — so we return empty, honestly reflecting a
// branch with no orders/menu yet. A real backend filters by branch instead.
function isOtherBranch(query: URLSearchParams): boolean {
  const b = query.get("branch_id");
  return !!b && b !== _restaurant.id;
}

// Deterministic per-branch multiplier so analytics visibly differ per branch.
function branchFactor(query: URLSearchParams): number {
  const b = query.get("branch_id");
  if (b === "rest-002") return 0.7;
  if (b === "rest-003") return 0.4;
  return 1;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export interface MockRouteMatch {
  status: number;
  body: unknown;
}

type Handler = (params: {
  path: string;
  method: string;
  body: unknown;
  query: URLSearchParams;
  admin: boolean;
}) => Promise<MockRouteMatch> | MockRouteMatch;

const routes: Array<{ pattern: RegExp; methods: string[]; fn: Handler }> = [];

function route(
  method: string,
  pattern: RegExp,
  fn: Handler,
) {
  routes.push({ pattern, methods: [method], fn });
}

// -------------------- Customer: Menu --------------------

route("GET", /^\/menu$/, ({ query }) => {
  const restaurantId = query.get("restaurant_id");
  let items = _menu.filter((i) => i.available);
  if (restaurantId) items = items.filter((i) => i.restaurant_id === restaurantId);
  items.sort((a, b) => a.sort_order - b.sort_order);
  return json(200, items.map(withModifiers));
});

// -------------------- Customer: Tables --------------------

route("GET", /^\/table\/(.+)$/, ({ path, query }) => {
  const requested = path.split("/table/")[1]!;
  const deviceToken = query.get("device_token") ?? undefined;
  const sessionId = query.get("session_id") ?? undefined;

  // The URL carries the table's uuid; orders are stored against its name, so
  // resolve once here rather than comparing the two forms downstream.
  const table = findTableByUuid(requested);
  if (!table) {
    return json(404, { error: "Table not found" });
  }
  const tableId = table.name;

  const tableOrders = [..._orders.values()].filter(
    (o) =>
      o.table_id === tableId &&
      OPEN_STATUSES.includes(o.status),
  );

  let scopedOrders = tableOrders;
  if (sessionId && deviceToken) {
    scopedOrders = tableOrders.filter(
      (o) =>
        o.session_id === sessionId ||
        (o.session_id === null && o.device_token === deviceToken),
    );
  } else if (sessionId) {
    scopedOrders = tableOrders.filter((o) => o.session_id === sessionId);
  } else if (deviceToken) {
    scopedOrders = tableOrders.filter((o) => o.device_token === deviceToken);
  }

  const createdOrders = scopedOrders.filter((o) => UNPAID_STATUSES.includes(o.status));
  const pendingOrders = scopedOrders.filter((o) => o.status === "PAYMENT_PENDING");

  /**
   * Combines several orders on one table into a single bill.
   *
   * Every money field is summed, not just `total`. Spreading the latest order
   * and overriding only the total left the breakdown describing one order while
   * the total described all of them — which nobody notices until the bill is
   * shown to a guest and the parts don't add up.
   */
  const combine = (orders: StoredOrder[]) => {
    const latest = orders[orders.length - 1]!;
    const sum = (pick: (o: StoredOrder) => number | undefined) =>
      orders.reduce((acc, o) => acc + (pick(o) ?? 0), 0);

    return {
      ...latest,
      subtotal: sum((o) => o.subtotal),
      discount: sum((o) => o.discount),
      service_charge: sum((o) => o.service_charge),
      vat: sum((o) => o.vat),
      tip: sum((o) => o.tip),
      total: sum((o) => o.total),
      // Guests are shown what they ordered, so the lines come from every order
      // in the bill rather than only the most recent.
      order_items: orders.flatMap((o) => o.order_items ?? []),
      combined_order_ids: orders.map((o) => o.id),
    };
  };

  const unpaidOrder = createdOrders.length > 0 ? combine(createdOrders) : null;

  const pendingPayments = pendingOrders.length > 0 ? combine(pendingOrders) : null;

  const result: TableInfo = {
    table_id: tableId,
    status: "OPEN",
    restaurant: _restaurant,
    bank_accounts: rankedActiveAccounts(),
    unpaid_order: unpaidOrder as TableInfo["unpaid_order"],
    pending_payments: pendingPayments as TableInfo["pending_payments"],
  };

  return json(200, result);
});

// -------------------- Customer: Call Waiter --------------------

route("POST", /^\/table\/(.+)\/call-waiter$/, ({ path }) => {
  const tableId = decodeURIComponent(path.split("/table/")[1]!.replace(/\/call-waiter$/, ""));
  if (!findTableByUuid(tableId)) {
    return json(404, { error: "Table not found" });
  }
  return json(200, { success: true as const });
});

// -------------------- Customer: Request POS --------------------

route("POST", /^\/table\/(.+)\/request-pos$/, ({ path, body }) => {
  const tableId = decodeURIComponent(
    path.split("/table/")[1]!.replace(/\/request-pos$/, ""),
  );
  if (!findTableByUuid(tableId)) {
    return json(404, { error: "Table not found" });
  }

  const b = (body as { session_id?: string; device_token?: string }) ?? {};
  const sessionId = b.session_id;
  const deviceToken = b.device_token;

  // Scope CREATED/PREPARING/READY orders to this device/session
  const createdOrders = [..._orders.values()].filter((o) => {
    if (o.table_id !== tableId || !UNPAID_STATUSES.includes(o.status)) return false;
    if (sessionId && deviceToken) {
      return (
        o.session_id === sessionId ||
        (o.session_id === null && o.device_token === deviceToken)
      );
    }
    if (sessionId) return o.session_id === sessionId;
    if (deviceToken) return o.device_token === deviceToken;
    return true;
  });

  for (const order of createdOrders) {
    order.status = "PAYMENT_PENDING";
    _payments.set(order.id, {
      id: uid(),
      order_id: order.id,
      amount: order.total,
      status: "CLAIMED",
      proof_url: null,
      created_at: now(),
    });
  }

  syncToStorage();

  return json(200, {
    success: true as const,
    processed: createdOrders.length,
  });
});

// -------------------- Customer: Create Order --------------------

/**
 * Applies a basis-point rate with half-up rounding, in pure integer arithmetic —
 * the same formula the backend uses, so totals reconcile exactly rather than
 * drifting by a kobo per order.
 */
function applyRate(amount: number, basisPoints: number): number {
  return Math.floor((amount * basisPoints + 5000) / 10000);
}

/** total = subtotal - discount + service_charge + vat + tip, exactly. */
function priceOrder(subtotal: number, discount = 0, tip = 0) {
  const serviceCharge = applyRate(subtotal, _restaurant.service_charge_rate ?? 0);
  const vat = applyRate(subtotal - discount + serviceCharge, _restaurant.vat_rate ?? 0);
  return {
    subtotal,
    discount,
    service_charge: serviceCharge,
    vat,
    tip,
    total: subtotal - discount + serviceCharge + vat + tip,
  };
}

route("POST", /^\/orders$/, ({ body }) => {
  const b = body as CreateOrderRequest;
  // The body carries the table's NAME, not its uuid — see findTableByName.
  if (b.table && !findTableByName(b.table)) {
    return json(404, { error: "Table not found" });
  }
  if (!b.table || !b.restaurant_id || !b.items?.length) {
    return json(400, { error: "Missing required fields" });
  }

  // Resolve modifiers exactly as the server does: the client sends the dish's
  // BASE price plus option ids, and the line price is base + the sum of those
  // options' deltas. Adding the deltas client-side too would double-count them.
  const resolved: Array<{
    id: string;
    menu_item_id?: string | null;
    name: string;
    quantity: number;
    price: number;
    notes?: string | null;
    modifiers?: OrderItemModifier[] | null;
  }> = [];

  for (const item of b.items) {
    const dish = _menu.find((m) => m.id === item.menu_item_id || m.name === item.name);
    const mods: OrderItemModifier[] = [];
    for (const chosen of item.modifiers ?? []) {
      const found = findOption(chosen.option_id);
      if (!found) {
        return json(400, { error: `Invalid modifier option: ${chosen.option_id}` });
      }
      mods.push({
        // Returned so a past line can be put back in a cart exactly.
        option_id: found.option.id,
        name: found.group.name,
        option: found.option.name,
        price_delta: found.option.price_delta,
      });
    }
    const delta = mods.reduce((s, m) => s + m.price_delta, 0);
    resolved.push({
      id: uid(),
      // The dish, as distinct from this line. Reordering needs it, and the
      // real API has always returned it.
      menu_item_id: dish?.id ?? item.menu_item_id ?? null,
      name: item.name,
      quantity: item.qty,
      price: item.price + delta,
      notes: item.notes ?? null,
      modifiers: mods.length ? mods : null,
    });
  }

  const money = priceOrder(resolved.reduce((s, i) => s + i.price * i.quantity, 0));
  _orderCounter++;
  const id = `ord-${_orderCounter.toString().padStart(3, "0")}`;
  const reference = ref(b.table);

  const order: StoredOrder = {
    id,
    table_id: b.table,
    restaurant_id: b.restaurant_id,
    status: "CREATED",
    ...money,
    reference,
    session_id: b.session_id ?? null,
    customer_name: b.customer_name ?? null,
    device_token: b.device_token ?? null,
    created_at: now(),
    order_items: resolved,
  };

  _orders.set(id, order);

  // Decrement stock counts for tracked items
  for (const item of b.items) {
    const menuItem = _menu.find((m) => m.name === item.name);
    if (menuItem && menuItem.stock_count !== null) {
      menuItem.stock_count = Math.max(0, menuItem.stock_count - item.qty);
      if (menuItem.stock_count === 0) {
        menuItem.available = false;
      }
    }
    // Deplete the recipe too. Plate counts and ingredient levels answer
    // different questions — "can I still sell this dish" versus "do I need to
    // buy rice" — so both move, and each records its own trail.
    const recipeFor = menuItem ? _recipes[menuItem.id] : undefined;
    for (const line of recipeFor ?? []) {
      moveStock(
        line.ingredient_id,
        -(line.qty_per_serving * item.qty),
        "SALE",
        null,
        id,
      );
    }
  }

  syncToStorage();

  return json(200, {
    success: true as const,
    order_id: id,
    reference,
    total: money.total,
  } satisfies CreateOrderResponse);
});


// -------------------- Customer: Get Order Detail --------------------

route("GET", /^\/orders\/(.+)$/, ({ path }) => {
  const id = path.split("/orders/")[1]!;
  const order = findOrder(id);
  const payment = findPayment(order.id);

  return json(200, {
    id: order.id,
    table: order.table_id,
    items: order.order_items,
    subtotal: order.subtotal,
    discount: order.discount,
    service_charge: order.service_charge,
    vat: order.vat,
    tip: order.tip,
    total: order.total,
    status: order.status,
    reference: order.reference,
    payment: payment || null,
    created_at: order.created_at,
  } satisfies OrderDetail);
});

// -------------------- Customer: Confirm Orders --------------------

route("POST", /^\/orders\/confirm$/, ({ body }) => {
  const b = body as ConfirmOrdersRequest;
  if (!b.order_ids?.length) {
    return json(400, { error: "Missing order_ids" });
  }

  const confirmable = b.order_ids.filter((id) => {
    const o = _orders.get(id);
    return o && o.status === "PAYMENT_PENDING";
  });

  for (const id of confirmable) {
    _orders.get(id)!.status = "CONFIRMED";
    const p = _payments.get(id);
    if (p) p.status = "CONFIRMED";
  }

  return json(200, {
    success: true as const,
    confirmed: confirmable.length,
  } satisfies ConfirmOrdersResponse);
});

// -------------------- Customer: Session (Start / Join) --------------------

route("POST", /^\/session$/, ({ body }) => {
  const b = body as SessionRequest;

  if (b.action === "START") {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const session: TableSession = {
      id: uid(),
      table_id: b.tableId,
      pin,
      status: "ACTIVE",
      created_at: now(),
    };
    _sessions.set(session.id, session);

    // Migrate unclaimed orders
    if (b.unclaimed_order_ids?.length) {
      for (const oid of b.unclaimed_order_ids) {
        const o = _orders.get(oid);
        if (o && o.table_id === b.tableId && !o.session_id) {
          o.session_id = session.id;
          o.customer_name = b.customer_name ?? null;
        }
      }
    }

    return json(200, { success: true as const, session } satisfies SessionResponse);
  }

  if (b.action === "JOIN") {
    if (!b.pin) return json(400, { error: "PIN required" });

    const session = [..._sessions.values()].find(
      (s) => s.table_id === b.tableId && s.pin === b.pin && s.status === "ACTIVE",
    );
    if (!session) return json(404, { error: "Invalid PIN or no active session" });

    if (b.unclaimed_order_ids?.length) {
      for (const oid of b.unclaimed_order_ids) {
        const o = _orders.get(oid);
        if (o && o.table_id === b.tableId && !o.session_id) {
          o.session_id = session.id;
          o.customer_name = b.customer_name ?? null;
        }
      }
    }

    return json(200, { success: true as const, session } satisfies SessionResponse);
  }

  return json(400, { error: "Invalid action" });
});

// -------------------- Customer: Session Orders --------------------

route("GET", /^\/session\/orders$/, ({ query }) => {
  const sessionId = query.get("session_id");
  const tableId = query.get("table_id");
  const deviceToken = query.get("device_token");

  let orders = [..._orders.values()].filter((o) =>
    OPEN_STATUSES.includes(o.status),
  );

  if (sessionId && tableId) {
    if (deviceToken) {
      orders = orders.filter(
        (o) =>
          o.table_id === tableId &&
          (o.session_id === sessionId ||
            (!o.session_id && o.device_token === deviceToken)),
      );
    } else {
      orders = orders.filter(
        (o) =>
          o.table_id === tableId &&
          (o.session_id === sessionId || !o.session_id),
      );
    }
  } else if (sessionId) {
    orders = orders.filter((o) => o.session_id === sessionId);
  } else if (tableId) {
    orders = orders.filter((o) => o.table_id === tableId);
    if (deviceToken) {
      orders = orders.filter((o) => o.device_token === deviceToken);
    }
  }

  orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return json(200, {
    success: true as const,
    orders: orders as unknown as OrderWithItems[],
  } satisfies SessionOrdersResponse);
});

// -------------------- Customer: Claim Payment --------------------

/**
 * Which orders were claimed as one payment.
 *
 * The stored `Payment` is per order and has nowhere to record that three of
 * them settle together, so the bundle is kept alongside — the board needs it to
 * show "put theirs on mine" as a single bill.
 */
const _combined = new Map<string, string[]>();

route("POST", /^\/payment\/confirm$/, ({ body }) => {
  const b = body as ClaimPaymentRequest;
  const ids = b.combined_order_ids?.length ? b.combined_order_ids : b.order_id ? [b.order_id] : [];

  if (!ids.length) return json(400, { error: "Missing order_id or combined_order_ids" });

  for (const oid of ids) {
    if (ids.length > 1) _combined.set(oid, ids);
    const order = _orders.get(oid);
    if (!order) continue;

    order.status = "PAYMENT_PENDING";

    _payments.set(oid, {
      id: uid(),
      order_id: oid,
      amount: order.total,
      status: "CLAIMED",
      method: "MANUAL_TRANSFER",
      proof_url: b.proof_url ?? null,
      // Falls back to the default so the ranking still learns when an older
      // client omits it.
      bank_account_id:
        b.bank_account_id ?? rankedActiveAccounts()[0]?.id ?? null,
      created_at: now(),
    });
  }

  return json(200, {
    success: true as const,
    processed: ids.length,
  } satisfies ClaimPaymentResponse);
});

// ---------------------------------------------------------------------------
// Admin endpoints — used by admin app
// ---------------------------------------------------------------------------

// Mock tokens encode the staff id so /auth/me can resolve the caller, and
// carry an expiry so the refresh path is actually exercisable in mock mode.
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

function issueAccessToken(staffId: string): string {
  return `mock-access.${staffId}.${Date.now() + ACCESS_TOKEN_TTL_MS}`;
}

function issueRefreshToken(staffId: string): string {
  return `mock-refresh.${staffId}`;
}

/** Returns the staff id if the access token is well-formed and unexpired. */
export function staffIdFromAccessToken(token: string | null): string | null {
  if (!token?.startsWith("mock-access.")) return null;
  const [, staffId, expiresAt] = token.split(".");
  if (!staffId || !expiresAt) return null;
  if (Number(expiresAt) < Date.now()) return null;
  return staffId;
}

/**
 * Setup and reset tokens, keyed by the raw token. The real server stores only
 * a hash; the mock keeps the raw value because it has to hand the same string
 * back in a URL, and nothing here is a real credential.
 */
const _setupTokens = new Map<
  string,
  { staffId: string; expiresAt: number; usedAt: number | null }
>();

/**
 * Where the setup link points. The real server reads ADMIN_APP_URL.
 *
 * Deliberately NOT `window.location.origin`: this endpoint is called from the
 * platform app on port 5176, while the /setup screen lives in the admin app on
 * 5174. Using the current origin produced a link to a route that doesn't exist
 * in the app serving it.
 */
function adminAppUrl(): string {
  const configured = import.meta.env.VITE_ADMIN_APP_URL as string | undefined;
  return configured?.replace(/\/$/, "") || "http://localhost:5174";
}

function issueSetupToken(staffId: string, ttlMs: number): string {
  const token = `setup-${uid()}${uid()}`;
  _setupTokens.set(token, {
    staffId,
    expiresAt: Date.now() + ttlMs,
    usedAt: null,
  });
  return token;
}

/** Expired, spent and unknown are one outcome — distinguishing them leaks. */
function resolveSetupToken(token: string) {
  const entry = _setupTokens.get(token);
  if (!entry || entry.usedAt !== null || entry.expiresAt < Date.now()) return null;
  const staff = _staff.get(entry.staffId);
  return staff ? { entry, staff } : null;
}

function maskTail(value: string, keep = 4): string {
  if (!value) return "";
  return `•••• ${value.slice(-keep)}`;
}

route("POST", /^\/auth\/setup\/verify$/, ({ body }) => {
  const b = body as SetupVerifyRequest;
  const found = resolveSetupToken(b.token ?? "");
  if (!found) {
    return json(410, { message: "This setup link has expired." });
  }
  return json(200, {
    restaurant_name: _restaurant.name,
    owner_name: found.staff.name,
    phone_hint: maskTail(found.staff.phone),
    email_hint: found.staff.email ? maskTail(found.staff.email, 6) : null,
  } satisfies SetupVerifyResponse);
});

route("POST", /^\/auth\/setup\/complete$/, ({ body }) => {
  const b = body as SetupCompleteRequest;
  const found = resolveSetupToken(b.token ?? "");
  if (!found) {
    return json(410, { message: "This setup link has expired." });
  }
  if (!b.password || b.password.length < 10) {
    return json(422, { message: "password: Must be at least 10 characters." });
  }

  found.entry.usedAt = Date.now();
  _staffPasswords.set(found.staff.id, b.password);

  // Same shape as login, so the caller signs in with no second round-trip.
  return json(200, {
    access_token: issueAccessToken(found.staff.id),
    refresh_token: issueRefreshToken(found.staff.id),
    token_type: "bearer" as const,
    expires_in: ACCESS_TOKEN_TTL_MS / 1000,
    user: found.staff,
    restaurant: _restaurant,
  } satisfies AdminLoginResponse);
});

route("POST", /^\/auth\/forgot-password$/, ({ body }) => {
  const b = body as ForgotPasswordRequest;
  const raw = (b.identifier ?? "").trim();
  const phone = tryNormalizePhone(raw);
  const staff = [..._staff.values()].find(
    (s) => (phone && s.phone === phone) || (s.email && s.email === raw.toLowerCase()),
  );

  // Deliberately the same response either way: a 404 here would turn this
  // endpoint into a way to discover which merchants exist.
  if (staff) issueSetupToken(staff.id, 60 * 60 * 1000);
  return json(200, {
    message: "If that account exists, a reset link is on its way.",
  });
});

route("POST", /^\/auth\/login$/, ({ body }) => {
  const b = body as AdminLoginRequest;
  const raw = (b.identifier ?? b.email ?? "").trim();
  const phone = tryNormalizePhone(raw);
  const staff = [..._staff.values()].find(
    (s) => (phone && s.phone === phone) || (s.email && s.email === raw.toLowerCase()),
  );
  const expected = staff ? (_staffPasswords.get(staff.id) ?? "password") : null;
  if (!staff || (b.password && b.password !== expected)) {
    return json(401, { error: "Invalid credentials" });
  }
  return json(200, {
    access_token: issueAccessToken(staff.id),
    refresh_token: issueRefreshToken(staff.id),
    token_type: "bearer" as const,
    expires_in: ACCESS_TOKEN_TTL_MS / 1000,
    user: staff,
    restaurant: _restaurant,
  } satisfies AdminLoginResponse);
});

route("POST", /^\/auth\/refresh$/, ({ body }) => {
  const b = body as { refresh_token?: string };
  const staffId = b.refresh_token?.startsWith("mock-refresh.")
    ? b.refresh_token.slice("mock-refresh.".length)
    : null;

  if (!staffId || !_staff.has(staffId)) {
    return json(401, { error: "Invalid refresh token" });
  }

  return json(200, {
    access_token: issueAccessToken(staffId),
    token_type: "bearer" as const,
    expires_in: ACCESS_TOKEN_TTL_MS / 1000,
  } satisfies RefreshTokenResponse);
});

route("GET", /^\/auth\/me$/, ({ admin }) => {
  if (!admin) return json(401, { error: "Unauthorized" });

  // The mock dispatcher never sees request headers, so the caller is resolved
  // from the stored access token instead. Falls back to the owner when there
  // isn't one, which keeps mock-mode development usable without logging in.
  const token =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("oshap-access-token")
      : null;
  const staffId = staffIdFromAccessToken(token);
  const user =
    (staffId ? _staff.get(staffId) : undefined) ??
    [..._staff.values()].find((s) => s.role === "OWNER")!;

  return json(200, { restaurant: _restaurant, user } satisfies AdminMeResponse);
});

route("GET", /^\/admin\/settings$/, () => {
  return json(200, _restaurant);
});

route("PATCH", /^\/admin\/settings$/, ({ body }) => {
  const b = body as import("../types/index").AdminUpdateSettingsRequest;
  if (b.name !== undefined) _restaurant.name = b.name;
  if (b.description !== undefined) _restaurant.description = b.description;
  if (b.logo_url !== undefined) _restaurant.logo_url = b.logo_url;
  if (b.primary_color !== undefined) _restaurant.primary_color = b.primary_color;
  if (b.cover_image_url !== undefined) _restaurant.cover_image_url = b.cover_image_url;
  if (b.address !== undefined) _restaurant.address = b.address;
  if (b.operating_hours !== undefined) _restaurant.operating_hours = b.operating_hours;
  if (b.whatsapp_number !== undefined) _restaurant.whatsapp_number = b.whatsapp_number;
  
  syncToStorage();
  return json(200, _restaurant);
});

// -------------------- Admin: Bank accounts --------------------

route("GET", /^\/admin\/settings\/bank-accounts$/, () => {
  // Admin sees every account, active or not, in rank order.
  return json(200, [..._bankAccounts].sort((a, b) => Number(b.is_default) - Number(a.is_default)));
});

route("POST", /^\/admin\/settings\/bank-accounts$/, ({ body }) => {
  const b = body as CreateBankAccountRequest;
  if (!b.bank_name || !b.account_number || !b.account_name) {
    return json(400, { error: "Bank name, account number and account name are required" });
  }

  // The first account has to be the default, or nothing is offered to guests.
  const makeDefault = b.is_default ?? _bankAccounts.length === 0;
  if (makeDefault) _bankAccounts = _bankAccounts.map((a) => ({ ...a, is_default: false }));

  const account: BankAccount = {
    id: `bank-${String(_bankAccounts.length + 1).padStart(3, "0")}`,
    bank_name: b.bank_name,
    account_number: b.account_number,
    account_name: b.account_name,
    is_active: true,
    is_default: makeDefault,
    success_count: 0,
    failure_count: 0,
  };
  _bankAccounts.push(account);
  syncToStorage();
  return json(200, account);
});

route("PATCH", /^\/admin\/settings\/bank-accounts\/(.+)$/, ({ path, body }) => {
  const id = path.split("/bank-accounts/")[1]!;
  const account = _bankAccounts.find((a) => a.id === id);
  if (!account) return json(404, { error: "Bank account not found" });

  const b = body as UpdateBankAccountRequest;
  if (b.bank_name !== undefined) account.bank_name = b.bank_name;
  if (b.account_number !== undefined) account.account_number = b.account_number;
  if (b.account_name !== undefined) account.account_name = b.account_name;
  if (b.is_active !== undefined) account.is_active = b.is_active;

  // is_default is exclusive — setting it here unsets every other account.
  if (b.is_default) {
    _bankAccounts = _bankAccounts.map((a) => ({ ...a, is_default: a.id === id }));
  }

  syncToStorage();
  return json(200, _bankAccounts.find((a) => a.id === id)!);
});

route("DELETE", /^\/admin\/settings\/bank-accounts\/(.+)$/, ({ path }) => {
  const id = path.split("/bank-accounts/")[1]!;
  const before = _bankAccounts.length;
  const wasDefault = _bankAccounts.find((a) => a.id === id)?.is_default ?? false;
  _bankAccounts = _bankAccounts.filter((a) => a.id !== id);
  if (_bankAccounts.length === before) return json(404, { error: "Bank account not found" });

  // Removing the default promotes the best remaining account, so guests are
  // never left with a payable bill and nowhere to send the money.
  if (wasDefault) {
    const next = rankedActiveAccounts()[0];
    if (next) next.is_default = true;
  }

  syncToStorage();
  return json(200, { success: true });
});

route("POST", /^\/admin\/settings\/upload$/, () => {
  return json(200, {
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
  } satisfies UploadResponse);
});

route("GET", /^\/admin\/tables$/, ({ query }) => {
  if (isOtherBranch(query)) return json(200, { tables: [] } satisfies AdminTablesResponse);
  const allOrders = [..._orders.values()].filter((o) =>
    OPEN_STATUSES.includes(o.status),
  );

  const tables = _tables.map(({ uuid, name: tableId }) => {
    const tOrders = allOrders.filter((o) => o.table_id === tableId);
    const unpaid = tOrders.filter((o) => UNPAID_STATUSES.includes(o.status));
    const pending = tOrders.filter((o) => o.status === "PAYMENT_PENDING");

    return {
      id: uuid,
      table_id: tableId,
      status: "OPEN" as const,
      unpaidTotal: unpaid.reduce((s, o) => s + o.total, 0),
      pendingTotal: pending.reduce((s, o) => s + o.total, 0),
      hasPending: pending.length > 0,
      hasUnpaid: unpaid.length > 0,
      // Every open bill on the table, claimed or not — settlement acts on one
      // of these, never on the table as a whole.
      unpaid_order_ids: [...unpaid, ...pending].map((o) => o.id),
      // Nets off part payments, unlike `unpaidTotal` which counts whole bills.
      outstanding_total: [...unpaid, ...pending].reduce(
        (sum, o) => sum + Math.max(0, o.total - (_amountPaid.get(o.id) ?? 0)),
        0,
      ),
      // The same orders with who they belong to attached, so the board can
      // show two guests on one table as two bills rather than one total.
      live_orders: [...unpaid, ...pending].map((o) => ({
        order_id: o.id,
        session_id: o.session_id ?? null,
        device_token: o.device_token ?? null,
        customer_name: o.customer_name ?? null,
        total: o.total,
        status: o.status,
        payment_state: o.status === "PAYMENT_PENDING" ? "CLAIMED" : "NOT_PAID",
        payment_method: _payments.get(o.id)?.method ?? null,
        amount_paid: _amountPaid.get(o.id) ?? 0,
        balance_due: Math.max(0, o.total - (_amountPaid.get(o.id) ?? 0)),
        combined_order_ids: _combined.get(o.id) ?? null,
        created_at: o.created_at,
      })),
    };
  });

  return json(200, { tables } satisfies AdminTablesResponse);
});

route("POST", /^\/admin\/tables$/, ({ body }) => {
  const b = body as { id?: string };
  const tableId = (b.id ?? "").trim();
  if (!tableId) return json(400, { error: "Table ID is required" });
  if (findTableByName(tableId)) return json(409, { error: "Table already exists" });
  _tables.push({ uuid: uid(), name: tableId });
  syncToStorage();
  return json(201, { success: true as const, table_id: tableId });
});

route("DELETE", /^\/admin\/tables\/(.+)$/, ({ path }) => {
  const tableId = decodeURIComponent(path.replace(/^\/admin\/tables\//, ""));
  if (!findTableByName(tableId)) return json(404, { error: "Table not found" });
  const activeOrders = [..._orders.values()].filter(
    (o) => o.table_id === tableId && OPEN_STATUSES.includes(o.status),
  );
  if (activeOrders.length > 0) return json(409, { error: "Cannot delete a table with active orders" });
  _tables = _tables.filter((t) => t.uuid !== tableId && t.name !== tableId);
  syncToStorage();
  return json(200, { success: true as const, table_id: tableId });
});

route("GET", /^\/admin\/kitchen$/, ({ query }) => {
  if (isOtherBranch(query)) return json(200, []);
  const orders = [..._orders.values()]
    .filter((o) => UNPAID_STATUSES.includes(o.status))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return json(200, orders);
});

route("PATCH", /^\/admin\/kitchen$/, ({ body }) => {
  const b = body as KitchenUpdateRequest;
  if (!b.order_id || !["PREPARING", "READY"].includes(b.status)) {
    return json(400, { error: "Missing or invalid order_id/status" });
  }

  const order = _orders.get(b.order_id);
  if (!order) return json(404, { error: "Order not found" });
  order.status = b.status;

  return json(200, order);
});

route("GET", /^\/admin\/history$/, ({ query }) => {
  const page = parseInt(query.get("page") ?? "1", 10);
  const perPage = parseInt(query.get("per_page") ?? "20", 10);

  if (isOtherBranch(query)) {
    return json(200, {
      orders: [],
      pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
      summary: { confirmed_count: 0, cancelled_count: 0, page_revenue: 0 },
    } satisfies AdminHistoryResponse);
  }

  const tableFilter = query.get("table") ?? "";
  const dateFilter = query.get("date") ?? "";

  let orders = [..._orders.values()].filter((o) =>
    ["CONFIRMED", "CANCELLED"].includes(o.status),
  );

  if (tableFilter) orders = orders.filter((o) => o.table_id === tableFilter);
  if (dateFilter) {
    orders = orders.filter(
      (o) => o.created_at.slice(0, 10) === dateFilter,
    );
  }

  orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = orders.length;
  const paged = orders.slice((page - 1) * perPage, page * perPage);
  const confirmed = paged.filter((o) => o.status === "CONFIRMED");
  const cancelled = paged.filter((o) => o.status === "CANCELLED");

  return json(200, {
    orders: paged.map((o) => ({
      ...o,
      payments: findPayment(o.id) ? [findPayment(o.id)!] : [],
    })),
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    },
    summary: {
      confirmed_count: confirmed.length,
      cancelled_count: cancelled.length,
      page_revenue: confirmed.reduce((s, o) => s + o.total, 0),
    },
  } satisfies AdminHistoryResponse);
});

route("GET", /^\/admin\/menu$/, ({ query }) => {
  if (isOtherBranch(query)) return json(200, []);
  return json(
    200,
    [..._menu].sort((a, b) => a.sort_order - b.sort_order).map(withModifiers),
  );
});

route("POST", /^\/admin\/menu$/, ({ body }) => {
  const b = body as CreateMenuItemRequest;
  if (!b.name || !b.price || !b.category) {
    return json(400, { error: "Missing required fields" });
  }

  const item: MenuItem = {
    id: uid(),
    restaurant_id: _restaurant.id,
    name: b.name,
    price: b.price,
    category: b.category,
    description: b.description ?? null,
    image_url: b.image_url ?? null,
    available: true,
    sort_order: 99,
    stock_count: null,
    low_stock_threshold: 5,
  };
  _menu.push(item);
  return json(201, item);
});

route("PUT", /^\/admin\/menu\/([^/]+)$/, ({ path, body }) => {
  const id = path.split("/admin/menu/")[1]!;
  const b = body as UpdateMenuItemRequest;
  const idx = _menu.findIndex((i) => i.id === id);
  if (idx === -1) return json(404, { error: "Not found" });

  const item = _menu[idx]!;
  if (b.name !== undefined) item.name = b.name;
  if (b.price !== undefined) item.price = b.price;
  if (b.category !== undefined) item.category = b.category;
  if (b.description !== undefined) item.description = b.description;
  if (b.image_url !== undefined) item.image_url = b.image_url;
  if (b.sort_order !== undefined) item.sort_order = b.sort_order;
  return json(200, item);
});

route("PATCH", /^\/admin\/menu\/([^/]+)$/, ({ path, body }) => {
  const id = path.split("/admin/menu/")[1]!;
  const b = body as { available: boolean };
  const item = _menu.find((i) => i.id === id);
  if (!item) return json(404, { error: "Not found" });
  item.available = b.available;
  return json(200, item);
});

route("DELETE", /^\/admin\/menu\/([^/]+)$/, ({ path }) => {
  const id = path.split("/admin/menu/")[1]!;
  _menu = _menu.filter((i) => i.id !== id);
  return json(200, { success: true as const });
});

route("POST", /^\/admin\/menu\/bulk-delete$/, ({ body }) => {
  const ids = (body as BulkDeleteRequest | null)?.item_ids ?? [];
  if (ids.length === 0) return json(400, { error: "No items selected" });

  /**
   * A dish that appears on a past order cannot simply be erased — the receipt
   * has to keep meaning something. The real API refused these outright for a
   * while; the mock refuses them individually so the screen has to handle a
   * partial result rather than assuming everything asked for went.
   */
  const ordered = new Set(
    [..._orders.values()].flatMap((o) =>
      ((o as StoredOrderWithItems).order_items ?? []).map((i) => i.menu_item_id),
    ),
  );

  const errors: BulkDeleteError[] = [];
  const removable: string[] = [];
  for (const id of ids) {
    const item = _menu.find((i) => i.id === id);
    if (!item) {
      errors.push({ item_id: id, message: "That dish is already gone" });
    } else if (ordered.has(id)) {
      errors.push({
        item_id: id,
        message: "It appears on a past order, so it cannot be deleted",
      });
    } else {
      removable.push(id);
    }
  }

  _menu = _menu.filter((i) => !removable.includes(i.id));
  return json(200, {
    deleted: removable.length,
    errors,
  } satisfies BulkDeleteResponse);
});

// -------------------- Admin: Bulk menu import / export --------------------

const IMPORT_COLUMNS = [
  "external_id",
  "name",
  "category",
  "price",
  "description",
  "available",
  "image_url",
  "stock_count",
  "low_stock_threshold",
] as const;

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

route("GET", /^\/admin\/menu\/export$/, () => {
  // external_id is always populated so the round-trip updates rather than
  // duplicating — matching on name would turn a typo fix into a new item.
  const rows = _menu.map((item) =>
    [
      item.id,
      item.name,
      item.category,
      item.price,
      item.description ?? "",
      item.available,
      item.image_url ?? "",
      item.stock_count ?? "",
      item.low_stock_threshold,
    ]
      .map(csvEscape)
      .join(","),
  );
  return json(200, [IMPORT_COLUMNS.join(","), ...rows].join("\n"));
});

/** Splits a CSV line, honouring quoted fields containing commas. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map((v) => v.trim());
}

route("POST", /^\/admin\/menu\/import$/, async ({ body, query }) => {
  const form = body as FormData | null;
  const file = form instanceof FormData ? (form.get("file") as File | null) : null;
  if (!file) return json(400, { error: "No file uploaded" });

  const dryRun = query.get("dry_run") === "true";
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return json(400, { error: "File has no rows" });

  const header = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const errors: MenuImportError[] = [];
  const staged: Array<{ existing?: MenuItem; item: MenuItem }> = [];
  let skipped = 0;

  // Row numbers are 1-indexed and count the header, so they match what the
  // merchant sees in their spreadsheet.
  lines.slice(1).forEach((line, i) => {
    const rowNumber = i + 2;
    const cells = splitCsvLine(line);
    const get = (column: string) => {
      const at = header.indexOf(column);
      return at === -1 ? "" : (cells[at] ?? "");
    };

    const name = get("name");
    const category = get("category");
    const rawPrice = get("price");

    if (!name || !category || !rawPrice) {
      errors.push({ row: rowNumber, message: "name, category and price are required" });
      return;
    }

    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price < 0) {
      errors.push({ row: rowNumber, field: "price", message: `not a number: '${rawPrice}'` });
      return;
    }

    const externalId = get("external_id");
    const existing = externalId ? _menu.find((m) => m.id === externalId) : undefined;
    if (externalId && !existing) {
      errors.push({
        row: rowNumber,
        field: "external_id",
        message: `no item with id '${externalId}'`,
      });
      return;
    }

    const stockRaw = get("stock_count");
    const item: MenuItem = {
      id: existing?.id ?? uid(),
      restaurant_id: _restaurant.id,
      name,
      category,
      price,
      description: get("description") || null,
      image_url: get("image_url") || null,
      available: get("available").toLowerCase() !== "false",
      sort_order: existing?.sort_order ?? _menu.length + staged.length + 1,
      stock_count: stockRaw === "" ? (existing?.stock_count ?? null) : Number(stockRaw),
      low_stock_threshold:
        Number(get("low_stock_threshold")) || existing?.low_stock_threshold || 5,
    };

    if (existing && JSON.stringify(existing) === JSON.stringify(item)) {
      skipped++;
      return;
    }
    staged.push({ existing, item });
  });

  const created = staged.filter((s) => !s.existing).length;
  const updated = staged.filter((s) => s.existing).length;

  // Validated in full before anything is written, so a failure at row 60
  // cannot leave a half-imported menu.
  if (!dryRun) {
    for (const { existing, item } of staged) {
      if (existing) Object.assign(existing, item);
      else _menu.push(item);
    }
    syncToStorage();
  }

  return json(200, { created, updated, skipped, errors } satisfies MenuImportResponse);
});

route("POST", /^\/admin\/menu\/upload$/, () => {
  return json(200, {
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
  } satisfies UploadResponse);
});

// -------------------- Admin: Modifiers --------------------

route("GET", /^\/admin\/modifier-groups$/, () =>
  json(200, [..._modifierGroups].sort((a, b) => a.sort_order - b.sort_order)),
);

route("POST", /^\/admin\/modifier-groups$/, ({ body }) => {
  const b = body as CreateModifierGroupRequest;
  if (!b.name?.trim()) return json(400, { error: "Name is required" });

  const groupId = uid();
  const group: ModifierGroup = {
    id: groupId,
    restaurant_id: _restaurant.id,
    name: b.name.trim(),
    required: b.required ?? false,
    min: b.min ?? 0,
    max: b.max ?? 1,
    sort_order: _modifierGroups.length + 1,
    options: (b.options ?? []).map((o, i) => ({
      id: uid(),
      group_id: groupId,
      name: o.name,
      price_delta: o.price_delta ?? 0,
      sort_order: i + 1,
      available: true,
    })),
  };
  _modifierGroups.push(group);
  syncToStorage();
  return json(201, group);
});

route("PATCH", /^\/admin\/modifier-groups\/(.+)$/, ({ path, body }) => {
  const id = path.split("/admin/modifier-groups/")[1]!;
  const group = _modifierGroups.find((g) => g.id === id);
  if (!group) return json(404, { error: "Modifier group not found" });

  const b = body as UpdateModifierGroupRequest;
  if (b.name !== undefined) group.name = b.name;
  if (b.required !== undefined) group.required = b.required;
  if (b.min !== undefined) group.min = b.min;
  if (b.max !== undefined) group.max = b.max;
  if (b.sort_order !== undefined) group.sort_order = b.sort_order;
  syncToStorage();
  return json(200, group);
});

route("DELETE", /^\/admin\/modifier-groups\/(.+)$/, ({ path }) => {
  const id = path.split("/admin/modifier-groups/")[1]!;
  const index = _modifierGroups.findIndex((g) => g.id === id);
  if (index === -1) return json(404, { error: "Modifier group not found" });

  _modifierGroups.splice(index, 1);
  // Detach from every dish, or the menu would serve a dangling id forever.
  for (const itemId of Object.keys(_menuItemGroups)) {
    _menuItemGroups[itemId] = _menuItemGroups[itemId]!.filter((g) => g !== id);
  }
  syncToStorage();
  return json(200, { success: true });
});

route("POST", /^\/admin\/modifier-groups\/(.+)\/options$/, ({ path, body }) => {
  const groupId = path.split("/admin/modifier-groups/")[1]!.split("/options")[0]!;
  const group = _modifierGroups.find((g) => g.id === groupId);
  if (!group) return json(404, { error: "Modifier group not found" });

  const b = body as CreateModifierOptionRequest;
  if (!b.name?.trim()) return json(400, { error: "Name is required" });

  const option: ModifierOption = {
    id: uid(),
    group_id: groupId,
    name: b.name.trim(),
    price_delta: b.price_delta ?? 0,
    sort_order: group.options.length + 1,
    available: true,
  };
  group.options.push(option);
  syncToStorage();
  return json(201, option);
});

route("PATCH", /^\/admin\/modifier-options\/(.+)$/, ({ path, body }) => {
  const id = path.split("/admin/modifier-options/")[1]!;
  const found = findOption(id);
  if (!found) return json(404, { error: "Modifier option not found" });

  const b = body as UpdateModifierOptionRequest;
  if (b.name !== undefined) found.option.name = b.name;
  if (b.price_delta !== undefined) found.option.price_delta = b.price_delta;
  if (b.available !== undefined) found.option.available = b.available;
  if (b.sort_order !== undefined) found.option.sort_order = b.sort_order;
  syncToStorage();
  return json(200, found.option);
});

route("DELETE", /^\/admin\/modifier-options\/(.+)$/, ({ path }) => {
  const id = path.split("/admin/modifier-options/")[1]!;
  const found = findOption(id);
  if (!found) return json(404, { error: "Modifier option not found" });

  found.group.options = found.group.options.filter((o) => o.id !== id);
  syncToStorage();
  return json(200, { success: true });
});

route("PUT", /^\/admin\/menu\/(.+)\/modifier-groups$/, ({ path, body }) => {
  const itemId = path.split("/admin/menu/")[1]!.split("/modifier-groups")[0]!;
  const item = _menu.find((m) => m.id === itemId);
  if (!item) return json(404, { error: "Menu item not found" });

  const b = body as SetMenuItemModifierGroupsRequest;
  const ids = (b.group_ids ?? []).filter((id) =>
    _modifierGroups.some((g) => g.id === id),
  );
  _menuItemGroups[itemId] = ids;
  syncToStorage();
  return json(200, { modifier_groups: withModifiers(item).modifier_groups ?? [] });
});

// -------------------- Admin: Ingredients --------------------

// Registered before the `/admin/ingredients/(.+)` patterns so the literal
// sub-path isn't captured as an ingredient id.
route("GET", /^\/admin\/ingredients\/movements$/, ({ query }) => {
  const reason = query.get("reason");
  const page = Number(query.get("page") ?? "1");
  const perPage = Number(query.get("per_page") ?? "25");

  const all = reason
    ? _movements.filter((m) => m.reason === reason)
    : _movements;
  const start = (page - 1) * perPage;

  return json(200, {
    movements: all.slice(start, start + perPage),
    total: all.length,
    page,
    per_page: perPage,
  });
});

route("GET", /^\/admin\/ingredients$/, ({ query }) => {
  if (isOtherBranch(query)) return json(200, []);
  return json(200, [..._ingredients].sort((a, b) => a.name.localeCompare(b.name)));
});

route("POST", /^\/admin\/ingredients$/, ({ body }) => {
  const b = body as CreateIngredientRequest;
  if (!b.name?.trim()) return json(400, { error: "Name is required" });

  const ingredient: Ingredient = {
    id: uid(),
    restaurant_id: _restaurant.id,
    name: b.name.trim(),
    unit: b.unit?.trim() || "unit",
    stock_qty: b.stock_qty ?? 0,
    low_stock_threshold: b.low_stock_threshold ?? null,
    cost_per_unit: b.cost_per_unit ?? null,
    supplier_id: null,
    par_level: b.par_level ?? null,
  };
  _ingredients.push(ingredient);

  // Opening stock is itself a movement, so the ledger starts from zero and
  // explains every unit — otherwise the first count has no provenance.
  if (ingredient.stock_qty > 0) {
    const opening = ingredient.stock_qty;
    ingredient.stock_qty = 0;
    moveStock(ingredient.id, opening, "RESTOCK", "Opening stock");
  }

  syncToStorage();
  return json(201, ingredient);
});

route("PATCH", /^\/admin\/ingredients\/([^/]+)$/, ({ path, body }) => {
  const id = path.split("/admin/ingredients/")[1]!;
  const ingredient = _ingredients.find((i) => i.id === id);
  if (!ingredient) return json(404, { error: "Ingredient not found" });

  const b = body as UpdateIngredientRequest;
  if (b.name !== undefined) ingredient.name = b.name;
  if (b.unit !== undefined) ingredient.unit = b.unit;
  if (b.low_stock_threshold !== undefined) {
    ingredient.low_stock_threshold = b.low_stock_threshold;
  }
  if (b.cost_per_unit !== undefined) ingredient.cost_per_unit = b.cost_per_unit;
  if (b.par_level !== undefined) ingredient.par_level = b.par_level;
  syncToStorage();
  return json(200, ingredient);
});

route("POST", /^\/admin\/ingredients\/([^/]+)\/adjust$/, ({ path, body }) => {
  const id = path.split("/admin/ingredients/")[1]!.split("/adjust")[0]!;
  const b = body as AdjustStockRequest;
  if (typeof b.delta !== "number" || Number.isNaN(b.delta)) {
    return json(400, { error: "delta must be a number" });
  }
  if (!b.reason?.trim()) return json(400, { error: "reason is required" });
  // The real API validates against this enum and rejects anything else. The
  // mock used to take any non-empty string, so a frontend sending its own
  // invented vocabulary passed every test and failed in production — which is
  // exactly what happened with PURCHASE, STOCK_TAKE and CORRECTION.
  if (!(Object.values(STOCK_REASONS) as string[]).includes(b.reason)) {
    return json(422, {
      error: `reason: Input should be ${Object.values(STOCK_REASONS)
        .map((r) => `'${r}'`)
        .join(", ")}`,
    });
  }

  const movement = moveStock(id, b.delta, b.reason as StockReason, b.note ?? null);
  if (!movement) return json(404, { error: "Ingredient not found" });

  syncToStorage();
  return json(201, movement);
});

route("GET", /^\/admin\/menu\/([^/]+)\/recipe$/, ({ path }) => {
  const itemId = path.split("/admin/menu/")[1]!.split("/recipe")[0]!;
  return json(200, { menu_item_id: itemId, lines: recipeLines(itemId) });
});

route("PUT", /^\/admin\/menu\/([^/]+)\/recipe$/, ({ path, body }) => {
  const itemId = path.split("/admin/menu/")[1]!.split("/recipe")[0]!;
  if (!_menu.some((m) => m.id === itemId)) {
    return json(404, { error: "Menu item not found" });
  }

  const b = body as SetRecipeRequest;
  _recipes[itemId] = (b.lines ?? []).filter((line) =>
    _ingredients.some((i) => i.id === line.ingredient_id),
  );
  syncToStorage();
  return json(200, { menu_item_id: itemId, lines: recipeLines(itemId) });
});

// -------------------- Admin: Inventory --------------------

route("PATCH", /^\/admin\/inventory\/(.+)$/, ({ path, body }) => {
  const id = path.split("/admin/inventory/")[1]!;
  const b = body as import("../types/index").InventoryUpdateRequest;
  const item = _menu.find((i) => i.id === id);
  if (!item) return json(404, { error: "Item not found" });

  item.stock_count = b.stock_count;
  if (b.low_stock_threshold !== undefined) {
    item.low_stock_threshold = b.low_stock_threshold;
  }
  // Re-enable item if stock was restocked
  if (item.stock_count !== null && item.stock_count > 0) {
    item.available = true;
  }

  syncToStorage();
  return json(200, { success: true as const, item } satisfies import("../types/index").InventoryUpdateResponse);
});

route("GET", /^\/admin\/inventory\/alerts$/, () => {
  const alerts = _menu
    .filter((i) => i.stock_count !== null && i.stock_count <= i.low_stock_threshold)
    .map((i) => ({
      item_id: i.id,
      name: i.name,
      category: i.category,
      stock_count: i.stock_count as number,
      threshold: i.low_stock_threshold,
    }));
  return json(200, { alerts } satisfies import("../types/index").AdminInventoryAlertsResponse);
});

// -------------------- Admin: Multi-Branch Group --------------------

const _mockGroup: import("../types/index").RestaurantGroup = {
  id: "grp-001",
  name: "Oshap Restaurant Group",
  branches: [
    { ..._restaurant, id: _restaurant.id, is_active: true, table_count: 13, staff_count: 8 },
    { id: "rest-002", name: "Oshap VI", description: "Victoria Island Branch", logo_url: null, operating_hours: "10:00 - 23:00", whatsapp_number: null, is_active: true, table_count: 10, staff_count: 5 },
    { id: "rest-003", name: "Oshap Ikeja", description: "Ikeja Branch", logo_url: null, operating_hours: "09:00 - 22:00", whatsapp_number: null, is_active: false, table_count: 8, staff_count: 4 },
  ],
};

route("GET", /^\/admin\/group$/, () => {
  return json(200, _mockGroup);
});

route("GET", /^\/admin\/group\/analytics$/, () => {
  const revenueByBranch = [
    { branch_id: _restaurant.id, branch_name: _restaurant.name, total_revenue: naira(485000), total_orders: 142, avg_order_value: naira(3415) },
    { branch_id: "rest-002", branch_name: "Oshap VI", total_revenue: naira(312000), total_orders: 87, avg_order_value: naira(3586) },
    { branch_id: "rest-003", branch_name: "Oshap Ikeja", total_revenue: naira(198000), total_orders: 63, avg_order_value: naira(3143) },
  ];
  return json(200, {
    group_name: _mockGroup.name,
    total_revenue: revenueByBranch.reduce((s, b) => s + b.total_revenue, 0),
    total_orders: revenueByBranch.reduce((s, b) => s + b.total_orders, 0),
    branches: revenueByBranch,
  } satisfies import("../types/index").GroupAnalyticsResponse);
});

// -------------------- Platform Admin --------------------

const _platformRestaurants: import("../types/index").PlatformRestaurant[] = [
  { ..._restaurant, subscription_tier: "PRO", billing_period: "ANNUAL", is_active: true, created_at: "2025-01-15T09:00:00Z", owner_email: "owner@oshap.com", table_count: 13, monthly_orders: 142 },
  { id: "rest-002", name: "Oshap VI", description: "Victoria Island Branch", logo_url: null, operating_hours: "10:00 - 23:00", whatsapp_number: null, subscription_tier: "STANDARD", billing_period: "MONTHLY", is_active: true, created_at: "2025-03-20T10:00:00Z", owner_email: "vi@oshap.com", table_count: 10, monthly_orders: 87 },
  { id: "rest-003", name: "Oshap Ikeja", description: "Ikeja Branch", logo_url: null, operating_hours: "09:00 - 22:00", whatsapp_number: null, subscription_tier: "LITE", billing_period: "MONTHLY", is_active: false, created_at: "2025-06-01T08:00:00Z", owner_email: "ikeja@oshap.com", table_count: 8, monthly_orders: 0 },
];

route("GET", /^\/platform\/restaurants$/, () => {
  return json(200, { restaurants: _platformRestaurants });
});

route("GET", /^\/platform\/restaurants\/(.+)$/, ({ path }) => {
  const id = path.split("/platform/restaurants/")[1]!;
  const r = _platformRestaurants.find((r) => r.id === id);
  if (!r) return json(404, { error: "Restaurant not found" });
  return json(200, r);
});

route("POST", /^\/platform\/restaurants$/, ({ body }) => {
  const b = body as import("../types/index").PlatformCreateRestaurantRequest;
  // `owner_name` is intentionally not stored on the restaurant entity — the
  // real backend uses it (with the phone) to provision the OWNER staff
  // account for the new tenant.
  let ownerPhone: string;
  try {
    ownerPhone = normalizePhone(b.owner_phone);
  } catch {
    return json(422, {
      message: "owner_phone: Enter a valid Nigerian phone number",
    });
  }
  // Phone is the account's global identity, so the same owner cannot be
  // provisioned twice — the real schema enforces this with a unique index.
  if ([..._staff.values()].some((st) => st.phone === ownerPhone)) {
    return json(400, { error: "That phone number already has an account" });
  }
  const newRest: import("../types/index").PlatformRestaurant = {
    id: uid(),
    name: b.name,
    description: null,
    logo_url: null,
    operating_hours: null,
    whatsapp_number: null,
    subscription_tier: b.subscription_tier,
    billing_period: b.billing_period ?? "MONTHLY",
    is_active: true,
    created_at: now(),
    owner_phone: ownerPhone,
    owner_email: b.owner_email ?? null,
    table_count: b.table_count,
    monthly_orders: 0,
  };

  // Provision the OWNER with no credential, exactly as the server does, and
  // hand back a one-time link instead. Nobody sets a password for them.
  const ownerId = uid();
  _staff.set(ownerId, {
    id: ownerId,
    name: b.owner_name,
    phone: ownerPhone,
    email: b.owner_email ?? null,
    role: "OWNER",
    created_at: now(),
  });
  const token = issueSetupToken(ownerId, 7 * 24 * 60 * 60 * 1000);
  newRest.owner_setup_url = `${adminAppUrl()}/setup?token=${token}`;
  newRest.owner_setup_expires_at = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  _platformRestaurants.push(newRest);
  return json(201, newRest);
});

route("PATCH", /^\/platform\/restaurants\/(.+)$/, ({ path, body }) => {
  const id = path.split("/platform/restaurants/")[1]!;
  const r = _platformRestaurants.find((r) => r.id === id);
  if (!r) return json(404, { error: "Not found" });
  const b = body as import("../types/index").PlatformUpdateRestaurantRequest;
  if (b.name !== undefined) r.name = b.name;
  if (b.subscription_tier !== undefined) r.subscription_tier = b.subscription_tier;
  if (b.is_active !== undefined) r.is_active = b.is_active;
  return json(200, r);
});

route("GET", /^\/platform\/health$/, () => {
  return json(200, {
    api_uptime_pct: 99.7,
    avg_response_ms: 142,
    error_rate_pct: 0.3,
    active_sessions: _sessions.size,
    total_restaurants: _platformRestaurants.length,
    total_orders_today: [..._orders.values()].filter((o) => o.created_at.startsWith(new Date().toISOString().slice(0, 10))).length,
  } satisfies import("../types/index").PlatformSystemHealth);
});

/**
 * Moves an account's success/failure tally. This is the only thing the ranking
 * learns from, so a verify or reject that skips it silently freezes the order
 * accounts are offered in.
 */
function creditAccount(
  accountId: string | null | undefined,
  outcome: "success" | "failure",
): void {
  if (!accountId) return;
  const account = _bankAccounts.find((a) => a.id === accountId);
  if (!account) return;
  if (outcome === "success") account.success_count = (account.success_count ?? 0) + 1;
  else account.failure_count = (account.failure_count ?? 0) + 1;
}

// -------------------- Admin: Paper trail --------------------

/**
 * Written by the actions themselves rather than seeded, so the log in mock mode
 * reflects what was actually done. A fixture list would demo the screen and
 * prove nothing about whether actions are recorded.
 */
const _auditLog: AuditLogEntry[] = [];

function audit(
  action: string,
  order: { id: string; reference: string } | null,
  details: Record<string, unknown> = {},
): void {
  _auditLog.unshift({
    id: uid(),
    created_at: now(),
    action,
    actor_name: [..._staff.values()].find((st) => st.role === "OWNER")?.name ?? "Staff",
    target_type: order ? "order" : null,
    target_id: order?.id ?? null,
    // Free-form per action, matching the server. The reference rides along so
    // the log can name an order without a second lookup.
    details: order ? { reference: order.reference, ...details } : details,
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/**
 * Written by `recordNotification` below, from the same place the mock
 * publishes an SSE event — which is what the real backend does inside one
 * transaction. Anything else lets the list and the toast disagree.
 */
const _notifications: StoredNotification[] = [];

/** Which stream events leave a row behind, and which resolve one. */
const NOTIFIED: Record<string, NotificationType> = {
  waiter_called: "waiter_called",
  pos_requested: "pos_requested",
  new_order: "new_order",
  order_ready: "order_ready",
  payment_claimed: "payment_claimed",
};

/**
 * The four derived types close themselves when the thing they describe moves.
 * A person can only claim `waiter_called` and `pos_requested`, which have no
 * entity to watch.
 */
const RESOLVED_BY: Record<string, NotificationType[]> = {
  order_preparing: ["new_order"],
  payment_verified: ["payment_claimed"],
  payment_rejected: ["payment_claimed"],
  table_closed: ["order_ready"],
};

function recordNotification(eventType: string, path: string, body: unknown) {
  const tableUuid = /^\/table\/([^/]+)\//.exec(path)?.[1] ?? null;
  const table =
    _tables.find((t) => t.uuid === tableUuid) ??
    _tables.find((t) => t.name === (body as { table?: string } | null)?.table);

  for (const type of RESOLVED_BY[eventType] ?? []) {
    for (const n of _notifications) {
      if (n.type === type && !n.resolved_at && (!table || n.table_id === table.uuid)) {
        n.resolved_at = new Date().toISOString();
        n.is_unresolved = false;
      }
    }
  }

  const type = NOTIFIED[eventType];
  if (!type) return;

  _notifications.unshift({
    id: uid(),
    type,
    // The server composes these too. We prefer our own wording and fall back
    // to them only for a type we do not recognise.
    title: type.replace(/_/g, " "),
    message: table?.name ? `${table.name} needs attention` : "Needs attention",
    // Freeform, which is where the named fields ended up on the real API.
    payload: {},
    table_id: table?.uuid ?? null,
    // Resolved at write time. The client must never have to look this up —
    // a row read three hours later cannot depend on a warm cache.
    table_name: table?.name ?? null,
    audience_roles: ["OWNER", "MANAGER", "WAITER"],
    for_my_role: true,
    created_at: new Date().toISOString(),
    is_unread: true,
    is_unresolved: true,
    read_at: null,
    resolved_at: null,
  });
}

/** Claimable by a person. The rest resolve themselves. */
const CLAIMABLE: NotificationType[] = ["waiter_called", "pos_requested"];

route("GET", /^\/admin\/notifications$/, ({ query }) => {
  const page = Number(query.get("page")) || 1;
  const perPage = Number(query.get("per_page")) || 20;
  const type = query.get("type");

  let rows = _notifications;
  if (type) rows = rows.filter((n) => n.type === type);
  if (query.get("unread_only") === "true") rows = rows.filter((n) => n.is_unread);
  if (query.get("unresolved_only") === "true") {
    rows = rows.filter((n) => n.is_unresolved);
  }

  const start = (page - 1) * perPage;
  // `total` counts the filtered set, not the page — which is what lets the
  // badge ask for `unresolved_only` with `per_page=1` and read the count off
  // it. The agreed scope totals never shipped.
  return json(200, {
    notifications: rows.slice(start, start + perPage),
    total: rows.length,
    page,
    per_page: perPage,
  } as NotificationsResponse);
});

route("POST", /^\/admin\/notifications\/read$/, ({ body }) => {
  const b = (body ?? {}) as NotificationsMarkReadRequest;
  for (const n of _notifications) {
    if (b.all || b.ids?.includes(n.id)) {
      n.is_unread = false;
      n.read_at = new Date().toISOString();
    }
  }
  return json(200, {
    unread_total: _notifications.filter((n) => n.is_unread).length,
  } satisfies NotificationsMarkReadResponse);
});

route("POST", /^\/admin\/notifications\/[^/]+\/resolve$/, ({ path }) => {
  const id = path.split("/admin/notifications/")[1]!.split("/")[0]!;
  const row = _notifications.find((n) => n.id === id);
  if (!row) return json(404, { error: "Notification not found" });

  /**
   * Any type can be cleared by hand now, derived ones included.
   *
   * They used to answer 409, on the reasoning that a person closing one would
   * put the list out of step with the board. True for a live order — but rows
   * created before derived resolution was wired up never close on their own,
   * because the transition that would have closed them already happened. With
   * no way to clear them the bell sat at 9+ for good.
   */

  // Already claimed answers 200 with who got there first. Two waiters tapping
  // at once is the normal case, not an error.
  if (!row.resolved_at) {
    row.resolved_at = new Date().toISOString();
    row.is_unresolved = false;
    // Who went. The API returns this now, and it is the answer to "has somebody
    // already gone?" — so the mock has to carry it or mock mode never exercises
    // the row that names them.
    row.resolved_by_name =
      [..._staff.values()].find((st) => st.role === "OWNER")?.name ?? "You";
  }
  return json(200, row);
});

route("GET", /^\/admin\/audit-logs$/, ({ query }) => {
  const page = Number(query.get("page")) || 1;
  const perPage = Number(query.get("per_page")) || 25;
  const action = query.get("action");

  const filtered = action ? _auditLog.filter((e) => e.action === action) : _auditLog;
  const start = (page - 1) * perPage;

  return json(200, {
    logs: filtered.slice(start, start + perPage),
    total: filtered.length,
    page,
    per_page: perPage,
  } satisfies AuditLogResponse);
});

route("GET", /^\/admin\/orders\/[^/]+\/receipt$/, ({ path }) => {
  const orderId = path.split("/admin/orders/")[1]!.split("/")[0]!;
  const order = _orders.get(orderId) as StoredOrderWithItems | undefined;
  if (!order) return json(404, { error: "Order not found" });

  const payment = _payments.get(order.id);

  return json(200, {
    order_id: order.id,
    reference: order.reference,
    table_id: order.table_id,
    customer_name: order.customer_name ?? null,
    status: order.status,
    restaurant: _restaurant,
    created_at: order.created_at,
    // Only set once the money is in, so a receipt for an unpaid bill is
    // distinguishable from one for a settled bill.
    paid_at: payment?.status === "VERIFIED" ? payment.created_at : null,
    items: order.order_items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
    })),
    subtotal: order.subtotal ?? order.total,
    discount: order.discount ?? 0,
    service_charge: order.service_charge ?? 0,
    vat: order.vat ?? 0,
    tip: order.tip ?? 0,
    total: order.total,
    payment_method: payment?.method ?? null,
  } satisfies ReceiptResponse);
});

// -------------------- Admin: Bill adjustments --------------------

type StoredOrderWithItems = Order & {
  order_items: StoredOrderItem[];
};

/**
 * Re-prices an order from its current lines. Adjustments never patch `total`
 * directly — they change an input and let the same formula recompute, so the
 * invariant can't drift out from under the Z-report.
 */
function reprice(order: StoredOrderWithItems): void {
  const subtotal = order.order_items.reduce((s, i) => s + i.price * i.quantity, 0);
  Object.assign(order, priceOrder(subtotal, order.discount ?? 0, order.tip ?? 0));
}

function findAdjustableOrder(path: string, marker: string) {
  const orderId = path.split("/admin/orders/")[1]!.split("/")[0]!;
  const order = _orders.get(orderId) as StoredOrderWithItems | undefined;
  return { orderId, order, marker };
}

route("POST", /^\/admin\/orders\/[^/]+\/discount$/, ({ path, body }) => {
  const { order } = findAdjustableOrder(path, "discount");
  if (!order) return json(404, { error: "Order not found" });

  const b = body as DiscountRequest;
  const subtotal = order.order_items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount =
    b.percent !== undefined ? applyRate(subtotal, Math.round(b.percent * 100)) : (b.amount ?? 0);

  // A discount larger than the bill would invert the total.
  if (discount < 0 || discount > subtotal) {
    return json(400, { error: "Discount cannot exceed the subtotal" });
  }

  order.discount = discount;
  reprice(order);
  audit(AUDIT_ACTIONS.discount, order, { amount: discount });
  syncToStorage();
  return json(200, order);
});

route("POST", /^\/admin\/orders\/[^/]+\/tip$/, ({ path, body }) => {
  const { order } = findAdjustableOrder(path, "tip");
  if (!order) return json(404, { error: "Order not found" });

  const amount = (body as TipRequest).amount;
  if (!Number.isFinite(amount) || amount < 0) {
    return json(400, { error: "Tip must be zero or more" });
  }

  order.tip = amount;
  reprice(order);
  audit(AUDIT_ACTIONS.tip, order, { amount });
  syncToStorage();
  return json(200, order);
});

route("POST", /^\/admin\/orders\/[^/]+\/refund$/, ({ path, body }) => {
  const { order } = findAdjustableOrder(path, "refund");
  if (!order) return json(404, { error: "Order not found" });

  // Only a settled bill can be refunded — there is nothing to hand back
  // otherwise, and allowing it would let an unpaid order reduce the takings.
  if (order.status !== "CONFIRMED") {
    return json(400, { error: "Only confirmed orders can be refunded" });
  }

  const b = body as RefundRequest;
  const amount = b.amount ?? order.total;
  if (amount <= 0 || amount > order.total) {
    return json(400, { error: "Refund exceeds order total" });
  }

  // REFUNDED rather than CANCELLED: a cancelled order was never paid for, and
  // conflating the two would misreport the day.
  order.status = "REFUNDED";
  _payments.set(order.id, {
    id: uid(),
    order_id: order.id,
    // Negative, so a refund reads as money leaving rather than arriving.
    amount: -amount,
    status: "REFUNDED",
    proof_url: null,
    bank_account_id: null,
    method: _payments.get(order.id)?.method,
    created_at: now(),
  });

  audit(AUDIT_ACTIONS.refund, order, { amount, reason: b.reason ?? null });
  syncToStorage();
  return json(200, { success: true as const, refunded: amount } satisfies RefundResponse);
});

route("PATCH", /^\/admin\/orders\/[^/]+\/items\/[^/]+$/, ({ path, body }) => {
  const { order } = findAdjustableOrder(path, "item");
  if (!order) return json(404, { error: "Order not found" });

  const itemId = path.split("/items/")[1]!;
  const item = order.order_items.find((i) => i.id === itemId);
  if (!item) return json(404, { error: "Item not found" });

  const b = body as UpdateOrderItemRequest;
  if (b.name !== undefined) item.name = b.name;
  if (b.price !== undefined) {
    if (b.price < 0) return json(400, { error: "Price cannot be negative" });
    item.price = b.price;
  }
  if (b.quantity !== undefined) {
    if (b.quantity < 1) return json(400, { error: "Use void to remove a line" });
    item.quantity = b.quantity;
  }

  reprice(order);
  audit(AUDIT_ACTIONS.itemUpdate, order, { item: item.name });
  syncToStorage();
  return json(200, order);
});

route("DELETE", /^\/admin\/orders\/[^/]+\/items\/[^/]+$/, ({ path }) => {
  const { order } = findAdjustableOrder(path, "item");
  if (!order) return json(404, { error: "Order not found" });

  const itemId = path.split("/items/")[1]!;
  const before = order.order_items.length;
  order.order_items = order.order_items.filter((i) => i.id !== itemId);
  if (order.order_items.length === before) return json(404, { error: "Item not found" });

  reprice(order);
  audit(AUDIT_ACTIONS.itemVoid, order, {});
  syncToStorage();
  return json(200, order);
});

route("POST", /^\/admin\/orders\/[^/]+\/items\/[^/]+\/comp$/, ({ path }) => {
  const { order } = findAdjustableOrder(path, "comp");
  if (!order) return json(404, { error: "Order not found" });

  const itemId = path.split("/items/")[1]!.replace("/comp", "");
  const item = order.order_items.find((i) => i.id === itemId);
  if (!item) return json(404, { error: "Item not found" });

  // Comp keeps the line visible at zero — the kitchen still made it, and the
  // guest should see it was given rather than silently removed.
  item.price = 0;
  reprice(order);
  audit(AUDIT_ACTIONS.itemComp, order, { item: item.name });
  syncToStorage();
  return json(200, order);
});

// -------------------- Admin: Z-report --------------------

route("GET", /^\/admin\/z-report$/, ({ query }) => {
  const date = query.get("date") ?? new Date().toISOString().slice(0, 10);

  // Only settled money counts — an unpaid bill is not takings, and including
  // it would make the report disagree with the drawer.
  const settled = [..._orders.values()].filter(
    (o) => o.status === "CONFIRMED" && o.created_at.slice(0, 10) === date,
  );

  const sum = (pick: (o: (typeof settled)[number]) => number) =>
    settled.reduce((acc, o) => acc + pick(o), 0);

  const totalFor = (method: PaymentMethod) =>
    settled
      .filter((o) => (_payments.get(o.id)?.method ?? "MANUAL_TRANSFER") === method)
      .reduce((acc, o) => acc + o.total, 0);

  // Refunded orders leave CONFIRMED, so they never reach `settled` — their
  // value is reported separately rather than netted off the sales figure.
  const refunded = [..._orders.values()].filter(
    (o) => o.status === "REFUNDED" && o.created_at.slice(0, 10) === date,
  );

  return json(200, {
    date,
    order_count: settled.length,
    total_sales: sum((o) => o.total),
    cash_total: totalFor("CASH"),
    transfer_total: totalFor("MANUAL_TRANSFER"),
    pos_total: totalFor("POS"),
    vat_collected: sum((o) => o.vat ?? 0),
    service_charge_collected: sum((o) => o.service_charge ?? 0),
    discount_total: sum((o) => o.discount ?? 0),
    tip_total: sum((o) => o.tip ?? 0),
    refund_total: refunded.reduce((acc, o) => acc + o.total, 0),
  } satisfies ZReportResponse);
});

// -------------------- Admin: Cash payment --------------------

route("POST", /^\/admin\/orders\/cash$/, ({ body }) => {
  const b = body as RecordCashRequest;
  if (!b.order_ids?.length) return json(400, { error: "No orders specified" });

  let paid = 0;
  let amount = 0;
  const results: SettlementResult[] = [];
  const method = b.method ?? "CASH";

  /**
   * Spread across the orders in turn rather than all-or-nothing.
   *
   * A tender below the total now leaves a balance instead of settling the lot,
   * which is what ₦40,000 against a ₦41,086.50 bill should always have done.
   * Applying it in order means the first bills close and the last carries the
   * shortfall, which is how a person hands over money at a table.
   */
  let remaining = b.amount ?? Number.POSITIVE_INFINITY;

  for (const oid of b.order_ids) {
    const order = _orders.get(oid);
    if (!order || order.status === "CONFIRMED") continue;

    const alreadyPaid = _amountPaid.get(oid) ?? 0;
    const owing = order.total - alreadyPaid;
    const applied = Math.max(0, Math.min(owing, remaining));
    remaining -= applied;

    const nowPaid = alreadyPaid + applied;
    _amountPaid.set(oid, nowPaid);
    const balance = order.total - nowPaid;

    if (balance <= 0) {
      order.status = "CONFIRMED";
      _payments.set(oid, {
        id: uid(),
        order_id: oid,
        amount: order.total,
        status: "VERIFIED",
        proof_url: null,
        bank_account_id: null,
        method,
        created_at: now(),
      });
      paid++;
    } else {
      // Part paid: the order stays open and the table stays lit, which is the
      // entire point of recording it rather than refusing it.
      _payments.set(oid, {
        id: uid(),
        order_id: oid,
        amount: nowPaid,
        status: "CLAIMED",
        proof_url: null,
        bank_account_id: null,
        method,
        created_at: now(),
      });
    }

    if (applied > 0) audit(AUDIT_ACTIONS.cashPaid, order, { amount: applied });
    amount += applied;
    results.push({
      order_id: oid,
      settled: balance <= 0,
      amount_applied: applied,
      balance_due: Math.max(0, balance),
    });
  }

  if (results.length === 0) return json(404, { error: "No unpaid orders found" });

  syncToStorage();
  return json(200, {
    success: true as const,
    paid,
    amount,
    results,
  } satisfies RecordCashResponse);
});

route("POST", /^\/admin\/orders\/[^/]+\/serve$/, ({ path, body }) => {
  const orderId = path.split("/admin/orders/")[1]!.split("/")[0]!;
  const order = _orders.get(orderId);
  if (!order) return json(404, { error: "Order not found" });
  if (order.status === "CANCELLED") {
    return json(409, { error: "That order was cancelled" });
  }

  const method = (body as ServeOrderRequest | null)?.method;

  /**
   * Served first, paid second — and the two are recorded separately on
   * purpose. Without a method the order stays SERVED and open: the food is out,
   * the money is not in, and the table stays lit. Nothing is assumed.
   */
  order.status = "SERVED";

  if (method) {
    const alreadyPaid = _amountPaid.get(orderId) ?? 0;
    _amountPaid.set(orderId, order.total);
    _payments.set(orderId, {
      id: uid(),
      order_id: orderId,
      amount: order.total,
      status: "VERIFIED",
      proof_url: null,
      bank_account_id: null,
      method,
      created_at: now(),
    });
    order.status = "CONFIRMED";
    audit(AUDIT_ACTIONS.cashPaid, order, { amount: order.total - alreadyPaid });
  }

  syncToStorage();
  return json(200, {
    success: true as const,
    order_id: orderId,
    status: order.status,
    settled: Boolean(method),
    balance_due: method ? 0 : order.total - (_amountPaid.get(orderId) ?? 0),
  } satisfies ServeOrderResponse);
});

route("POST", /^\/admin\/reject$/, ({ body }) => {
  const b = body as AdminRejectRequest;
  // Per order, matching the real API: two guests at one table pay separately.
  const pendingOrders = [..._orders.values()].filter(
    (o) => o.id === b.order_id && o.status === "PAYMENT_PENDING",
  );

  if (pendingOrders.length === 0) {
    return json(404, { error: "No pending payments" });
  }

  for (const o of pendingOrders) {
    // The food was served — rejecting the payment returns the order to unpaid,
    // not to the kitchen.
    o.status = "READY";
    const p = _payments.get(o.id);
    if (!p) continue;
    p.status = "FAILED";
    creditAccount(p.bank_account_id, "failure");
    audit("payment.reject", o, { amount: o.total, reason: b.reason ?? null });
  }

  syncToStorage();
  return json(200, {
    success: true as const,
    rejected: pendingOrders.length,
  } satisfies AdminRejectResponse);
});

route("POST", /^\/admin\/verify$/, ({ body }) => {
  const b = body as AdminVerifyRequest;
  /**
   * One bill when `order_id` says so, otherwise every claim on the table.
   *
   * The table-wide form is what the board used to send, and on a shared table
   * it settled a claim belonging to somebody else — one guest's transfer
   * closing another guest's bill. The board names the order now.
   */
  const pendingOrders = [..._orders.values()].filter(
    (o) =>
      o.status === "PAYMENT_PENDING" &&
      (b.order_id ? o.id === b.order_id : o.table_id === b.table_id),
  );

  if (pendingOrders.length === 0) {
    return json(404, { error: "No pending payments" });
  }

  for (const o of pendingOrders) {
    o.status = "CONFIRMED";
    const p = _payments.get(o.id);
    if (!p) continue;
    p.status = "VERIFIED";
    creditAccount(p.bank_account_id, "success");
    audit("payment.verify", o, { amount: o.total });
  }

  // Auto-close only when nothing is left owing anywhere on that table —
  // including the other guest's bill, which is the case this used to get
  // wrong by closing the table out from under them.
  const tableName = pendingOrders[0]!.table_id;
  const hasUnpaid = [..._orders.values()].some(
    (o) =>
      o.table_id === tableName &&
      OPEN_STATUSES.includes(o.status),
  );

  let autoClosed = false;
  if (!hasUnpaid) {
    for (const [sid, s] of _sessions) {
      if (s.table_id === tableName) _sessions.delete(sid);
    }
    autoClosed = true;
  }

  return json(200, {
    success: true as const,
    verified_count: pendingOrders.length,
    auto_closed: autoClosed,
  } satisfies AdminVerifyResponse);
});

// -------------------- Admin: Close Table --------------------

route("POST", /^\/admin\/close$/, ({ body }) => {
  const b = body as { table_id: string; reason: "paid" | "abandoned" };
  if (!b.table_id) return json(400, { error: "table_id is required" });

  const newStatus = b.reason === "paid" ? "CONFIRMED" : "CANCELLED";

  // Close all active orders at this table
  const activeOrders = [..._orders.values()].filter(
    (o) =>
      o.table_id === b.table_id &&
      OPEN_STATUSES.includes(o.status),
  );

  for (const o of activeOrders) {
    o.status = newStatus;
    const p = _payments.get(o.id);
    if (p) p.status = b.reason === "paid" ? "VERIFIED" : "CONFIRMED";
  }

  // Clear the table session
  for (const [sid, s] of _sessions) {
    if (s.table_id === b.table_id) _sessions.delete(sid);
  }

  syncToStorage();

  return json(200, {
    success: true as const,
    closed_count: activeOrders.length,
  });
});

// -------------------- Admin: Analytics --------------------

route("GET", /^\/admin\/analytics$/, ({ query }) => {
  const startDateStr = query.get("start_date") || "";
  const endDateStr = query.get("end_date") || "";

  // Generate deterministic mock data based on the dates
  // Usually we'd filter the real orders, but to ensure the charts look good,
  // we'll return a rich set of dummy data.
  
  const revenueOverTime = [];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let totalRevenue = 0;
  let totalOrders = 0;
  
  const factor = branchFactor(query);
  for (let i = 0; i < 7; i++) {
    const rev = naira(Math.floor((Math.random() * 100000 + 20000) * factor));
    const ords = Math.floor((Math.random() * 30 + 10) * factor);
    totalRevenue += rev;
    totalOrders += ords;
    revenueOverTime.push({
      date: `2026-06-0${i + 1}`,
      revenue: rev,
      orders: ords,
    });
  }

  const popularItems = [
    { name: "Jollof Rice & Chicken", quantity: 45, revenue: naira(157500) },
    { name: "Chicken Shawarma", quantity: 38, revenue: naira(95000) },
    { name: "Chapman", quantity: 52, revenue: naira(78000) },
    { name: "Grilled Fish", quantity: 15, revenue: naira(75000) },
    { name: "Puff Puff", quantity: 60, revenue: naira(30000) },
  ];

  const peakHours = [];
  for (let i = 9; i <= 22; i++) {
    let base = 5;
    if (i >= 12 && i <= 14) base = 25; // Lunch peak
    if (i >= 18 && i <= 21) base = 35; // Dinner peak
    peakHours.push({
      hour: `${i}:00`,
      order_count: base + Math.floor(Math.random() * 10),
    });
  }

  const tablePerformance = [
    { table_id: "T1", order_count: 12, revenue: naira(45000) },
    { table_id: "T2", order_count: 8, revenue: naira(32000) },
    { table_id: "T3", order_count: 15, revenue: naira(85000) },
    { table_id: "T4", order_count: 22, revenue: naira(115000) },
    { table_id: "T5", order_count: 5, revenue: naira(15000) },
  ];

  const staffActivity = [
    { staff_name: "Alice", role: "MANAGER", actions_taken: 45 },
    { staff_name: "Bob", role: "WAITER", actions_taken: 120 },
    { staff_name: "Charlie", role: "WAITER", actions_taken: 95 },
    { staff_name: "Diana", role: "CASHIER", actions_taken: 60 },
  ];

  return json(200, {
    summary: {
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      avg_order_value: Math.floor(totalRevenue / totalOrders),
    },
    revenue_over_time: revenueOverTime,
    popular_items: popularItems,
    peak_hours: peakHours,
    table_performance: tablePerformance,
    staff_activity: staffActivity,
  } satisfies import("../types/index").AdminAnalyticsResponse);
});

// -------------------- Admin: Staff --------------------

// ---------------------------------------------------------------------------
// Branches — the venues a group runs, and what Pro is sold on
// ---------------------------------------------------------------------------

/**
 * Seeded with a single branch, because that is what almost every restaurant
 * is. The switcher only appears above one, so the default state exercises the
 * "don't show it" path rather than the exciting one.
 */
const _branches: Map<string, RestaurantBranch> = new Map([
  [
    "br-main",
    {
      id: "br-main",
      name: "Main",
      description: null,
      logo_url: null,
      operating_hours: null,
      whatsapp_number: null,
      address: "12 Adeola Odeku Street, Victoria Island, Lagos",
      is_active: true,
      table_count: 12,
      staff_count: 4,
    } as RestaurantBranch,
  ],
]);

route("GET", /^\/admin\/branches$/, () => {
  return json(200, [..._branches.values()]);
});

route("POST", /^\/admin\/branches$/, ({ body }) => {
  const b = body as BranchCreateRequest;
  if (!b.name?.trim()) {
    return json(422, { message: "name: Field required" });
  }
  const branch: RestaurantBranch = {
    id: `br-${Date.now().toString(36)}`,
    name: b.name.trim(),
    description: b.description ?? null,
    logo_url: null,
    operating_hours: b.operating_hours ?? null,
    whatsapp_number: b.whatsapp_number ?? null,
    address: b.address ?? null,
    is_active: true,
    // Pre-created with the venue, the way onboarding a restaurant does — a
    // branch that cannot print a QR code on day one is not open.
    table_count: b.table_count ?? 0,
    staff_count: 0,
  };
  _branches.set(branch.id, branch);
  syncToStorage();
  return json(201, branch);
});

route("PATCH", /^\/admin\/branches\/([^/]+)$/, ({ path, body }) => {
  const branch = _branches.get(
    decodeURIComponent(path.split("/admin/branches/")[1]!),
  );
  if (!branch) return json(404, { message: "Branch not found" });
  const b = body as BranchUpdateRequest;
  if (b.name !== undefined) branch.name = b.name;
  if (b.description !== undefined) branch.description = b.description;
  if (b.address !== undefined) branch.address = b.address;
  if (b.operating_hours !== undefined) branch.operating_hours = b.operating_hours;
  if (b.whatsapp_number !== undefined) branch.whatsapp_number = b.whatsapp_number;
  if (b.is_active !== undefined) branch.is_active = b.is_active;
  syncToStorage();
  return json(200, branch);
});

route("GET", /^\/admin\/staff$/, () => {
  return json(200, [..._staff.values()]);
});

route("POST", /^\/admin\/staff$/, ({ body }) => {
  const b = body as CreateStaffRequest;
  if (!b.name || !b.phone || !b.role) {
    return json(400, { error: "Missing required fields" });
  }

  // Normalized before the uniqueness check, or 0803… and +234803… would be
  // stored as two different people who are in fact one.
  let phone: string;
  try {
    phone = normalizePhone(b.phone);
  } catch {
    return json(422, { message: "phone: Enter a valid Nigerian phone number" });
  }
  if ([..._staff.values()].some((s) => s.phone === phone)) {
    return json(400, { error: "That phone number already has an account" });
  }

  const staff: StaffMember = {
    id: uid(),
    name: b.name,
    phone,
    email: b.email ?? null,
    role: b.role,
    created_at: now(),
  };
  _staff.set(staff.id, staff);
  return json(201, staff);
});

route("PATCH", /^\/admin\/staff\/(.+)$/, ({ path, body }) => {
  const id = path.split("/admin/staff/")[1]!;
  const b = body as UpdateStaffRequest;
  const staff = _staff.get(id);
  if (!staff) return json(404, { error: "Staff not found" });

  if (b.name) staff.name = b.name;
  if (b.email) staff.email = b.email;
  if (b.role) staff.role = b.role;
  return json(200, staff);
});

route("DELETE", /^\/admin\/staff\/(.+)$/, ({ path }) => {
  const id = path.split("/admin/staff/")[1]!;
  if (_staff.get(id)?.role === "OWNER" && [..._staff.values()].filter((s) => s.role === "OWNER").length === 1) {
    return json(400, { error: "Cannot delete the last owner" });
  }
  _staff.delete(id);
  return json(200, { success: true as const });
});

route("POST", /^\/admin\/close$/, ({ body }) => {
  const b = body as AdminCloseRequest;
  if (!b.table_id || !["paid", "abandoned"].includes(b.reason)) {
    return json(400, { error: "Missing table_id or invalid reason" });
  }

  const createdOrders = [..._orders.values()].filter(
    (o) => o.table_id === b.table_id && o.status === "CREATED",
  );
  const pendingOrders = [..._orders.values()].filter(
    (o) => o.table_id === b.table_id && o.status === "PAYMENT_PENDING",
  );

  if (b.reason === "paid") {
    for (const o of [...createdOrders, ...pendingOrders]) {
      o.status = "CONFIRMED";
      _payments.set(o.id, {
        id: uid(),
        order_id: o.id,
        amount: o.total,
        status: "VERIFIED",
        proof_url: null,
        created_at: now(),
      });
    }
  } else {
    for (const o of createdOrders) o.status = "CANCELLED";
    for (const o of pendingOrders) {
      o.status = "CANCELLED";
      const p = _payments.get(o.id);
      if (p) p.status = "NOT_PAID";
    }
  }

  // Clear sessions
  for (const [sid, s] of _sessions) {
    if (s.table_id === b.table_id) _sessions.delete(sid);
  }

  return json(200, {
    success: true as const,
    table_id: b.table_id,
    reason: b.reason,
  } satisfies AdminCloseResponse);
});

route("POST", /^\/devices\/register$/, () => {
  return json(200, { success: true as const });
});

/**
 * Maps a mutating request to the SSE event the real backend would emit, using
 * the same lower_snake vocabulary. Keeping the mock on the real names means
 * mock mode exercises the same `useGlobalSSE` branches as production — the
 * previous SCREAMING_CASE names existed only here.
 */
function sseEventFor(path: string, body: unknown): string {
  if (path === "/orders") return "new_order";

  if (path.startsWith("/admin/kitchen")) {
    // The kitchen PATCH carries the status it is moving to.
    const status = (body as { status?: string } | null)?.status;
    return status === "READY" ? "order_ready" : "order_preparing";
  }

  if (path.includes("/call-waiter")) return "waiter_called";
  if (path.includes("/request-pos")) return "pos_requested";
  if (path === "/payment/confirm") return "payment_claimed";
  if (path === "/admin/orders/cash") return "payment_confirmed";
  if (path === "/admin/verify") return "payment_verified";
  if (path === "/admin/reject") return "payment_rejected";
  if (path === "/admin/close") return "table_closed";
  if (path === "/session") return "session_started";

  return "generic_update";
}

// ---------------------------------------------------------------------------
// Dispatcher — called from client.ts when mock mode is active
// ---------------------------------------------------------------------------

export async function mockRequest(
  path: string,
  method: string,
  body: unknown,
  queryParams: URLSearchParams,
  admin: boolean,
): Promise<MockRouteMatch> {

  // Pull latest state from localStorage so this tab sees writes made in
  // other tabs (e.g. PIN created by another customer at the same table).
  syncFromStorage();
  await delay(150 + Math.random() * 200);

  for (const r of routes) {
    if (r.methods.includes(method) && r.pattern.test(path)) {
      const result = await r.fn({ path, method, body, query: queryParams, admin });
      // Persist after mutations only; GET handlers don't change state.
      if (method !== "GET") {
        syncToStorage();
        const eventType = sseEventFor(path, body);
        // Row first, then the event — the real backend writes both in one
        // transaction so the list and the toast can never disagree.
        recordNotification(eventType, path, body);
        dispatchMockEvent(eventType);
      }
      return result;
    }
  }

  return json(404, { error: `Mock: no handler for ${method} ${path}` });
}
