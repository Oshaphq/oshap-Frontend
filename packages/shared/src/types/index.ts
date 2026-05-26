/**
 * Oshap domain types — mirrors the FastAPI / Pydantic schemas defined in
 * docs/openapi.yaml. Keep this file in sync with that spec.
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
  | "CANCELLED";

export type PaymentStatus = "NOT_PAID" | "CLAIMED" | "CONFIRMED" | "VERIFIED";

export type TableStatus = "OPEN" | "CLOSED";

export type SessionStatus = "ACTIVE" | "CLOSED";

export type CloseReason = "paid" | "abandoned";

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Restaurant {
  id: string;
  name: string;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  whatsapp_number?: string | null;
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
}

export interface OrderItem {
  id: string;
  order_id?: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  table_id: string;
  restaurant_id: string;
  status: OrderStatus;
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
  unpaid_order: ActiveOrderBundle | null;
  pending_payments: ActiveOrderBundle | null;
}

/** GET /orders/:id response (order + payment together). */
export interface OrderDetail {
  id: string;
  table: string;
  items: OrderItem[];
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

export interface CreateOrderRequest {
  table: string;
  restaurant_id: string;
  items: Array<{ name: string; qty: number; price: number }>;
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

// ---------------------------------------------------------------------------
// Admin payloads
// ---------------------------------------------------------------------------

export interface AdminMeResponse {
  restaurant: Restaurant;
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

export interface AdminVerifyRequest {
  table_id: string;
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

export interface UploadResponse {
  url: string;
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
