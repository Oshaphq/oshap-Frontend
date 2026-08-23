import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "@oshap/shared/ui";
import MenuPage from "./routes/menu";
import CheckoutPage from "./routes/checkout";
import PayPage from "./routes/pay";
import OrdersPage from "./routes/orders";

import { useSearchParams } from "react-router";
import { NotificationProvider } from "./context/NotificationContext";
import CallWaiterFab from "./components/CallWaiterFab";
import { getDeviceToken, useGlobalSSE, useTable } from "@oshap/shared";
import { useSession } from "./context/SessionContext";
import { BrandTheme } from "./context/BrandTheme";
import { OrderWatch } from "./context/OrderWatch";

function GlobalSSE() {
  useGlobalSSE();
  return null;
}

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
      <GlobalSSE />
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
