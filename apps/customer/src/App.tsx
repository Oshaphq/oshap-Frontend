import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "@oshap/shared/ui";
import MenuPage from "./routes/menu";
import CheckoutPage from "./routes/checkout";
import PayPage from "./routes/pay";
import OrdersPage from "./routes/orders";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/menu?table=T1" replace />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/pay" element={<PayPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="*" element={<Navigate to="/menu?table=T1" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
