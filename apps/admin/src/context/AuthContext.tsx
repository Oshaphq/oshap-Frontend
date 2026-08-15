import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  StaffMember,
  AdminLoginResponse,
  adminApi,
  ADMIN_UNAUTHORIZED_EVENT,
  getAccessToken,
  setAuthTokens,
  clearAuthTokens,
  setAdminRestaurant,
  getActiveBranchId,
  setActiveBranchId,
  queryKeys,
} from "@oshap/shared";

interface AuthContextValue {
  user: StaffMember | null;
  isAuthenticated: boolean;
  /** Takes the whole login response — it carries both tokens plus the user. */
  login: (res: AdminLoginResponse) => void;
  logout: () => void;
  isLoading: boolean;
  /** Active branch id for multi-branch owners; "" means all branches. */
  activeBranchId: string;
  /** Switch the active branch and refetch all branch-scoped admin data. */
  setActiveBranch: (branchId: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBranchId, setActiveBranchState] = useState<string>(
    () => getActiveBranchId() ?? "",
  );

  useEffect(() => {
    const init = async () => {
      // A stored access token may be expired; adminGetMe's 401 triggers a
      // refresh, so a returning user is only signed out if that also fails.
      if (getAccessToken()) {
        try {
          const res = await adminApi.adminGetMe();
          setUser(res.user);
          setAdminRestaurant(res.restaurant);
        } catch {
          clearAuthTokens();
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = (res: AdminLoginResponse) => {
    setAuthTokens(res);
    setAdminRestaurant(res.restaurant);
    setUser(res.user);
  };

  const logout = () => {
    clearAuthTokens();
    setAdminRestaurant(null);
    setActiveBranchId(null);
    setActiveBranchState("");
    setUser(null);
  };

  const setActiveBranch = (branchId: string) => {
    setActiveBranchId(branchId || null);
    setActiveBranchState(branchId);
    // Branch-scoped data is keyed without the branch id, so force a refetch.
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout, isLoading, activeBranchId, setActiveBranch }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
