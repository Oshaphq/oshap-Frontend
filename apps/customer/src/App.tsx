import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "@oshap/shared/ui";
import MenuPage from "./routes/menu";
import CheckoutPage from "./routes/checkout";
import PayPage from "./routes/pay";
import OrdersPage from "./routes/orders";

import { useSearchParams } from "react-router";
import { NotificationProvider } from "./context/NotificationContext";
import CallWaiterFab from "./components/CallWaiterFab";
import { getDeviceToken, useTable } from "@oshap/shared";
import { useSession } from "./context/SessionContext";
import { BrandTheme } from "./context/BrandTheme";
import { OrderWatch } from "./context/OrderWatch";

/**
 * There is no realtime stream for a guest, so this app no longer opens one.
 *
 * `GET /events` authenticates with a staff bearer token and answers a guest
 * `401` — measured at 2.6s per attempt. `useGlobalSSE` was mounted here
 * unconditionally, so every guest phone opened a connection that could never
 * succeed and retried it eight times on a backoff. Nothing in this app ever
 * subscribed to the stream either, so even a working connection would have
 * delivered to no one.
 *
 * The guest's live updates come from polling instead: `useTable`,
 * `useSessionOrders` and `useOrder` all refresh while an order is in progress,
 * which is what makes `OrderWatch` below work.
 *
 * Put it back when the backend offers a guest-scoped stream — a device token
 * on the query string would do it — and give it a listener at the same time.
 */

function AppContent() {
  const [params] = useSearchParams();
  const tableId = params.get("table") ?? "T1";
  const { session } = useSession();

  // Same arguments the pages pass, so this shares their cached result rather
  // than issuing a second request for the same table.
  const tableQuery = useTable({
    tableId,
    deviceToken: getDeviceToken(),
    sessionId: session?.id,
  });
  // `undefined` while loading is meaningful to BrandTheme — it holds the last
  // known brand instead of flashing to default and back.
  const primaryColor = tableQuery.data
    ? (tableQuery.data.restaurant?.primary_color ?? null)
    : undefined;

  return (
    <NotificationProvider tableId={tableId}>
      <BrandTheme tableId={tableId} primaryColor={primaryColor}>
      <OrderWatch tableId={tableId} />
      <Routes>
        <Route path="/" element={<Navigate to={`/menu?table=${tableId}`} replace />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/pay" element={<PayPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="*" element={<Navigate to={`/menu?table=${tableId}`} replace />} />
      </Routes>
      {/* App-wide rather than per route: the same action on every screen, and
          pay.tsx alone has four return branches that would each need it. */}
      <CallWaiterFab tableId={tableId} />
      <Toaster />
      </BrandTheme>
    </NotificationProvider>
  );
}

export default function App() {
  return <AppContent />;
}
