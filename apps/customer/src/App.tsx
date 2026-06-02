import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "@oshap/shared/ui";
import MenuPage from "./routes/menu";
import CheckoutPage from "./routes/checkout";
import PayPage from "./routes/pay";
import OrdersPage from "./routes/orders";

import { useSearchParams } from "react-router";
import { NotificationProvider } from "./context/NotificationContext";

function AppContent() {
  const [params] = useSearchParams();
  const tableId = params.get("table") ?? "T1";

  return (
    <NotificationProvider tableId={tableId}>
      <Routes>
        <Route path="/" element={<Navigate to={`/menu?table=${tableId}`} replace />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/pay" element={<PayPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="*" element={<Navigate to={`/menu?table=${tableId}`} replace />} />
      </Routes>
      <Toaster />
    </NotificationProvider>
  );
}

export default function App() {
  return <AppContent />;
}
