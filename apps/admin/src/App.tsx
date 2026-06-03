import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "@oshap/shared/ui";
import AuthGate from "./components/AuthGate";
import RoleGate from "./components/RoleGate";
import DashboardPage from "./routes/dashboard";
import KitchenPage from "./routes/kitchen";
import HistoryPage from "./routes/history";
import MenuPage from "./routes/menu";
import SettingsPage from "./routes/settings";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AuthGate />}>
          {/* Default routes for waiters, cashiers, owners, managers */}
          <Route element={<RoleGate allowedRoles={["OWNER", "MANAGER", "WAITER", "CASHIER"]} />}>
            <Route index element={<DashboardPage />} />
          </Route>

          {/* Kitchen / Bar orders */}
          <Route element={<RoleGate allowedRoles={["OWNER", "MANAGER", "KITCHEN", "BARTENDER"]} />}>
            <Route path="/kitchen" element={<KitchenPage />} />
          </Route>

          {/* Manager / Owner routes */}
          <Route element={<RoleGate allowedRoles={["OWNER", "MANAGER"]} />}>
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/settings/*" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
}
