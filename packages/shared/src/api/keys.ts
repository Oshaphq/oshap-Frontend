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
  },
} as const;
