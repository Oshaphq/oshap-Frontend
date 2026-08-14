import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "@oshap/shared/ui";
import MenuPage from "./routes/menu";
import CheckoutPage from "./routes/checkout";
import PayPage from "./routes/pay";
import OrdersPage from "./routes/orders";

import { useSearchParams } from "react-router";
import { NotificationProvider } from "./context/NotificationContext";
import CallWaiterFab from "./components/CallWaiterFab";
import { useGlobalSSE } from "@oshap/shared";

function GlobalSSE() {
  useGlobalSSE();
  return null;
}

function AppContent() {
  const [params] = useSearchParams();
  const tableId = params.get("table") ?? "T1";

  return (
    <NotificationProvider tableId={tableId}>
      <GlobalSSE />
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
    </NotificationProvider>
  );
}

export default function App() {
  return <AppContent />;
}
