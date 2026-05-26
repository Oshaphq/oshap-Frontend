import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router";
import {
  sessionsApi,
  type TableSession,
} from "@oshap/shared";

interface SessionContextValue {
  session: TableSession | null;
  customerName: string;
  setCustomerName: (name: string) => void;
  startSession: (tableId: string) => Promise<TableSession>;
  joinSession: (pin: string, tableId: string) => Promise<TableSession>;
  clearSession: () => void;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

// All persistence keys are table-scoped so each QR/table keeps an
// independent session, name, and unclaimed-orders list. Navigating
// between tables in the same tab (dev/preview flow) never bleeds state.
const sessionKey = (tableId: string) => `oshap-session-${tableId}`;
const nameKey = (tableId: string) => `oshap-customer-name-${tableId}`;
const orderIdsKey = (tableId: string) => `oshap-my-order-ids-${tableId}`;

function readUnclaimedOrderIds(tableId: string): string[] {
  try {
    return JSON.parse(
      window.sessionStorage.getItem(orderIdsKey(tableId)) ?? "[]",
    ) as string[];
  } catch {
    return [];
  }
}

function clearUnclaimedOrderIds(tableId: string): void {
  window.sessionStorage.removeItem(orderIdsKey(tableId));
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TableSession | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchParams] = useSearchParams();
  const currentTable = searchParams.get("table") ?? "T1";

  // On table change, swap in that table's saved session + name.
  // Each table has its own slot — navigating away never wipes another
  // table's state.
  useEffect(() => {
    let restoredSession: TableSession | null = null;
    const savedSession = window.sessionStorage.getItem(sessionKey(currentTable));
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession) as TableSession;
        if (parsed.table_id === currentTable) {
          restoredSession = parsed;
        } else {
          // Mis-tagged storage (e.g. data from an older unscoped key). Drop it.
          window.sessionStorage.removeItem(sessionKey(currentTable));
        }
      } catch {
        window.sessionStorage.removeItem(sessionKey(currentTable));
      }
    }
    setSession(restoredSession);
    setCustomerName(
      window.sessionStorage.getItem(nameKey(currentTable)) ?? "",
    );
    setIsHydrated(true);
  }, [currentTable]);

  useEffect(() => {
    if (!isHydrated) return;
    if (session && session.table_id === currentTable) {
      window.sessionStorage.setItem(
        sessionKey(currentTable),
        JSON.stringify(session),
      );
    } else {
      window.sessionStorage.removeItem(sessionKey(currentTable));
    }
  }, [session, currentTable, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (customerName) {
      window.sessionStorage.setItem(nameKey(currentTable), customerName);
    } else {
      window.sessionStorage.removeItem(nameKey(currentTable));
    }
  }, [customerName, currentTable, isHydrated]);

  const startSession = async (tableId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { session: created } = await sessionsApi.startSession({
        tableId,
        customer_name: customerName,
        unclaimed_order_ids: readUnclaimedOrderIds(tableId),
      });
      setSession(created);
      clearUnclaimedOrderIds(tableId);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start session";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const joinSession = async (pin: string, tableId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { session: joined } = await sessionsApi.joinSession({
        tableId,
        pin,
        customer_name: customerName,
        unclaimed_order_ids: readUnclaimedOrderIds(tableId),
      });
      setSession(joined);
      clearUnclaimedOrderIds(tableId);
      return joined;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join session";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = () => {
    setSession(null);
    setCustomerName("");
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        customerName,
        setCustomerName,
        startSession,
        joinSession,
        clearSession,
        isLoading,
        error,
        isHydrated,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
