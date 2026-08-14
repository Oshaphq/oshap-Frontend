/**
 * Fetch wrapper for the Oshap FastAPI backend.
 *
 * Responsibilities:
 *   - Reads base URL from VITE_API_BASE_URL.
 *   - Serializes JSON requests and parses JSON responses.
 *   - Throws `ApiError` on non-2xx responses with the server's error message.
 *   - Attaches the admin PIN header for admin-scoped calls.
 *   - Falls back to mock API when VITE_MOCK_API=true or VITE_API_BASE_URL is not set.
 *
 * The backend dev (FastAPI) sees these requests as standard JSON, plus
 * `x-admin-pin` on admin endpoints.
 */

import type { Restaurant } from "../types/index";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export const ADMIN_UNAUTHORIZED_EVENT = "oshap:admin-unauthorized";

// ---------------------------------------------------------------------------
// Admin PIN + restaurant context — module-scoped + sessionStorage backed
// ---------------------------------------------------------------------------

const PIN_STORAGE_KEY = "oshap-admin-pin";
const RESTAURANT_STORAGE_KEY = "oshap-admin-restaurant";
const PLATFORM_TOKEN_STORAGE_KEY = "oshap-platform-token";

let adminPin: string | null = null;
let adminRestaurant: Restaurant | null = null;
let platformToken: string | null = null;

function readPinFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(PIN_STORAGE_KEY);
}

function readRestaurantFromStorage(): Restaurant | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(RESTAURANT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Restaurant;
  } catch {
    return null;
  }
}

export function setAdminPin(pin: string | null): void {
  adminPin = pin;
  if (typeof window === "undefined") return;
  if (pin) {
    window.sessionStorage.setItem(PIN_STORAGE_KEY, pin);
  } else {
    window.sessionStorage.removeItem(PIN_STORAGE_KEY);
    setAdminRestaurant(null);
  }
}

export function getAdminPin(): string | null {
  if (adminPin) return adminPin;
  adminPin = readPinFromStorage();
  return adminPin;
}

export function setAdminRestaurant(restaurant: Restaurant | null): void {
  adminRestaurant = restaurant;
  if (typeof window === "undefined") return;
  if (restaurant) {
    window.sessionStorage.setItem(
      RESTAURANT_STORAGE_KEY,
      JSON.stringify(restaurant),
    );
  } else {
    window.sessionStorage.removeItem(RESTAURANT_STORAGE_KEY);
  }
}

export function getAdminRestaurant(): Restaurant | null {
  if (adminRestaurant) return adminRestaurant;
  adminRestaurant = readRestaurantFromStorage();
  return adminRestaurant;
}

export function getAdminRestaurantId(): string | null {
  return getAdminRestaurant()?.id ?? null;
}

export function getAdminRestaurantName(): string | null {
  return getAdminRestaurant()?.name ?? null;
}

// ---------------------------------------------------------------------------
// Platform operator token — module-scoped + sessionStorage backed
// ---------------------------------------------------------------------------

function readPlatformTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(PLATFORM_TOKEN_STORAGE_KEY);
}

export function setPlatformToken(token: string | null): void {
  platformToken = token;
  if (typeof window === "undefined") return;
  if (token) {
    window.sessionStorage.setItem(PLATFORM_TOKEN_STORAGE_KEY, token);
  } else {
    window.sessionStorage.removeItem(PLATFORM_TOKEN_STORAGE_KEY);
  }
}

export function getPlatformToken(): string | null {
  if (platformToken) return platformToken;
  platformToken = readPlatformTokenFromStorage();
  return platformToken;
}

// ---------------------------------------------------------------------------
// Active branch (multi-branch owners) — localStorage backed.
// When set, it is appended as `branch_id` to admin GET requests so the
// dashboard, kitchen, history, menu and analytics scope to that branch.
// Empty/null means "all branches" (the owner's default scope).
// ---------------------------------------------------------------------------

const ACTIVE_BRANCH_STORAGE_KEY = "oshap-active-branch";
let activeBranchId: string | null = null;

function readActiveBranchFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
}

export function setActiveBranchId(branchId: string | null): void {
  activeBranchId = branchId || null;
  if (typeof window === "undefined") return;
  if (activeBranchId) {
    window.localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, activeBranchId);
  } else {
    window.localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
  }
}

