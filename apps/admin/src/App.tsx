import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "@oshap/shared/ui";
import AuthGate from "./components/AuthGate";
import RoleGate from "./components/RoleGate";
import DashboardPage from "./routes/dashboard";
import SetupPage from "./routes/setup";
import KitchenPage from "./routes/kitchen";
import HistoryPage from "./routes/history";
import MenuPage from "./routes/menu";
import InventoryPage from "./routes/inventory";
import SettingsPage from "./routes/settings";
import AnalyticsPage from "./routes/analytics";
import ZReportPage from "./routes/z-report";
import OrderDetailPage from "./routes/order-detail";
import AuditPage from "./routes/audit";
import GroupAnalyticsPage from "./routes/group-analytics";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useGlobalSSE } from "@oshap/shared";

function GlobalSSE() {
  useGlobalSSE();
  return null;
}

function IndexRoute() {
  const { user } = useAuth();
  if (!user) return null;
  if (["KITCHEN", "BARTENDER"].includes(user.role)) {
    return <Navigate to="/kitchen" replace />;
  }
  return <DashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalSSE />
      <Routes>
        {/* Outside AuthGate: an owner claiming their account has no session
            yet, which is the whole point of the screen. */}
        <Route path="/setup" element={<SetupPage />} />
        <Route element={<AuthGate />}>
          {/* Default routes based on role */}
          <Route element={<RoleGate allowedRoles={["OWNER", "MANAGER", "WAITER", "CASHIER", "KITCHEN", "BARTENDER"]} />}>
            <Route index element={<IndexRoute />} />
          </Route>

          {/* Kitchen / Bar orders */}
          <Route element={<RoleGate allowedRoles={["OWNER", "MANAGER", "KITCHEN", "BARTENDER"]} />}>
            <Route path="/kitchen" element={<KitchenPage />} />
          </Route>

          {/* Manager / Owner routes */}
          {/* Cashiers close the till, so this isn't owner-only. */}
          <Route element={<RoleGate allowedRoles={["OWNER", "MANAGER", "CASHIER"]} />}>
            <Route path="/z-report" element={<ZReportPage />} />
            {/* Correcting a bill is cashier work, not owner-only. */}
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Route>

          <Route element={<RoleGate allowedRoles={["OWNER", "MANAGER"]} />}>
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/settings/*" element={<SettingsPage />} />
          </Route>

          {/* Owner only routes */}
          <Route element={<RoleGate allowedRoles={["OWNER"]} />}>
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/analytics/group" element={<GroupAnalyticsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
}
