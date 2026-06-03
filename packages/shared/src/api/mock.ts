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
  AdminCloseResponse,
  AdminHistoryResponse,
  AdminMeResponse,
  AdminTablesResponse,
  AdminVerifyRequest,
  AdminVerifyResponse,
  ClaimPaymentRequest,
  ClaimPaymentResponse,
  ConfirmOrdersRequest,
  ConfirmOrdersResponse,
  CreateMenuItemRequest,
  CreateOrderRequest,
  CreateOrderResponse,
  KitchenUpdateRequest,
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
  CreateStaffRequest,
  UpdateStaffRequest,
} from "../types/index";

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

let _restaurant: Restaurant = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Aji's Kitchen",
  description: "Authentic African cuisine",
  logo_url: null,
  operating_hours: "09:00 - 22:00",
  bank_name: "Access Bank",
  account_number: "0123456789",
  account_name: "Aji's Kitchen Ltd",
  whatsapp_number: "+2348012345678",
};

const SEED_MENU: MenuItem[] = [
  { id: "m-001", restaurant_id: _restaurant.id, name: "Chicken Shawarma", price: 2500, category: "Meals", description: "Grilled chicken wrap with garlic sauce, pickles and fries", image_url: "https://www.simplyquinoa.com/wp-content/uploads/2023/05/chicken-shawarma-gyros-9.jpg", available: true, sort_order: 1 },
  { id: "m-002", restaurant_id: _restaurant.id, name: "Beef Shawarma", price: 3000, category: "Meals", description: "Tender beef strips with tahini sauce and fresh vegetables", image_url: "https://live.staticflickr.com/65535/51249894956_3d8a1b8b2b_h.jpg", available: true, sort_order: 2 },
  { id: "m-003", restaurant_id: _restaurant.id, name: "Jollof Rice & Chicken", price: 3500, category: "Meals", description: "Party-style jollof rice with a perfectly grilled chicken thigh", image_url: "https://cdn.guardian.ng/wp-content/uploads/2023/12/Photo-Credit-Jollof-Festival-.jpg", available: true, sort_order: 3 },
  { id: "m-004", restaurant_id: _restaurant.id, name: "Fried Rice & Turkey", price: 4000, category: "Meals", description: "Vegetable fried rice served with peppered turkey", image_url: "https://opensharaton.com/wp-content/uploads/2023/02/Fried_Rice_with_Turkey.jpeg", available: true, sort_order: 4 },
  { id: "m-005", restaurant_id: _restaurant.id, name: "Peppered Chicken", price: 2000, category: "Meals", description: "Spicy fried chicken in a pepper sauce", image_url: "https://flavorquotient.com/wp-content/uploads/2025/04/Pepper-Chicken-Dry-FQ-8-2.webp", available: true, sort_order: 5 },
  { id: "m-006", restaurant_id: _restaurant.id, name: "Suya Platter", price: 3000, category: "Grills", description: "Grilled beef skewers with yaji spice, onions and tomatoes", image_url: "https://cheflolaskitchen.com/wp-content/uploads/2025/07/Suya-960x960.jpg.webp", available: true, sort_order: 1 },
  { id: "m-007", restaurant_id: _restaurant.id, name: "Grilled Fish", price: 5000, category: "Grills", description: "Whole catfish grilled with pepper sauce and plantain", image_url: "https://simshomekitchen.com/wp-content/uploads/2025/08/Two-whole-grilled-tilapia-in-a-tray-with-plantain-lettuce-and-pepper-sauce.jpg", available: true, sort_order: 2 },
  { id: "m-008", restaurant_id: _restaurant.id, name: "Asun", price: 3500, category: "Grills", description: "Spicy smoked goat meat with peppers and onions", image_url: "https://lowcarbafrica.com/wp-content/uploads/2019/09/Asun-recipe-IG-1.jpg", available: true, sort_order: 3 },
  { id: "m-009", restaurant_id: _restaurant.id, name: "Chapman", price: 1500, category: "Drinks", description: "Classic Nigerian cocktail with Fanta, Sprite and bitters", image_url: "https://www.africanrecipes.com.ng/wp-content/uploads/2025/08/chapman-drink-featured.png.webp", available: true, sort_order: 1 },
  { id: "m-010", restaurant_id: _restaurant.id, name: "Zobo", price: 800, category: "Drinks", description: "Refreshing hibiscus drink with ginger and pineapple", image_url: "https://lowcarbafrica.com/wp-content/uploads/2020/07/Sorrel-drink-sobolo-zobo-Drink-blog-1a.jpg", available: true, sort_order: 2 },
  { id: "m-011", restaurant_id: _restaurant.id, name: "Fresh Orange Juice", price: 1200, category: "Drinks", description: "Freshly squeezed orange juice, no sugar added", image_url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80", available: true, sort_order: 3 },
  { id: "m-012", restaurant_id: _restaurant.id, name: "Coca-Cola", price: 500, category: "Drinks", description: "Classic Coca-Cola 50cl bottle", image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80", available: true, sort_order: 4 },
  { id: "m-013", restaurant_id: _restaurant.id, name: "Malt", price: 600, category: "Drinks", description: "Amstel Malt 50cl bottle", image_url: "https://m.media-amazon.com/images/I/71LH6-Oi6iL.jpg", available: true, sort_order: 5 },
  { id: "m-014", restaurant_id: _restaurant.id, name: "Puff Puff", price: 500, category: "Sides", description: "6 pieces of fluffy Nigerian doughnuts", image_url: "https://allnigerianfoods.com/wp-content/uploads/puff_puff_recipe.jpg", available: true, sort_order: 1 },
  { id: "m-015", restaurant_id: _restaurant.id, name: "Plantain Chips", price: 800, category: "Sides", description: "Crunchy plantain chips with a spicy dip", image_url: "https://foreignfork.com/wp-content/uploads/2022/02/SweetPlantainChipsFEATURE-500x500.jpg", available: true, sort_order: 2 },
  { id: "m-016", restaurant_id: _restaurant.id, name: "French Fries", price: 1000, category: "Sides", description: "Golden crispy fries with ketchup", image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80", available: true, sort_order: 3 },
  { id: "m-017", restaurant_id: _restaurant.id, name: "Coleslaw", price: 500, category: "Sides", description: "Fresh coleslaw with creamy dressing", image_url: "https://www.inspiredtaste.net/wp-content/uploads/2015/01/Coleslaw-Recipe-1-1200.jpg", available: true, sort_order: 4 },
];

const SEED_TABLES = [
  "T1", "T2", "T3", "T4", "T5", "T6",
  "T7", "T8", "T9", "T10", "T11", "T12", "T-G37",
];

// ---------------------------------------------------------------------------
// State — persisted to localStorage so it survives page refresh AND so tabs
// in the same browser share orders/sessions (lets you JOIN a session created
// in another tab, simulating a real multi-customer table).
//
// To wipe the seed data and start fresh: run `localStorage.removeItem("oshap-mock-state")`
// in the browser devtools, or hard-clear site data.
// ---------------------------------------------------------------------------

type StoredOrder = Order & {
  order_items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
};

let _menu: MenuItem[] = [...SEED_MENU];
const _orders: Map<string, StoredOrder> = new Map();
const _payments: Map<string, Payment> = new Map();
const _sessions: Map<string, TableSession> = new Map();
const _staff: Map<string, StaffMember> = new Map();
let _orderCounter = 0;

const STORAGE_KEY = "oshap-mock-state";

interface PersistedState {
  restaurant?: Restaurant;
  menu?: MenuItem[];
  orders?: Array<[string, StoredOrder]>;
  payments?: Array<[string, Payment]>;
  sessions?: Array<[string, TableSession]>;
  staff?: Array<[string, StaffMember]>;
  orderCounter?: number;
}

function syncFromStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as PersistedState;

    if (saved.restaurant) _restaurant = saved.restaurant;
    if (Array.isArray(saved.menu)) _menu = saved.menu;

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
      restaurant: _restaurant,
      menu: _menu,
      orders: Array.from(_orders.entries()),
      payments: Array.from(_payments.entries()),
      sessions: Array.from(_sessions.entries()),
      staff: Array.from(_staff.entries()),
      orderCounter: _orderCounter,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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
  return json(200, items);
});

// -------------------- Customer: Tables --------------------

route("GET", /^\/table\/(.+)$/, ({ path, query }) => {
  const tableId = path.split("/table/")[1]!;
  const deviceToken = query.get("device_token") ?? undefined;
  const sessionId = query.get("session_id") ?? undefined;

  if (!SEED_TABLES.includes(tableId)) {
    return json(404, { error: "Table not found" });
  }

  const tableOrders = [..._orders.values()].filter(
    (o) =>
      o.table_id === tableId &&
      (o.status === "CREATED" || o.status === "PAYMENT_PENDING"),
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

  const createdOrders = scopedOrders.filter((o) => o.status === "CREATED");
  const pendingOrders = scopedOrders.filter((o) => o.status === "PAYMENT_PENDING");

  let unpaidOrder = null;
  if (createdOrders.length > 0) {
    const latest = createdOrders[createdOrders.length - 1]!;
    unpaidOrder = {
      ...latest,
      total: createdOrders.reduce((s, o) => s + o.total, 0),
      combined_order_ids: createdOrders.map((o) => o.id),
    };
  }

  let pendingPayments = null;
  if (pendingOrders.length > 0) {
    const latest = pendingOrders[pendingOrders.length - 1]!;
    pendingPayments = {
      ...latest,
      total: pendingOrders.reduce((s, o) => s + o.total, 0),
      combined_order_ids: pendingOrders.map((o) => o.id),
    };
  }

  const result: TableInfo = {
    table_id: tableId,
    status: "OPEN",
    restaurant: _restaurant,
    unpaid_order: unpaidOrder as TableInfo["unpaid_order"],
    pending_payments: pendingPayments as TableInfo["pending_payments"],
  };

  return json(200, result);
});

// -------------------- Customer: Call Waiter --------------------

route("POST", /^\/table\/(.+)\/call-waiter$/, ({ path }) => {
  const tableId = decodeURIComponent(path.split("/table/")[1]!.replace(/\/call-waiter$/, ""));
  if (!SEED_TABLES.includes(tableId)) {
    return json(404, { error: "Table not found" });
  }
  return json(200, { success: true as const });
});

// -------------------- Customer: Request POS --------------------

route("POST", /^\/table\/(.+)\/request-pos$/, ({ path, body }) => {
  const tableId = decodeURIComponent(
    path.split("/table/")[1]!.replace(/\/request-pos$/, ""),
  );
  if (!SEED_TABLES.includes(tableId)) {
    return json(404, { error: "Table not found" });
  }

  const b = (body as { session_id?: string; device_token?: string }) ?? {};
  const sessionId = b.session_id;
  const deviceToken = b.device_token;

  // Scope CREATED orders to this device/session — same scoping as GET /table/:id.
  const createdOrders = [..._orders.values()].filter((o) => {
    if (o.table_id !== tableId || o.status !== "CREATED") return false;
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

route("POST", /^\/order$/, ({ body }) => {
  const b = body as CreateOrderRequest;
  if (!b.table || !b.restaurant_id || !b.items?.length) {
    return json(400, { error: "Missing required fields" });
  }

  const total = b.items.reduce((s, i) => s + i.price * i.qty, 0);
  _orderCounter++;
  const id = `ord-${_orderCounter.toString().padStart(3, "0")}`;
  const reference = ref(b.table);

  const order: Order & { order_items: Array<{ id: string; name: string; quantity: number; price: number }> } = {
    id,
    table_id: b.table,
    restaurant_id: b.restaurant_id,
    status: "CREATED",
    total,
    reference,
    session_id: b.session_id ?? null,
    customer_name: b.customer_name ?? null,
    device_token: b.device_token ?? null,
    created_at: now(),
    order_items: b.items.map((item) => ({
      id: uid(),
      name: item.name,
      quantity: item.qty,
      price: item.price,
    })),
  };

  _orders.set(id, order);

  return json(200, {
    success: true as const,
    order_id: id,
    reference,
    total,
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
    ["CREATED", "PREPARING", "READY", "PAYMENT_PENDING"].includes(o.status),
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

route("POST", /^\/payment\/confirm$/, ({ body }) => {
  const b = body as ClaimPaymentRequest;
  const ids = b.combined_order_ids?.length ? b.combined_order_ids : b.order_id ? [b.order_id] : [];

  if (!ids.length) return json(400, { error: "Missing order_id or combined_order_ids" });

  for (const oid of ids) {
    const order = _orders.get(oid);
    if (!order) continue;

    order.status = "PAYMENT_PENDING";

    _payments.set(oid, {
      id: uid(),
      order_id: oid,
      amount: order.total,
      status: "CLAIMED",
      proof_url: b.proof_url ?? null,
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

route("POST", /^\/admin\/login$/, ({ body }) => {
  const b = body as AdminLoginRequest;
  const staff = [..._staff.values()].find((s) => s.email === b.email);
  if (!staff || (b.password && b.password !== "password")) {
    return json(401, { error: "Invalid credentials" });
  }
  return json(200, {
    token: staff.id, // For mock, token is just staff ID
    user: staff,
    restaurant: _restaurant,
  } satisfies AdminLoginResponse);
});

route("GET", /^\/admin\/me$/, ({ admin }) => {
  if (!admin) return json(401, { error: "Unauthorized" });
  // In mock request dispatcher, we don't have access to the actual headers.
  // We'll rely on the client passing the token. Actually, we don't pass the token to `mockRequest` directly.
  // Let's assume the client will fetch the token from localStorage here.
  const token = typeof window !== "undefined" ? window.sessionStorage.getItem("oshap-admin-pin") : null;
  const user = _staff.get(token || "") || [..._staff.values()].find((s) => s.role === "OWNER")!;
  
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
  if (b.operating_hours !== undefined) _restaurant.operating_hours = b.operating_hours;
  if (b.bank_name !== undefined) _restaurant.bank_name = b.bank_name;
  if (b.account_number !== undefined) _restaurant.account_number = b.account_number;
  if (b.account_name !== undefined) _restaurant.account_name = b.account_name;
  if (b.whatsapp_number !== undefined) _restaurant.whatsapp_number = b.whatsapp_number;
  
  syncToStorage();
  return json(200, _restaurant);
});

route("POST", /^\/admin\/settings\/upload$/, () => {
  return json(200, {
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
  } satisfies UploadResponse);
});

route("GET", /^\/admin\/tables$/, () => {
  const allOrders = [..._orders.values()].filter((o) =>
    ["CREATED", "PAYMENT_PENDING"].includes(o.status),
  );

  const tables = SEED_TABLES.map((tableId) => {
    const tOrders = allOrders.filter((o) => o.table_id === tableId);
    const unpaid = tOrders.filter((o) => o.status === "CREATED");
    const pending = tOrders.filter((o) => o.status === "PAYMENT_PENDING");

    return {
      id: tableId,
      status: "OPEN" as const,
      unpaidTotal: unpaid.reduce((s, o) => s + o.total, 0),
      pendingTotal: pending.reduce((s, o) => s + o.total, 0),
      hasPending: pending.length > 0,
      hasUnpaid: unpaid.length > 0,
    };
  });

  return json(200, { tables } satisfies AdminTablesResponse);
});

route("GET", /^\/admin\/kitchen$/, () => {
  const orders = [..._orders.values()]
    .filter((o) => ["CREATED", "PREPARING", "READY"].includes(o.status))
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

route("GET", /^\/admin\/menu$/, () => {
  return json(200, [..._menu].sort((a, b) => a.sort_order - b.sort_order));
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
  };
  _menu.push(item);
  return json(201, item);
});

route("PUT", /^\/admin\/menu\/(.+)$/, ({ path, body }) => {
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

route("PATCH", /^\/admin\/menu\/(.+)$/, ({ path, body }) => {
  const id = path.split("/admin/menu/")[1]!;
  const b = body as { available: boolean };
  const item = _menu.find((i) => i.id === id);
  if (!item) return json(404, { error: "Not found" });
  item.available = b.available;
  return json(200, item);
});

route("DELETE", /^\/admin\/menu\/(.+)$/, ({ path }) => {
  const id = path.split("/admin/menu/")[1]!;
  _menu = _menu.filter((i) => i.id !== id);
  return json(200, { success: true as const });
});

route("POST", /^\/admin\/menu\/upload$/, () => {
  return json(200, {
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
  } satisfies UploadResponse);
});

route("POST", /^\/admin\/verify$/, ({ body }) => {
  const b = body as AdminVerifyRequest;
  const pendingOrders = [..._orders.values()].filter(
    (o) => o.table_id === b.table_id && o.status === "PAYMENT_PENDING",
  );

  if (pendingOrders.length === 0) {
    return json(404, { error: "No pending payments" });
  }

  for (const o of pendingOrders) {
    o.status = "CONFIRMED";
    const p = _payments.get(o.id);
    if (p) p.status = "VERIFIED";
  }

  // Auto-close if no unpaid remain
  const hasUnpaid = [..._orders.values()].some(
    (o) => o.table_id === b.table_id && o.status === "CREATED",
  );

  let autoClosed = false;
  if (!hasUnpaid) {
    for (const [sid, s] of _sessions) {
      if (s.table_id === b.table_id) _sessions.delete(sid);
    }
    autoClosed = true;
  }

  return json(200, {
    success: true as const,
    verified_count: pendingOrders.length,
    auto_closed: autoClosed,
  } satisfies AdminVerifyResponse);
});

// -------------------- Admin: Staff --------------------

route("GET", /^\/admin\/staff$/, () => {
  return json(200, [..._staff.values()]);
});

route("POST", /^\/admin\/staff$/, ({ body }) => {
  const b = body as CreateStaffRequest;
  if (!b.name || !b.email || !b.role) {
    return json(400, { error: "Missing required fields" });
  }
  if ([..._staff.values()].some((s) => s.email === b.email)) {
    return json(400, { error: "Email already exists" });
  }

  const staff: StaffMember = {
    id: uid(),
    name: b.name,
    email: b.email,
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
      if (method !== "GET") syncToStorage();
      return result;
    }
  }

  return json(404, { error: `Mock: no handler for ${method} ${path}` });
}
