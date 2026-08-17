import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ModifierGroup } from "@oshap/shared";

/** A chosen option, carried on the cart line until the order is placed. */
export interface CartModifier {
  option_id: string;
  group_name: string;
  option_name: string;
  price_delta: number;
}

export interface CartItem {
  /**
   * Identity of a cart *line*, not of a dish. Two jollof rices — one with
   * turkey, one with beef — are two lines, so the key has to fold in the
   * chosen options and the note as well as the menu item.
   */
  lineId: string;
  menuItemId: string;
  name: string;
  /**
   * The dish's list price in kobo, WITHOUT modifier deltas — the figure the
   * server expects on `POST /orders`, which adds the deltas itself.
   * Use `unitPrice()` for anything shown to the guest.
   */
  basePrice: number;
  modifiers: CartModifier[];
  notes?: string;
  quantity: number;
  image?: string;
}

export type NewCartItem = Omit<CartItem, "lineId" | "quantity">;

/** What a line actually costs per unit: base plus every chosen option. */
export function unitPrice(item: Pick<CartItem, "basePrice" | "modifiers">): number {
  return item.basePrice + item.modifiers.reduce((s, m) => s + m.price_delta, 0);
}

/**
 * Option ids are sorted so that picking "hot" then "extra plantain" lands on
 * the same line as picking them the other way round — otherwise the guest gets
 * two identical-looking rows and wonders why.
 */
function lineIdFor(item: NewCartItem): string {
  const options = item.modifiers.map((m) => m.option_id).sort().join(",");
  return `${item.menuItemId}::${options}::${item.notes?.trim() ?? ""}`;
}

/** True when a dish forces a trip through the option sheet before it can be added. */
export function hasChoices(groups?: ModifierGroup[] | null): boolean {
  return Boolean(groups?.length);
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: NewCartItem, quantity?: number) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  /** Combined quantity of every line for one dish, for the menu card badge. */
  quantityOf: (menuItemId: string) => number;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({
  children,
  tableId,
}: {
  children: ReactNode;
  tableId: string;
}) {
  // v2: lines gained modifiers and a composite id, so a cart saved by the
  // previous shape can't be read. A new key discards it instead of throwing.
  const storageKey = `oshap-cart-v2-${tableId}`;

  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // sessionStorage unavailable
    }
  }, [items, storageKey]);

  const addItem = useCallback((item: NewCartItem, quantity = 1) => {
    const lineId = lineIdFor(item);
    setItems((prev) => {
      const existing = prev.find((i) => i.lineId === lineId);
      if (existing) {
        return prev.map((i) =>
          i.lineId === lineId ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...prev, { ...item, lineId, quantity }];
    });
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.lineId !== lineId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.lineId === lineId ? { ...i, quantity } : i)),
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const quantityOf = useCallback(
    (menuItemId: string) =>
      items
        .filter((i) => i.menuItemId === menuItemId)
        .reduce((s, i) => s + i.quantity, 0),
    [items],
  );

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + unitPrice(i) * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        quantityOf,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