export function getActiveBranchId(): string | null {
  if (activeBranchId) return activeBranchId;
  activeBranchId = readActiveBranchFromStorage();
  return activeBranchId;
}

// ---------------------------------------------------------------------------
// Mock mode detection
// ---------------------------------------------------------------------------

function isMockMode(): boolean {
  if (typeof window === "undefined") return false;
  const mockFlag = import.meta.env.VITE_MOCK_API;
  const hasBaseUrl = !!import.meta.env.VITE_API_BASE_URL;
  return mockFlag === "true" || mockFlag === true || !hasBaseUrl;
}

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

export function getBaseUrl(): string {
  if (isMockMode()) return "mock://api";
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Add it to your .env file (see .env.example).",
    );
  }
  return url.replace(/\/$/, "");
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Adds the `x-admin-pin` header. Throws if no PIN is set. */
  admin?: boolean;
  /** Adds the `x-platform-token` header. Throws if no token is set. */
  platform?: boolean;
  /** Pass FormData directly; skips JSON serialization. */
  formData?: FormData;
  signal?: AbortSignal;
}

function buildSearchParams(
  query: RequestOptions["query"],
): URLSearchParams {
  const sp = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      sp.set(key, String(value));
    }
  }
  return sp;
}

function buildUrl(path: string, query: RequestOptions["query"]): string {
  const url = new URL(getBaseUrl() + path);
  const sp = buildSearchParams(query);
  sp.forEach((v, k) => url.searchParams.set(k, v));
  return url.toString();
}

// ---------------------------------------------------------------------------
// Response envelope
//
// The FastAPI backend wraps every response as:
//   { success: boolean, message: string, code: number, data: <payload> }
// The in-memory mock returns bare payloads. Unwrap tolerantly so both work —
// callers stay typed against the inner payload either way.
// ---------------------------------------------------------------------------

function unwrapEnvelope(payload: unknown): unknown {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    "code" in payload &&
    "data" in payload
  ) {
    return (payload as { data: unknown }).data;
  }
  return payload;
}

/**
 * Server error messages arrive under different keys depending on the source:
 * `message` from the backend envelope, `error` from the mock, `detail` from
 * FastAPI's own validation errors.
 */
function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  for (const key of ["message", "error", "detail"] as const) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";

  // Scope admin reads to the active branch (if any) via a `branch_id` param.
  const query: NonNullable<RequestOptions["query"]> = { ...options.query };
  if (options.admin && method === "GET") {
    const branchId = getActiveBranchId();
    if (branchId) query.branch_id = branchId;
  }

  if (isMockMode()) {
    return mockRequest(
      path,
      method,
      options.body ?? null,
      buildSearchParams(query),
      options.admin ?? false,
    ) as Promise<T>;
  }

  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  if (options.admin) {
    const pin = getAdminPin();
    if (!pin) {
      throw new ApiError(401, "Admin PIN not set", null);
    }
    headers["x-admin-pin"] = pin;
  }

  if (options.platform) {
    const token = getPlatformToken();
    if (!token) {
      throw new ApiError(401, "Platform token not set", null);
    }
    headers["x-platform-token"] = token;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body,
    signal: options.signal,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload: unknown = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && options.admin) {
      handleAdminUnauthorized();
    }
    const message =
      (isJson ? extractErrorMessage(payload) : null) ||
      response.statusText ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return unwrapEnvelope(payload) as T;
}

function handleAdminUnauthorized(): void {
  setAdminPin(null);
  setAdminRestaurant(null);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED_EVENT));
  }
}

// ---------------------------------------------------------------------------
// Mock import — dynamic to keep the real path tree-shakeable
// ---------------------------------------------------------------------------

async function mockRequest(
  path: string,
  method: string,
  body: unknown,
  query: URLSearchParams,
  admin: boolean,
): Promise<unknown> {
  const { mockRequest: handler } = await import("./mock");
  const match = await handler(path, method, body, query, admin);
  if (match.status >= 400) {
    if (match.status === 401 && admin) {
      handleAdminUnauthorized();
    }
    throw new ApiError(
      match.status,
      typeof match.body === "object" && match.body !== null && "error" in match.body
        ? String((match.body as { error: string }).error)
        : `Mock error ${match.status}`,
      match.body,
    );
  }
  return match.body;
}
