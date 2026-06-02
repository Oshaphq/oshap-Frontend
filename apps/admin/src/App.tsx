import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "@oshap/shared/ui";
import PinGate from "./components/PinGate";
import DashboardPage from "./routes/dashboard";
import KitchenPage from "./routes/kitchen";
import HistoryPage from "./routes/history";
import MenuPage from "./routes/menu";
import SettingsPage from "./routes/settings";

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<PinGate />}>
          <Route index element={<DashboardPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
