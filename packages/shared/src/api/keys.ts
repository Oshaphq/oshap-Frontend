/**
 * Centralized TanStack Query keys. Using factories keeps invalidation precise:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.menu.all })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) })
 */

export const queryKeys = {
  menu: {
    all: ["menu"] as const,
    list: (restaurantId?: string) => ["menu", "list", restaurantId] as const,
  },
  tables: {
    all: ["tables"] as const,
    detail: (tableId: string, deviceToken?: string, sessionId?: string) =>
      ["tables", "detail", tableId, deviceToken, sessionId] as const,
  },
  orders: {
    all: ["orders"] as const,
    detail: (orderId: string) => ["orders", "detail", orderId] as const,
    sessionList: (sessionId?: string, tableId?: string, deviceToken?: string) =>
      [
        "orders",
        "session-list",
        sessionId,
        tableId,
        deviceToken,
      ] as const,
  },
  admin: {
    all: ["admin"] as const,
    menu: () => ["admin", "menu"] as const,
    kitchen: () => ["admin", "kitchen"] as const,
    history: (page: number, perPage: number, table?: string, date?: string) =>
      ["admin", "history", page, perPage, table, date] as const,
    tables: () => ["admin", "tables"] as const,
    settings: () => ["admin", "settings"] as const,
    bankAccounts: () => ["admin", "settings", "bank-accounts"] as const,
    staff: () => ["admin", "staff"] as const,
    analytics: (startDate: string, endDate: string) =>
      ["admin", "analytics", startDate, endDate] as const,
    inventoryAlerts: () => ["admin", "inventory", "alerts"] as const,
    zReport: (date: string) => ["admin", "z-report", date] as const,
    receipt: (orderId: string) => ["admin", "receipt", orderId] as const,
    auditLogs: (page: number, perPage: number, action?: string) =>
      ["admin", "audit-logs", page, perPage, action] as const,
    branches: () => ["admin", "branches"] as const,
    group: () => ["admin", "group"] as const,
    groupAnalytics: () => ["admin", "group", "analytics"] as const,
    modifierGroups: () => ["admin", "modifier-groups"] as const,
    ingredients: () => ["admin", "ingredients"] as const,
    stockMovements: (page: number, perPage: number, reason?: string) =>
      ["admin", "stock-movements", page, perPage, reason] as const,
    recipe: (menuItemId: string) => ["admin", "recipe", menuItemId] as const,
    notifications: (query?: Record<string, unknown>) =>
      ["admin", "notifications", query ?? {}] as const,
    /** The badge. Kept separate so paging the list never disturbs it. */
    notificationBadge: () => ["admin", "notifications", "badge"] as const,
  },
  platform: {
    all: ["platform"] as const,
    restaurants: () => ["platform", "restaurants"] as const,
    restaurant: (id: string) => ["platform", "restaurants", id] as const,
    health: () => ["platform", "health"] as const,
  },
} as const;
