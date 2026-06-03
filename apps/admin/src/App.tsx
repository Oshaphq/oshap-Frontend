import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "@oshap/shared/ui";
import AuthGate from "./components/AuthGate";
import RoleGate from "./components/RoleGate";
import DashboardPage from "./routes/dashboard";
import KitchenPage from "./routes/kitchen";
import HistoryPage from "./routes/history";
import MenuPage from "./routes/menu";
import SettingsPage from "./routes/settings";
import AnalyticsPage from "./routes/analytics";
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
          <Route element={<RoleGate allowedRoles={["OWNER", "MANAGER"]} />}>
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/settings/*" element={<SettingsPage />} />
          </Route>

          {/* Owner only routes */}
          <Route element={<RoleGate allowedRoles={["OWNER"]} />}>
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
}
